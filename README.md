# Kafka Cluster + Next.js 실시간 투표 데모

**Broker 6대 클러스터**로 구성한 실제 Kafka 환경에서, 실시간 투표 이벤트가 어떻게 분산 저장/소비되는지 시각화합니다.

## 핵심 포인트

- **Broker 6대** KRaft 모드 클러스터 (Zookeeper 불필요)
- **Topic: `votes`** · Partition 6개 · Replication Factor 3
  - → 각 파티션의 데이터가 **3개 Broker에 복제**됨
  - → 어느 Broker 2대 죽어도 서비스 유지
- **Partition Key = 투표 옵션 ID**
  - → 같은 언어 투표는 항상 같은 파티션으로
- **2개 Consumer Group**: 
  - `vote-counter` (집계)
  - `live-feed` (실시간 피드)

## 아키텍처

```
                          Next.js (localhost:3000)
                                  │
         ┌────────────────────────┼────────────────────────┐
         │ Producer (투표 전송)   │  Consumer × 2 (수신)    │
         │                        ▼                         │
         │    ┌─────────────────────────────────────────┐  │
         │    │          Kafka Cluster (6 Brokers)       │  │
         │    │                                           │  │
         │    │  kafka-1  kafka-2  kafka-3                │  │
         │    │  :9092    :9192    :9292                  │  │
         │    │                                           │  │
         │    │  kafka-4  kafka-5  kafka-6                │  │
         │    │  :9392    :9492    :9592                  │  │
         │    │                                           │  │
         │    │  Topic: votes (P0~P5, RF=3)              │  │
         │    └─────────────────────────────────────────┘  │
         └──────────────────────────────────────────────────┘
                        ▲
                        │
                  Kafka UI :8080
```

## 시스템 요구사항

- **Docker Desktop** (실행 중이어야 함)
- **메모리 최소 6GB 할당** 권장 (Broker 6대 + Kafka UI)
  - Docker Desktop → Settings → Resources → Memory 로 조정
- 디스크 ~5GB 여유 공간

## 실행 방법

### 1. Kafka Cluster 실행

```bash
docker compose up -d
```

6대 Broker + Kafka UI 가 전부 뜰 때까지 1~2분 소요.
확인:

```bash
docker compose ps
```

**모든 컨테이너가 `Up` 상태인지 확인하세요.** 특히 처음엔 Broker들 간 리더 선출에 시간이 걸립니다.

### 2. 상태 체크

```bash
docker exec kafka-1 /opt/kafka/bin/kafka-metadata-quorum.sh \
  --bootstrap-server localhost:9092 describe --status
```

### 3. Next.js 앱 실행

```bash
npm install
npm run dev
```

### 4. 브라우저 열기

- http://localhost:3000 → 데모 대시보드
- http://localhost:8080 → Kafka UI (6대 클러스터 관리)

## 사용법

1. 좌측 **투표 버튼** (JavaScript / Python / Java / Go / Rust / TypeScript) 클릭
2. 가운데 **Broker Grid**:
   - 각 Broker가 어떤 Partition을 담당하는지 (★=Leader, ·=Follower)
   - Controller 라벨 (`CTRL`): 현재 메타데이터 관리하는 Broker
   - 하단 막대 그래프: 파티션별 메시지 분포
3. 가운데 하단 **투표 결과**: Consumer가 실시간 집계
4. 우측 **Live Feed**: 두 번째 Consumer Group이 수신한 스트림

## 보이는 포인트

| 개념 | 어디서 확인 |
|------|------------|
| Broker 6대 | 가운데 Broker Grid (6개 카드) |
| Topic/Partition 분산 | 각 Broker 카드 안의 P0~P5 뱃지 |
| Leader/Follower | ★(Leader) vs ·(Follower) |
| Controller | `CTRL` 금색 뱃지 |
| Replication Factor 3 | 각 파티션이 3개 Broker에 복제 (뱃지 3번 보임) |
| Partition Key 효과 | 투표 옵션별로 특정 파티션에 집중 |
| 2개 Consumer Group 독립 소비 | 결과 집계 + Live Feed 양쪽에 같은 메시지 |

## 유용한 명령

```bash
# 특정 Broker 로그 보기
docker compose logs -f kafka-1

# 모든 Broker 중지
docker compose down

# 데이터까지 완전 초기화
docker compose down -v

# Topic 상세 (Leader/ISR 등)
docker exec kafka-1 /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --describe --topic votes
```

## 코드 구조

```
.
├── docker-compose.yml      # Kafka 6대 + Kafka UI
├── lib/kafka.ts            # 클러스터 연결, Admin, Producer, Consumer
├── app/
│   ├── page.tsx            # 메인 페이지
│   ├── layout.tsx
│   └── api/
│       ├── produce/        # POST: 투표 전송
│       ├── stats/          # GET: 집계/피드 데이터
│       └── brokers/        # GET: Broker 메타데이터 (Leader/ISR)
└── components/
    ├── Dashboard.tsx       # 전체 레이아웃
    ├── VotePanel.tsx       # 투표 버튼 (Producer)
    ├── BrokerGrid.tsx      # 6개 Broker + 파티션 할당 시각화
    ├── VoteResults.tsx     # 집계 결과 (Consumer 1)
    └── LiveFeed.tsx        # 실시간 투표 피드 (Consumer 2)
```

## 트러블슈팅

### Broker가 시작은 되는데 Topic 생성이 안됨
- 6대 Broker 간 리더 선출에 시간이 걸림 → 1~2분 기다리기
- `docker compose logs kafka-1 | grep -i error`

### 메모리 부족
- Docker Desktop 메모리 할당 늘리기 (Settings → Resources)
- 또는 docker-compose.yml 에서 broker 수 줄이기

### Kafka UI에서 Cluster 안 보임
- 모든 Broker 가 `Up` 상태인지 확인
- `docker compose restart kafka-ui`

## 학습용 변형 아이디어

- `replicationFactor` 를 1 로 바꿔보고 Broker 1대 죽였을 때 비교
- `numPartitions` 를 10 으로 늘려서 분산 효과 확인
- Consumer Group 에 Consumer 인스턴스 추가해서 파티션 재할당(Rebalance) 관찰
- `docker compose stop kafka-1` 으로 Leader 이전 관찰 (Kafka UI 에서)
