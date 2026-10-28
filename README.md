# Kafka Topic Manager

Next.js UI에서 **Kafka Topic을 생성/삭제** 하고, **6개 Broker 클러스터에 파티션이 어떻게 분산되는지** 실시간으로 시각화하는 데모.

## 핵심 포인트

- **Topic 생성 폼**: 이름, Partition 수, Replication Factor 지정
- **생성 즉시 반영**: Topic List 에 `NEW` 뱃지로 하이라이트
- **Broker Grid**: 6개 Broker에 각 Topic의 파티션(Leader/Follower)이 어떻게 할당됐는지 색상으로 매칭
- **삭제 가능**: 토픽 옆 "삭제" 버튼
- **색상 자동 할당**: Topic 이름 해시 기반, Topic 리스트와 Broker Grid에서 동일 색상
- **Under-replicated 감지**: ISR < RF 일 때 ⚠ 표시
- **시스템 토픽 토글**: `__consumer_offsets` 같은 내부 토픽 보기 on/off

## 아키텍처

```
┌───────────────────────────────────────────────────────┐
│                 Next.js (localhost:3000)              │
│                                                        │
│   [Create Form]  →  POST /api/topics                  │
│                              │                         │
│                              ▼                         │
│                     kafkajs admin API                  │
│                              │                         │
└──────────────────────────────┼─────────────────────────┘
                               │
          ┌────────────────────┼────────────────────────┐
          │        Kafka Cluster (6 Brokers, KRaft)     │
          │                                              │
          │  kafka-1  kafka-2  kafka-3                   │
          │  :9092    :9192    :9292                     │
          │                                              │
          │  kafka-4  kafka-5  kafka-6                   │
          │  :9392    :9492    :9592                     │
          │                                              │
          │  (Topic/Partition/Replica 자동 분산)         │
          └──────────────────────────────────────────────┘
                               ▲
                               │
                         Kafka UI :8080
```

## 시스템 요구사항

- **Docker Desktop** (실행 중)
- Docker **메모리 6GB 이상** 할당 권장 (Broker 6대)
- 디스크 ~5GB 여유 공간

## 실행 방법

### 1. Kafka Cluster 실행

```bash
docker compose up -d
```

6대 Broker + Kafka UI 가 올라옵니다 (처음은 1~2분 소요).

### 2. 상태 확인

```bash
docker compose ps
```

7개 모두 `Up` 이어야 합니다.

### 3. Next.js 앱 실행

```bash
npm install
npm run dev
```

### 4. 브라우저 열기

- http://localhost:3000 → Topic Manager
- http://localhost:8080 → Kafka UI (6대 클러스터)

## 사용법

1. 좌측 **"새 Topic 생성"** 폼에서:
   - 이름 입력 (예: `user-events`)
   - Partitions 슬라이더로 조정
   - Replication 슬라이더로 조정 (최대 Broker 수 = 6)
2. **"Topic 생성 →"** 클릭
3. 우측 Topic List 에 즉시 반영 (NEW 뱃지 5초간)
4. 하단 Broker Grid 에서 **방금 만든 Topic의 파티션 분산**이 색상으로 보임
5. Topic 옆 **"삭제"** 로 제거 가능

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/topics?internal=true` | 모든 토픽 (파티션/ISR 포함) |
| POST | `/api/topics` | Topic 생성 `{ name, numPartitions, replicationFactor }` |
| DELETE | `/api/topics/[name]` | Topic 삭제 |
| GET | `/api/brokers` | Broker/Controller 정보 |

## 코드 구조

```
.
├── docker-compose.yml       # Kafka 6대 + Kafka UI
├── lib/
│   ├── kafka.ts             # Admin API 래퍼 (list/create/delete)
│   └── colors.ts            # Topic별 색상 해시
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   └── api/
│       ├── topics/
│       │   ├── route.ts     # GET list, POST create
│       │   └── [name]/
│       │       └── route.ts # DELETE
│       └── brokers/
│           └── route.ts     # GET cluster info
└── components/
    ├── Dashboard.tsx        # 전체 레이아웃 + 폴링
    ├── CreateTopicForm.tsx  # 생성 폼
    ├── TopicList.tsx        # 토픽 리스트
    └── BrokerGrid.tsx       # 6개 Broker 시각화
```

## 실습 아이디어

- **Partition 많이 가진 Topic**: 20개 Partition으로 생성 → 6대 Broker에 어떻게 분산되는지
- **Replication Factor 1**: 복제본 없음 → 각 Broker에 Leader 하나씩만
- **Replication Factor 6**: 모든 Broker가 복제본 보유
- **Replication Factor > Broker 수**: 에러 메시지 확인
- **같은 이름 중복 생성**: 에러 처리 확인
- **Kafka UI(:8080)와 비교**: 같은 Topic이 양쪽에서 동일하게 보임

## 트러블슈팅

### "Cluster 연결 끊김"
- `docker compose ps` 로 6대 Broker 모두 `Up` 인지 확인
- 처음엔 리더 선출에 1~2분 걸림

### Topic 생성 "already exists"
- 이름 중복. Topic List 에서 기존 것 확인/삭제 후 재시도

### Broker 메모리 부족으로 재시작
- Docker Desktop 메모리 할당 늘리기 (Settings → Resources)

### Replication Factor 에러
- Broker 수(6)를 초과할 수 없음
- 예: `Replication factor: 7 larger than available brokers: 6`
