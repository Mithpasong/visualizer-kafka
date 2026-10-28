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
  producer: Producer | null;
  consumer: Consumer | null;
  subscribedTopics: Set<string>;
  partitionMessages: Map<string, Map<number, PartitionMessage[]>>;
  calcResults: CalcResult[];
  consumerStarting: Promise<void> | null;
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
      producer: null,
      consumer: null,
      subscribedTopics: new Set(),
      partitionMessages: new Map(),
      calcResults: [],
      consumerStarting: null,
    };
  }
  return globalForKafka.kafkaState.kafka;
}

const CONTROLLER_WINDOW = 7;
const MAX_PARTITION_MESSAGES = 200;
const MAX_CALC_RESULTS = 100;

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
  let bestId = rawController;
  let bestCount = -1;
  for (const [id, c] of counts) {
    if (c > bestCount) {
      bestCount = c;
      bestId = id;
    }
  }
  return bestId;
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
        throw new Error(
          `Kafka 가 토픽 생성을 거부했습니다 (이미 존재하거나 설정 문제)`
        );
      }
    } catch (err: any) {
      const inner = err?.message || String(err);
      const errorsField = err?.errors
        ? ` | errors: ${JSON.stringify(err.errors)}`
        : '';
      const topicErrors = err?.topicErrors
        ? ` | topicErrors: ${JSON.stringify(err.topicErrors)}`
        : '';
      console.error('[kafka] createTopic failed', err);
      throw new Error(`${inner}${errorsField}${topicErrors}`);
    }

    return { name, numPartitions, replicationFactor };
  });
}

export async function deleteTopic(name: string) {
  const state = globalForKafka.kafkaState;
  if (state) {
    state.partitionMessages.delete(name);
    state.calcResults = state.calcResults.filter((r) => r.topic !== name);
  }
  return withAdmin(async (admin) => {
    await admin.deleteTopics({ topics: [name] });
    return { name };
  });
}

export async function getBrokers(): Promise<{
  brokers: BrokerMetadata[];
  controller: number;
}> {
  return withAdmin(async (admin) => {
    const cluster = await admin.describeCluster();
    const stable = stabilizeController(cluster.controller);
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
  const producer = await getProducer();
  const payload = {
    id: `calc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    numbers: input.numbers,
    operator: input.operator,
    createdAt: new Date().toISOString(),
  };
  const result = await producer.send({
    topic,
    acks: -1,
    messages: [
      {
        key: key && key.length > 0 ? key : null,
        value: JSON.stringify(payload),
      },
    ],
  });
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
  const state = globalForKafka.kafkaState;
  return state?.calcResults ?? [];
}

export function getPartitionMessages(
  topic: string,
  partition: number
): PartitionMessage[] {
  const state = globalForKafka.kafkaState;
  const list = state?.partitionMessages.get(topic)?.get(partition) ?? [];
  return list;
}
