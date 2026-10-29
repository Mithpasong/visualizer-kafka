export type Locale = "en" | "ko";

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ko", label: "한국어" },
];

type Dict = Record<string, string>;

const en: Dict = {
  "app.title": "Kafka Visualizer",
  "app.subtitle":
    "Create / delete Kafka topics and visualize cluster distribution",
  "status.connected": "Cluster connected ({count}/{total} brokers)",
  "status.disconnected": "Cluster disconnected",
  "status.kafkaUi": "Kafka UI ↗",
  "error.connectionFailed": "Connection failed:",
  "error.checkCluster":
    "Make sure the Kafka cluster is running: ",
  "footer.hint":
    "bootstrap: localhost:9092,...,9592 · polling every 1.5s · click any partition to view messages",

  "createTopic.title": "Create new Topic",
  "createTopic.subtitle": "Add a Topic to the Kafka cluster via the Admin API",
  "createTopic.nameLabel": "Topic name",
  "createTopic.namePlaceholder": "e.g. user-events",
  "createTopic.nameHint": "Letters, digits, ._- only",
  "createTopic.partitionsLabel": "Partitions",
  "createTopic.replicationLabel": "Replication",
  "createTopic.replicationHint": "{count} brokers → max RF {count}",
  "createTopic.summaryReplicas": "Total replicas: {n}",
  "createTopic.summaryPerBroker": "Average per broker: {n}",
  "createTopic.submit": "Create Topic →",
  "createTopic.submitting": "Creating...",
  "createTopic.tip1":
    "💡 Partition distribution appears below in the Broker Grid",
  "createTopic.tip2":
    "💡 Replication Factor > 1 spreads replicas across multiple brokers",
  "createTopic.noticeCreated":
    "✓ Topic \"{name}\" created ({partitions} partitions, RF {rf})",
  "createTopic.noticeFailed": "Failed: {msg}",

  "topicList.title": "Topics · {count}",
  "topicList.subtitlePolling": "live polling",
  "topicList.subtitleUnderReplicated":
    "⚠ {count} under-replicated partitions · ",
  "topicList.showInternal": "Show internal ({count})",
  "topicList.empty": "No user-created topics yet.",
  "topicList.emptyHint": "Create a Topic on the left to get started",
  "topicList.newBadge": "NEW",
  "topicList.systemBadge": "SYSTEM",
  "topicList.deleteBtn": "Delete",
  "topicList.confirmDelete": "Really delete topic \"{name}\"?",
  "topicList.noticeDeleted": "Topic \"{name}\" deleted",
  "topicList.noticeDeleteFailed": "Delete failed: {msg}",

  "brokerGrid.title": "Kafka Cluster · {count} Brokers",
  "brokerGrid.subtitle":
    "How Topic partitions are distributed across Brokers (★ Leader, · Follower)",
  "brokerGrid.controller": "Controller:",
  "brokerGrid.controllerBrokerPrefix": "Broker",
  "brokerGrid.noPartitions": "(no partitions stored)",
  "brokerGrid.totalReplicas":
    "{replicas} replicas · {leaders} Leader",
  "brokerGrid.legendLeader": "Leader",
  "brokerGrid.legendFollower": "Follower",
  "brokerGrid.legendController": "Controller Broker",
  "brokerGrid.partitionTooltip":
    "Click: view messages in Partition {p} ({role})",
  "brokerGrid.justCreated": "Just created here",
  "brokerGrid.justPublished":
    "Data landed here. Click to view details",
  "brokerGrid.downBadge": "DOWN",
  "brokerGrid.statusDown": "offline — partitions reassigned",
  "brokerGrid.stopBtn": "Stop",
  "brokerGrid.startBtn": "Start",
  "brokerGrid.stopping": "Stopping…",
  "brokerGrid.starting": "Starting…",
  "brokerGrid.stopTooltip":
    "docker stop kafka-{id} — Controller/Leader will be re-elected",
  "brokerGrid.startTooltip": "docker start kafka-{id} — bring it back",
  "brokerGrid.confirmStop":
    "Stop Broker {id}?\nThis will trigger Leader/Controller re-election.",
  "brokerGrid.confirmStart": "Start Broker {id}?",
  "brokerGrid.noticeStopped": "⏻ Broker {id} stopped",
  "brokerGrid.noticeStarted": "✓ Broker {id} started",
  "brokerGrid.actionFailed":
    "Broker {id} {action} failed: {msg}",

  "calcProducer.title": "Producer · Publish calculation",
  "calcProducer.subtitle":
    "Numbers + operator → Consumer computes the result",
  "calcProducer.refreshBtn": "Resubscribe consumer",
  "calcProducer.refreshTooltip":
    "After creating new topics, restart the consumer so it picks them up",
  "calcProducer.topicLabel": "Topic",
  "calcProducer.topicEmpty": "Create a Topic first",
  "calcProducer.numbersLabel": "Numbers",
  "calcProducer.numbersHint":
    "Comma/space separated. Decimals OK (e.g. 1.5, 2.5)",
  "calcProducer.operatorLabel": "Operator",
  "calcProducer.keyLabel": "Partition Key (optional)",
  "calcProducer.keyPlaceholder": "(blank = round-robin)",
  "calcProducer.keyHint": "Same key = same Partition",
  "calcProducer.submit": "Publish →",
  "calcProducer.submitting": "Publishing...",
  "calcProducer.selectTopicFirst":
    "Select a Topic first (you can also create a new one on the left)",
  "calcProducer.badNumbers":
    "Numbers are invalid. Example: 1, 2, 3",
  "calcProducer.noticePublished":
    "✓ Published to \"{topic}\" P{partition} / off {offset}",
  "calcProducer.noticeFailed": "Publish failed: {msg}",

  "calcResults.title": "Consumer · Results",
  "calcResults.subtitle":
    "Only calc-formatted messages are processed ({count})",
  "calcResults.empty": "No calc messages received yet.",
  "calcResults.emptyHint": "Publish from the left to see results.",
  "calcResults.ago.justNow": "just now",
  "calcResults.ago.seconds": "{n}s ago",
  "calcResults.ago.minutes": "{n}m ago",
  "calcResults.ago.hours": "{n}h ago",
  "calcResults.rateLabel": "Max msg/s",
  "calcResults.rateHint": "0 = unlimited",
  "calcResults.rateSave": "Save",
  "calcResults.rateSaving": "Saving…",
  "calcResults.rateCurrent": "Current: {rate}",
  "calcResults.rateUnlimited": "unlimited",
  "calcResults.clearBtn": "Clear history",
  "calcResults.clearing": "Clearing…",
  "calcResults.clearTooltip":
    "Remove all displayed results (Kafka messages are kept in topics)",
  "calcResults.confirmClear":
    "Clear all displayed results?\nThis does not delete Kafka messages — just the panel history.",

  "viewer.title": "Topic {topic} / Partition {partition}",
  "viewer.subtitle": "Messages stored in this partition ({count})",
  "viewer.loading": "Loading...",
  "viewer.empty": "No messages in this partition.",
  "viewer.emptyHint":
    "(Only messages published after the server started are shown)",
  "viewer.offsetPrefix": "offset",
  "viewer.noKey": " · (no key)",
  "viewer.footer":
    "Auto-refresh every 1.5s · ESC or outside click to close",

  "lang.switch.label": "Language",

  "overlay.creating": "Creating topic \"{name}\"...",
  "overlay.deleting": "Deleting topic \"{name}\"...",
  "overlay.pleaseWait":
    "This may take a few seconds. Please wait until it completes.",
};

const ko: Dict = {
  "app.title": "Kafka Visualizer",
  "app.subtitle":
    "Kafka Topic 생성·삭제, 클러스터 분산 시각화",
  "status.connected": "Cluster 연결됨 ({count}/{total}대 Broker)",
  "status.disconnected": "Cluster 연결 끊김",
  "status.kafkaUi": "Kafka UI ↗",
  "error.connectionFailed": "연결 실패:",
  "error.checkCluster": "Kafka 클러스터가 실행 중인지 확인하세요: ",
  "footer.hint":
    "bootstrap: localhost:9092,...,9592 · 1.5초마다 폴링 · 파티션 블록 클릭 → 저장된 메시지 보기",

  "createTopic.title": "새 Topic 생성",
  "createTopic.subtitle": "Admin API 로 Kafka 클러스터에 Topic 추가",
  "createTopic.nameLabel": "Topic 이름",
  "createTopic.namePlaceholder": "예: user-events",
  "createTopic.nameHint": "영문/숫자/._- 만 가능",
  "createTopic.partitionsLabel": "Partitions",
  "createTopic.replicationLabel": "Replication",
  "createTopic.replicationHint": "Broker {count}대 → 최대 RF {count}",
  "createTopic.summaryReplicas": "총 Partition 복제본: {n}개",
  "createTopic.summaryPerBroker": "Broker당 평균: {n}개",
  "createTopic.submit": "Topic 생성 →",
  "createTopic.submitting": "생성 중...",
  "createTopic.tip1":
    "💡 생성 후 아래 Broker Grid 에서 파티션 분산이 즉시 보임",
  "createTopic.tip2":
    "💡 Replication Factor > 1 이면 복제본이 다른 Broker에 분산됨",
  "createTopic.noticeCreated":
    "✓ \"{name}\" 토픽 생성 (파티션 {partitions}, RF {rf})",
  "createTopic.noticeFailed": "실패: {msg}",

  "topicList.title": "Topic 목록 · {count}개",
  "topicList.subtitlePolling": "실시간 폴링",
  "topicList.subtitleUnderReplicated":
    "⚠ Under-replicated 파티션 {count}개 · ",
  "topicList.showInternal": "시스템 토픽 표시 ({count})",
  "topicList.empty": "아직 생성된 Topic이 없습니다.",
  "topicList.emptyHint": "왼쪽에서 새 Topic을 만들어 보세요",
  "topicList.newBadge": "NEW",
  "topicList.systemBadge": "SYSTEM",
  "topicList.deleteBtn": "삭제",
  "topicList.confirmDelete": "\"{name}\" 토픽을 정말 삭제할까요?",
  "topicList.noticeDeleted": "\"{name}\" 삭제됨",
  "topicList.noticeDeleteFailed": "삭제 실패: {msg}",

  "brokerGrid.title": "Kafka Cluster · Broker {count}대",
  "brokerGrid.subtitle":
    "Topic 파티션이 Broker에 어떻게 분산됐는지 (★=Leader, ·=Follower)",
  "brokerGrid.controller": "Controller:",
  "brokerGrid.controllerBrokerPrefix": "Broker",
  "brokerGrid.noPartitions": "(저장된 파티션 없음)",
  "brokerGrid.totalReplicas":
    "총 {replicas}개 복제본 · {leaders}개 Leader",
  "brokerGrid.legendLeader": "Leader",
  "brokerGrid.legendFollower": "Follower",
  "brokerGrid.legendController": "Controller Broker",
  "brokerGrid.partitionTooltip":
    "클릭: Partition {p} 메시지 보기 ({role})",
  "brokerGrid.justCreated": "여기에 방금 작업하신 것이 생겼습니다",
  "brokerGrid.justPublished":
    "여기에 데이터가 들어갔습니다. 상세하게 보려면 클릭하세요",
  "brokerGrid.downBadge": "DOWN",
  "brokerGrid.statusDown": "오프라인 — 파티션 재배정됨",
  "brokerGrid.stopBtn": "Stop",
  "brokerGrid.startBtn": "Start",
  "brokerGrid.stopping": "정지 중…",
  "brokerGrid.starting": "시작 중…",
  "brokerGrid.stopTooltip":
    "docker stop kafka-{id} — Controller/Leader 재선출 발생",
  "brokerGrid.startTooltip": "docker start kafka-{id} — 다시 켜기",
  "brokerGrid.confirmStop":
    "Broker {id} 을(를) 정지하시겠습니까?\nLeader/Controller 재선출이 발생합니다.",
  "brokerGrid.confirmStart": "Broker {id} 을(를) 시작하시겠습니까?",
  "brokerGrid.noticeStopped": "⏻ Broker {id} 정지됨",
  "brokerGrid.noticeStarted": "✓ Broker {id} 시작됨",
  "brokerGrid.actionFailed":
    "Broker {id} {action} 실패: {msg}",

  "calcProducer.title": "Producer · 계산 메시지 발행",
  "calcProducer.subtitle":
    "숫자 배열 + 연산자 → Consumer 가 받아서 결과 계산",
  "calcProducer.refreshBtn": "Consumer 재구독",
  "calcProducer.refreshTooltip":
    "새 토픽 생성 후 Consumer 가 그 토픽도 구독하도록 재시작",
  "calcProducer.topicLabel": "Topic",
  "calcProducer.topicEmpty": "먼저 Topic 을 생성하세요",
  "calcProducer.numbersLabel": "숫자 배열",
  "calcProducer.numbersHint":
    "쉼표/공백으로 구분. 소수점 가능 (예: 1.5, 2.5)",
  "calcProducer.operatorLabel": "연산자",
  "calcProducer.keyLabel": "Partition Key (옵션)",
  "calcProducer.keyPlaceholder": "(비워두면 round-robin)",
  "calcProducer.keyHint": "같은 key = 같은 Partition",
  "calcProducer.submit": "메시지 발행 →",
  "calcProducer.submitting": "발행 중...",
  "calcProducer.selectTopicFirst":
    "Topic 을 먼저 선택하세요 (왼쪽에서 새 Topic 을 만들어도 됩니다)",
  "calcProducer.badNumbers":
    "숫자 배열이 올바르지 않습니다. 예: 1, 2, 3",
  "calcProducer.noticePublished":
    "✓ \"{topic}\" P{partition} / off {offset} 에 발행됨",
  "calcProducer.noticeFailed": "발행 실패: {msg}",

  "calcResults.title": "Consumer · 계산 결과",
  "calcResults.subtitle":
    "수신된 메시지 중 계산 포맷에 맞는 것만 처리 ({count}건)",
  "calcResults.empty": "아직 수신된 계산 메시지가 없습니다.",
  "calcResults.emptyHint": "왼쪽에서 메시지를 발행해보세요.",
  "calcResults.ago.justNow": "방금",
  "calcResults.ago.seconds": "{n}초 전",
  "calcResults.ago.minutes": "{n}분 전",
  "calcResults.ago.hours": "{n}시간 전",
  "calcResults.rateLabel": "초당 최대 처리 수",
  "calcResults.rateHint": "0 = 제한 없음",
  "calcResults.rateSave": "Save",
  "calcResults.rateSaving": "저장 중…",
  "calcResults.rateCurrent": "현재: {rate}",
  "calcResults.rateUnlimited": "제한 없음",
  "calcResults.clearBtn": "내역 지우기",
  "calcResults.clearing": "지우는 중…",
  "calcResults.clearTooltip":
    "표시된 결과를 모두 지웁니다 (Kafka 메시지는 그대로 유지)",
  "calcResults.confirmClear":
    "표시된 결과를 모두 지우시겠습니까?\nKafka의 실제 메시지는 삭제되지 않고 화면 내역만 지워집니다.",

  "viewer.title": "Topic {topic} / Partition {partition}",
  "viewer.subtitle": "이 파티션에 저장된 메시지 ({count}건)",
  "viewer.loading": "로딩 중...",
  "viewer.empty": "이 파티션에 저장된 메시지가 없습니다.",
  "viewer.emptyHint":
    "(서버 시작 후 이 토픽으로 발행된 메시지만 표시됩니다)",
  "viewer.offsetPrefix": "offset",
  "viewer.noKey": " · (no key)",
  "viewer.footer":
    "1.5초마다 자동 새로고침 · ESC 또는 바깥 클릭으로 닫기",

  "lang.switch.label": "언어",

  "overlay.creating": "토픽 \"{name}\" 생성 중...",
  "overlay.deleting": "토픽 \"{name}\" 삭제 중...",
  "overlay.pleaseWait":
    "완전히 완료될 때까지 잠시만 기다려 주세요.",
};

const DICTS: Record<Locale, Dict> = { en, ko };

export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  const dict = DICTS[locale] ?? en;
  let text = dict[key] ?? en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return text;
}
