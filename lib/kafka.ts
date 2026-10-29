import { Kafka, Admin, Producer, Consumer, logLevel } from 'kafkajs';

export const BROKERS = [
  { id: 1, name: 'kafka-1', externalPort: 9092 },
  { id: 2, name: 'kafka-2', externalPort: 9192 },
  { id: 3, name: 'kafka-3', externalPort: 9292 },
  { id: 4, name: 'kafka-4', externalPort: 9392 },
  { id: 5, name: 'kafka-5', externalPort: 9492 },
  { id: 6, name: 'kafka-6', externalPort: 9592 },
];

export const BOOTSTRAP_SERVERS = BROKERS.map(
  (b) => `localhost:${b.externalPort}`
);

export interface PartitionMetadata {
  partition: number;
  leader: number;
  replicas: number[];
  isr: number[];
}

export interface TopicMetadata {
  name: string;
  partitions: PartitionMetadata[];
  numPartitions: number;
  replicationFactor: number;
  isInternal: boolean;
}

export interface BrokerMetadata {
  id: number;
  host: string;
  port: number;
}

export type CalcOperator = '+' | '-' | '*' | '/';

export interface CalcInput {
  numbers: number[];
  operator: CalcOperator;
}

export interface PartitionMessage {
  partition: number;
  offset: string;
  key: string;
  value: any;
  rawValue: string;
  consumedAt: string;
}

export interface CalcResult {
  id: string;
  topic: string;
  partition: number;
  offset: string;
  key: string;
  input: CalcInput;
  result: number | string;
  consumedAt: string;
}

interface KafkaState {
  kafka: Kafka;
  initialized: boolean;
  controllerHistory: number[];
  reportedController: number | null;
  candidateController: number | null;
  candidateStreak: number;
  producer: Producer | null;
  consumer: Consumer | null;
  subscribedTopics: Set<string>;
  partitionMessages: Map<string, Map<number, PartitionMessage[]>>;
  calcResults: CalcResult[];
  consumerStarting: Promise<void> | null;
  consumerMaxPerSecond: number;
  nextConsumeSlotAt: number;
}

export interface ConsumerConfig {
  maxPerSecond: number;
}

const globalForKafka = globalThis as unknown as { kafkaState?: KafkaState };

function getKafka(): Kafka {
  if (!globalForKafka.kafkaState) {
    const kafka = new Kafka({
      clientId: 'nextjs-topic-manager',
      brokers: BOOTSTRAP_SERVERS,
      logLevel: logLevel.ERROR,
      retry: { retries: 5, initialRetryTime: 300 },
    });
    globalForKafka.kafkaState = {
      kafka,
      initialized: true,
      controllerHistory: [],
      reportedController: null,
      candidateController: null,
      candidateStreak: 0,
      producer: null,
      consumer: null,
      subscribedTopics: new Set(),
      partitionMessages: new Map(),
      calcResults: [],
      consumerStarting: null,
      consumerMaxPerSecond: 0,
      nextConsumeSlotAt: 0,
    };
  } else {
    const s = globalForKafka.kafkaState as Partial<KafkaState> & { kafka: Kafka };
    if (!Array.isArray(s.controllerHistory)) s.controllerHistory = [];
    if (!('reportedController' in s)) s.reportedController = null;
    if (!('candidateController' in s)) s.candidateController = null;
    if (typeof s.candidateStreak !== 'number') s.candidateStreak = 0;
    if (!('producer' in s)) s.producer = null;
    if (!('consumer' in s)) s.consumer = null;
    if (!(s.subscribedTopics instanceof Set)) s.subscribedTopics = new Set();
    if (!(s.partitionMessages instanceof Map)) s.partitionMessages = new Map();
    if (!Array.isArray(s.calcResults)) s.calcResults = [];
    if (!('consumerStarting' in s)) s.consumerStarting = null;
    if (typeof s.consumerMaxPerSecond !== 'number') s.consumerMaxPerSecond = 0;
    if (typeof s.nextConsumeSlotAt !== 'number') s.nextConsumeSlotAt = 0;
  }
  return globalForKafka.kafkaState.kafka;
}

const CONTROLLER_WINDOW = 20;
const CONTROLLER_SWITCH_STREAK = 5;
const MAX_PARTITION_MESSAGES = 200;
const MAX_CALC_RESULTS = 100;
export const MAX_CONSUMER_RATE = 1000;

function stabilizeController(rawController: number): number {
  const state = globalForKafka.kafkaState!;

  state.controllerHistory.push(rawController);
  if (state.controllerHistory.length > CONTROLLER_WINDOW) {
    state.controllerHistory.shift();
  }

  const counts = new Map<number, number>();
  for (const id of state.controllerHistory) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let modeId = rawController;
  let modeCount = -1;
  for (const [id, c] of counts) {
    if (c > modeCount) {
      modeCount = c;
      modeId = id;
    }
  }

  if (state.reportedController === null) {
    state.reportedController = modeId;
    state.candidateController = modeId;
    state.candidateStreak = 0;
    return modeId;
  }

  if (modeId === state.reportedController) {
    state.candidateController = modeId;
    state.candidateStreak = 0;
    return state.reportedController;
  }

  if (modeId === state.candidateController) {
    state.candidateStreak += 1;
  } else {
    state.candidateController = modeId;
    state.candidateStreak = 1;
  }

  if (state.candidateStreak >= CONTROLLER_SWITCH_STREAK) {
    state.reportedController = modeId;
    state.candidateStreak = 0;
  }

  return state.reportedController;
}

async function withAdmin<T>(fn: (admin: Admin) => Promise<T>): Promise<T> {
  const admin = getKafka().admin();
  await admin.connect();
  try {
    return await fn(admin);
  } finally {
    await admin.disconnect();
  }
}

export async function listTopicsWithMetadata(
  includeInternal = false
): Promise<TopicMetadata[]> {
  return withAdmin(async (admin) => {
    const topicNames = await admin.listTopics();
    const filtered = includeInternal
      ? topicNames
      : topicNames.filter((n) => !n.startsWith('__'));

    if (filtered.length === 0) return [];

    const meta = await admin.fetchTopicMetadata({ topics: filtered });

    return meta.topics.map((t) => {
      const partitions: PartitionMetadata[] = t.partitions.map((p) => ({
        partition: p.partitionId,
        leader: p.leader,
        replicas: p.replicas,
        isr: p.isr,
      }));
      const rf = partitions[0]?.replicas.length ?? 0;
      return {
        name: t.name,
        partitions: partitions.sort((a, b) => a.partition - b.partition),
        numPartitions: partitions.length,
        replicationFactor: rf,
        isInternal: t.name.startsWith('__'),
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  });
}

const TRANSIENT_ERROR_HINTS = [
  'does not host',
  'not leader',
  'leader_not_available',
  'leadernotavailable',
  'metadata',
  'not available',
  'unknown topic',
];

function isTransientError(err: any): boolean {
  const msg = (err?.message || String(err)).toLowerCase();
  return TRANSIENT_ERROR_HINTS.some((hint) => msg.includes(hint));
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createTopic(
  name: string,
  numPartitions: number,
  replicationFactor: number
) {
  return withAdmin(async (admin) => {
    const cluster = await admin.describeCluster();
    const aliveBrokers = cluster.brokers.length;
    if (replicationFactor > aliveBrokers) {
      throw new Error(
        `Replication Factor ${replicationFactor} > 살아있는 Broker ${aliveBrokers}대. 더 낮은 RF를 사용하세요.`
      );
    }

    const topics = await admin.listTopics();
    if (topics.includes(name)) {
      throw new Error(`Topic "${name}" 이미 존재합니다`);
    }

    const MAX_ATTEMPTS = 3;
    let lastErr: any = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const ok = await admin.createTopics({
          validateOnly: false,
          waitForLeaders: true,
          timeout: 30000,
          topics: [
            {
              topic: name,
              numPartitions,
              replicationFactor,
            },
          ],
        });
        if (!ok) {
          // 이전 시도에서 이미 생성됐고 리더 대기 단계에서만 실패한 경우
          if (attempt > 1 && (await admin.listTopics()).includes(name)) {
            return { name, numPartitions, replicationFactor };
          }
          throw new Error(
            `Kafka 가 토픽 생성을 거부했습니다 (이미 존재하거나 설정 문제)`
          );
        }
        return { name, numPartitions, replicationFactor };
      } catch (err: any) {
        lastErr = err;
        if (attempt < MAX_ATTEMPTS && isTransientError(err)) {
          console.warn(
            `[kafka] createTopic transient error on attempt ${attempt}: ${err?.message}. retrying in 500ms...`
          );
          await sleep(500);
          continue;
        }
        break;
      }
    }

    const inner = lastErr?.message || String(lastErr);
    const errorsField = lastErr?.errors
      ? ` | errors: ${JSON.stringify(lastErr.errors)}`
      : '';
    const topicErrors = lastErr?.topicErrors
      ? ` | topicErrors: ${JSON.stringify(lastErr.topicErrors)}`
      : '';
    console.error('[kafka] createTopic failed (final)', lastErr);
    throw new Error(`${inner}${errorsField}${topicErrors}`);
  });
}

export async function deleteTopic(name: string) {
  const state = globalForKafka.kafkaState;
  if (state) {
    state.partitionMessages.delete(name);
    state.calcResults = state.calcResults.filter((r) => r.topic !== name);

    if (state.consumer) {
      try {
        await state.consumer.disconnect();
        console.log(
          `[kafka] consumer disconnected before deleting topic "${name}"`
        );
      } catch (err) {
        console.warn('[kafka] consumer disconnect warning', err);
      }
      state.consumer = null;
      state.subscribedTopics.clear();
    }
  }

  const result = await withAdmin(async (admin) => {
    await admin.deleteTopics({ topics: [name], timeout: 30000 });
    return { name };
  });

  setTimeout(() => {
    refreshConsumer().catch((err) =>
      console.error('[kafka] auto-refresh consumer after delete failed', err)
    );
  }, 2000);

  return result;
}

export async function getBrokers(): Promise<{
  brokers: BrokerMetadata[];
  controller: number;
}> {
  return withAdmin(async (admin) => {
    const cluster = await admin.describeCluster();
    const stable = stabilizeController(cluster.controller ?? -1);
    return {
      brokers: cluster.brokers.map((b) => ({
        id: b.nodeId,
        host: b.host,
        port: b.port,
      })),
      controller: stable,
    };
  });
}

export interface BrokerStatus extends BrokerMetadata {
  alive: boolean;
}

export async function getAllBrokersWithStatus(): Promise<{
  brokers: BrokerStatus[];
  controller: number;
}> {
  let live: { brokers: BrokerMetadata[]; controller: number };
  try {
    live = await getBrokers();
  } catch {
    live = { brokers: [], controller: -1 };
  }
  const aliveMap = new Map(live.brokers.map((b) => [b.id, b]));
  const brokers: BrokerStatus[] = BROKERS.map((b) => {
    const found = aliveMap.get(b.id);
    return found
      ? { ...found, alive: true }
      : { id: b.id, host: b.name, port: b.externalPort, alive: false };
  });
  return { brokers, controller: live.controller };
}

async function getProducer(): Promise<Producer> {
  getKafka();
  const state = globalForKafka.kafkaState!;
  if (!state.producer) {
    const p = state.kafka.producer({ allowAutoTopicCreation: false });
    await p.connect();
    state.producer = p;
    console.log('[kafka] producer connected');
  }
  return state.producer;
}

function computeCalc(numbers: number[], operator: CalcOperator): number | string {
  if (numbers.length === 0) return 'empty';
  if (operator === '+') return numbers.reduce((a, b) => a + b, 0);
  if (operator === '*') return numbers.reduce((a, b) => a * b, 1);
  if (operator === '-') return numbers.reduce((a, b, i) => (i === 0 ? b : a - b));
  if (operator === '/') {
    let acc = numbers[0];
    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] === 0) return 'div-by-zero';
      acc = acc / numbers[i];
    }
    return Number.isFinite(acc) ? Number(acc.toFixed(6)) : String(acc);
  }
  return 'unknown-op';
}

function pushMessage<T>(list: T[], item: T, max: number) {
  list.unshift(item);
  if (list.length > max) list.length = max;
}

function storePartitionMessage(
  topic: string,
  partition: number,
  message: PartitionMessage
) {
  const state = globalForKafka.kafkaState!;
  if (!state.partitionMessages.has(topic)) {
    state.partitionMessages.set(topic, new Map());
  }
  const topicMap = state.partitionMessages.get(topic)!;
  if (!topicMap.has(partition)) topicMap.set(partition, []);
  const list = topicMap.get(partition)!;
  list.unshift(message);
  if (list.length > MAX_PARTITION_MESSAGES) list.length = MAX_PARTITION_MESSAGES;
}

// 메시지 간 최소 간격(1000 / maxPerSecond ms)을 보장. 0 이면 제한 없음.
async function throttleConsume(): Promise<void> {
  const state = globalForKafka.kafkaState!;
  const rate = state.consumerMaxPerSecond;
  if (rate <= 0) return;
  const now = Date.now();
  const slot = Math.max(now, state.nextConsumeSlotAt);
  state.nextConsumeSlotAt = slot + 1000 / rate;
  if (slot > now) await sleep(slot - now);
}

export function getConsumerConfig(): ConsumerConfig {
  getKafka();
  return { maxPerSecond: globalForKafka.kafkaState!.consumerMaxPerSecond };
}

export function setConsumerConfig(config: ConsumerConfig): ConsumerConfig {
  const rate = config.maxPerSecond;
  if (!Number.isInteger(rate) || rate < 0 || rate > MAX_CONSUMER_RATE) {
    throw new Error(
      `maxPerSecond 는 0 ~ ${MAX_CONSUMER_RATE} 사이의 정수여야 합니다 (0 = 제한 없음)`
    );
  }
  getKafka();
  const state = globalForKafka.kafkaState!;
  state.consumerMaxPerSecond = rate;
  state.nextConsumeSlotAt = 0;
  console.log(`[kafka] consumer rate limit set to ${rate || 'unlimited'} msg/s`);
  return { maxPerSecond: rate };
}

async function startOrRestartConsumer(): Promise<void> {
  getKafka();
  const state = globalForKafka.kafkaState!;

  const admin = state.kafka.admin();
  await admin.connect();
  let topicNames: string[] = [];
  try {
    topicNames = (await admin.listTopics()).filter((t) => !t.startsWith('__'));
  } finally {
    await admin.disconnect();
  }
  if (topicNames.length === 0) {
    console.log('[kafka] no user topics yet, consumer not started');
    return;
  }

  if (state.consumer) {
    try {
      await state.consumer.disconnect();
    } catch (err) {
      console.warn('[kafka] previous consumer disconnect warning', err);
    }
    state.consumer = null;
    state.subscribedTopics.clear();
  }

  const consumer = state.kafka.consumer({
    groupId: `calc-demo-reader-${Date.now()}`,
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
  });
  await consumer.connect();
  await consumer.subscribe({ topics: topicNames, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      if (!message.value) return;
      await throttleConsume();
      const raw = message.value.toString();
      let parsed: any = raw;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // leave as string
      }

      const pm: PartitionMessage = {
        partition,
        offset: message.offset,
        key: message.key?.toString() ?? '',
        value: parsed,
        rawValue: raw,
        consumedAt: new Date().toISOString(),
      };
      storePartitionMessage(topic, partition, pm);

      if (
        parsed &&
        typeof parsed === 'object' &&
        Array.isArray(parsed.numbers) &&
        typeof parsed.operator === 'string' &&
        ['+', '-', '*', '/'].includes(parsed.operator)
      ) {
        const result = computeCalc(parsed.numbers, parsed.operator);
        const calc: CalcResult = {
          id: parsed.id ?? `${topic}-${partition}-${message.offset}`,
          topic,
          partition,
          offset: message.offset,
          key: message.key?.toString() ?? '',
          input: { numbers: parsed.numbers, operator: parsed.operator },
          result,
          consumedAt: new Date().toISOString(),
        };
        pushMessage(state.calcResults, calc, MAX_CALC_RESULTS);
      }
    },
  });

  state.consumer = consumer;
  for (const t of topicNames) state.subscribedTopics.add(t);
  console.log(
    `[kafka] consumer running, subscribed to ${topicNames.length} topics: ${topicNames.join(', ')}`
  );
}

export async function ensureConsumer(): Promise<void> {
  getKafka();
  const state = globalForKafka.kafkaState!;
  if (state.consumer) return;
  if (state.consumerStarting) {
    await state.consumerStarting;
    return;
  }
  state.consumerStarting = startOrRestartConsumer().finally(() => {
    state.consumerStarting = null;
  });
  await state.consumerStarting;
}

export async function refreshConsumer(): Promise<void> {
  getKafka();
  const state = globalForKafka.kafkaState!;
  if (state.consumerStarting) {
    await state.consumerStarting;
    return;
  }
  state.consumerStarting = startOrRestartConsumer().finally(() => {
    state.consumerStarting = null;
  });
  await state.consumerStarting;
}

export async function publishCalc(
  topic: string,
  input: CalcInput,
  key?: string
) {
  const existing = await withAdmin((admin) => admin.listTopics());
  if (!existing.includes(topic)) {
    throw new Error(
      `Topic "${topic}" 가 존재하지 않습니다 (삭제됐을 수 있음). 다른 토픽을 선택하거나 새로 생성하세요.`
    );
  }

  const producer = await getProducer();
  const payload = {
    id: `calc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    numbers: input.numbers,
    operator: input.operator,
    createdAt: new Date().toISOString(),
  };

  const MAX_ATTEMPTS = 3;
  let lastErr: any = null;
  let result: any = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      result = await producer.send({
        topic,
        acks: -1,
        messages: [
          {
            key: key && key.length > 0 ? key : null,
            value: JSON.stringify(payload),
          },
        ],
      });
      break;
    } catch (err: any) {
      lastErr = err;
      if (attempt < MAX_ATTEMPTS && isTransientError(err)) {
        console.warn(
          `[kafka] publishCalc transient error on attempt ${attempt}: ${err?.message}. retrying in 500ms...`
        );
        await sleep(500);
        continue;
      }
      break;
    }
  }

  if (!result) {
    console.error('[kafka] publishCalc failed (final)', lastErr);
    throw new Error(lastErr?.message || String(lastErr));
  }

  await ensureConsumer();
  const meta = result[0];
  return {
    topic,
    partition: meta.partition,
    offset: String(meta.baseOffset ?? '?'),
    payload,
  };
}

export function getCalcResults(): CalcResult[] {
  getKafka();
  const state = globalForKafka.kafkaState!;
  return state.calcResults ?? [];
}

export function getPartitionMessages(
  topic: string,
  partition: number
): PartitionMessage[] {
  getKafka();
  const state = globalForKafka.kafkaState!;
  const topicMap = state.partitionMessages?.get(topic);
  if (!topicMap) return [];
  return topicMap.get(partition) ?? [];
}
