import { Kafka, Admin, logLevel } from 'kafkajs';

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

interface KafkaState {
  kafka: Kafka;
  initialized: boolean;
  controllerHistory: number[];
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
    };
  }
  return globalForKafka.kafkaState.kafka;
}

const CONTROLLER_WINDOW = 7;

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
