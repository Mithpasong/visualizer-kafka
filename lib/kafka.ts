import { Kafka, Producer, Consumer, Admin, logLevel } from 'kafkajs';

export const TOPIC = 'votes';
export const NUM_PARTITIONS = 6;
export const REPLICATION_FACTOR = 3;

export const VOTE_OPTIONS = [
  { id: 'javascript', label: 'JavaScript', color: 'yellow' },
  { id: 'python', label: 'Python', color: 'sky' },
  { id: 'java', label: 'Java', color: 'orange' },
  { id: 'go', label: 'Go', color: 'cyan' },
  { id: 'rust', label: 'Rust', color: 'red' },
  { id: 'typescript', label: 'TypeScript', color: 'blue' },
] as const;

export type VoteOptionId = typeof VOTE_OPTIONS[number]['id'];

export const CONSUMER_GROUPS = [
  { id: 'vote-counter', label: '집계 서비스' },
  { id: 'live-feed', label: '실시간 피드' },
] as const;

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

export interface VoteMessage {
  voteId: string;
  option: VoteOptionId;
  voter: string;
  createdAt: string;
}

export interface ConsumedRecord {
  partition: number;
  offset: string;
  key: string;
  value: VoteMessage;
  consumedAt: string;
}

export interface PartitionMetadata {
  partition: number;
  leader: number;
  replicas: number[];
  isr: number[];
}

interface KafkaState {
  kafka: Kafka;
  admin: Admin;
  producer: Producer;
  consumers: Record<string, Consumer>;
  consumed: Record<string, ConsumedRecord[]>;
  produced: ConsumedRecord[];
  tallies: Record<VoteOptionId, number>;
  partitionTallies: Record<number, number>;
  initialized: boolean;
  initializing: Promise<void> | null;
}

const globalForKafka = globalThis as unknown as { kafkaState?: KafkaState };

function createState(): KafkaState {
  const kafka = new Kafka({
    clientId: 'nextjs-cluster-demo',
    brokers: BOOTSTRAP_SERVERS,
    logLevel: logLevel.ERROR,
    retry: { retries: 8, initialRetryTime: 300 },
  });

  const admin = kafka.admin();
  const producer = kafka.producer({ allowAutoTopicCreation: false });
  const consumers: Record<string, Consumer> = {};
  const consumed: Record<string, ConsumedRecord[]> = {};

  for (const group of CONSUMER_GROUPS) {
    consumers[group.id] = kafka.consumer({
      groupId: group.id,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
    consumed[group.id] = [];
  }

  const tallies = Object.fromEntries(
    VOTE_OPTIONS.map((o) => [o.id, 0])
  ) as Record<VoteOptionId, number>;

  const partitionTallies: Record<number, number> = {};
  for (let i = 0; i < NUM_PARTITIONS; i++) partitionTallies[i] = 0;

  return {
    kafka,
    admin,
    producer,
    consumers,
    consumed,
    produced: [],
    tallies,
    partitionTallies,
    initialized: false,
    initializing: null,
  };
}

const MAX_RECORDS = 60;

function pushRecord(list: ConsumedRecord[], record: ConsumedRecord) {
  list.unshift(record);
  if (list.length > MAX_RECORDS) list.length = MAX_RECORDS;
}

async function ensureTopic(state: KafkaState) {
  await state.admin.connect();
  try {
    const existing = await state.admin.listTopics();
    if (!existing.includes(TOPIC)) {
      await state.admin.createTopics({
        waitForLeaders: true,
        topics: [
          {
            topic: TOPIC,
            numPartitions: NUM_PARTITIONS,
            replicationFactor: REPLICATION_FACTOR,
          },
        ],
      });
      console.log(
        `[kafka] topic "${TOPIC}" created (partitions=${NUM_PARTITIONS}, rf=${REPLICATION_FACTOR})`
      );
    }
  } finally {
    await state.admin.disconnect();
  }
}

async function initConsumers(state: KafkaState) {
  for (const group of CONSUMER_GROUPS) {
    const consumer = state.consumers[group.id];
    await consumer.connect();
    await consumer.subscribe({ topic: TOPIC, fromBeginning: true });
    await consumer.run({
      eachMessage: async ({ partition, message }) => {
        if (!message.value) return;
        try {
          const value = JSON.parse(message.value.toString()) as VoteMessage;
          const record: ConsumedRecord = {
            partition,
            offset: message.offset,
            key: message.key?.toString() ?? '',
            value,
            consumedAt: new Date().toISOString(),
          };
          pushRecord(state.consumed[group.id], record);
          if (group.id === 'vote-counter') {
            state.tallies[value.option] =
              (state.tallies[value.option] ?? 0) + 1;
            state.partitionTallies[partition] =
              (state.partitionTallies[partition] ?? 0) + 1;
          }
        } catch (err) {
          console.error(`[${group.id}] parse error`, err);
        }
      },
    });
    console.log(`[kafka] consumer "${group.id}" started`);
  }
}

export async function getKafka(): Promise<KafkaState> {
  if (!globalForKafka.kafkaState) {
    globalForKafka.kafkaState = createState();
  }
  const state = globalForKafka.kafkaState;

  if (state.initialized) return state;
  if (state.initializing) {
    await state.initializing;
    return state;
  }

  state.initializing = (async () => {
    try {
      await ensureTopic(state);
      await state.producer.connect();
      await initConsumers(state);
      state.initialized = true;
      console.log('[kafka] cluster demo initialized');
    } catch (err) {
      state.initializing = null;
      throw err;
    }
  })();

  await state.initializing;
  state.initializing = null;
  return state;
}

export async function sendVote(vote: VoteMessage) {
  const state = await getKafka();
  const result = await state.producer.send({
    topic: TOPIC,
    acks: -1,
    messages: [
      {
        key: vote.option,
        value: JSON.stringify(vote),
      },
    ],
  });

  const meta = result[0];
  pushRecord(state.produced, {
    partition: meta.partition,
    offset: String(meta.baseOffset ?? '?'),
    key: vote.option,
    value: vote,
    consumedAt: new Date().toISOString(),
  });
  return meta;
}

export async function getBrokerMetadata() {
  const state = await getKafka();
  const admin = state.kafka.admin();
  await admin.connect();
  try {
    const cluster = await admin.describeCluster();
    const topicMeta = await admin.fetchTopicMetadata({ topics: [TOPIC] });
    const topic = topicMeta.topics[0];

    const partitions: PartitionMetadata[] = topic
      ? topic.partitions.map((p) => ({
          partition: p.partitionId,
          leader: p.leader,
          replicas: p.replicas,
          isr: p.isr,
        }))
      : [];

    return {
      brokers: cluster.brokers.map((b) => ({
        id: b.nodeId,
        host: b.host,
        port: b.port,
      })),
      controller: cluster.controller,
      partitions,
    };
  } finally {
    await admin.disconnect();
  }
}

export async function getSnapshot() {
  const state = await getKafka();
  return {
    topic: TOPIC,
    partitionCount: NUM_PARTITIONS,
    replicationFactor: REPLICATION_FACTOR,
    voteOptions: VOTE_OPTIONS,
    groups: CONSUMER_GROUPS,
    produced: state.produced,
    consumed: state.consumed,
    tallies: state.tallies,
    partitionTallies: state.partitionTallies,
    totalVotes: Object.values(state.tallies).reduce((a, b) => a + b, 0),
  };
}
