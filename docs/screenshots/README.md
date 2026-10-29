# 스크린샷 가이드

메인 `README.md` 가 참조하는 이미지 목록입니다. 아래 파일명으로 PNG 를 이 폴더에 넣으면 README 에 자동 노출됩니다.

> **권장 해상도**: 1600 px 가로 (고해상도 디스플레이에서도 또렷) · PNG · 다크 테마 유지

---

## 캡처 가이드

### `00-overview.png` — 전체 Dashboard 스샷
- http://localhost:3000 전체 화면
- 토픽 2~3개가 있고, Consumer Result 와 Stats Panel 둘 다 데이터 보이는 상태로
- Broker Grid 가 다 보이게 (적어도 2행 ≈ 1800×1200)

### `01-create-topic.png` — Create Topic 카드
- 좌측 Create Topic 카드만 클로즈업
- 이름 입력돼 있고 슬라이더 값 보이게
- "Total replicas", "avg per broker" preview 보이도록

### `02-topic-list.png` — Topic List 카드
- 최소 3개 토픽, 그 중 하나는 `NEW` 뱃지가 떠있는 순간
- 색상 dot 이 다 다른 걸 확인할 수 있게

### `03-producer.png` — Producer 카드
- 숫자 배열, 연산자, Key 입력된 상태
- "Publish" 버튼 활성화

### `04-consumer-result.png` — Consumer Result 카드
- 결과 몇 개 쌓여있는 상태
- Max msg/s 입력란에 숫자 (예: 1)
- Clear history 버튼 보이게

### `05-stats-panel.png` — Stats Panel ★
- 메시지 10개 이상 처리된 상태
- Operator bar chart 가 다 다른 길이로 나오게 (여러 연산자 사용)
- 상단에 "Independent Consumer Group — fan-out" 뱃지 + `stats-reader-...` 그룹 ID 노출
- 토픽 2개 이상이면 좋음

### `06-broker-grid.png` — Broker Grid ★
- 6개 broker 카드 전부
- CTRL 뱃지가 보이는 상태
- 가능하면 **broker 1~2개는 DOWN 상태**로 캡처 (Stop 버튼 데모)
- 파티션들의 Leader(★) / Follower(·) 가 다 보이게

### `07-partition-viewer.png` — Partition Viewer 모달
- Broker Grid 에서 파티션 하나 클릭한 상태
- 모달에 raw 메시지 몇 개 보이게

---

## 캡처 꿀팁

- 데모용 토픽 이름 추천: `orders`, `clicks`, `payments` (실제 유즈케이스 느낌)
- Publish 몇 번 돌려서 Stats 와 Consumer Result 데이터 채운 뒤 캡처
- 다크 테마 유지: `<body>` 는 이미 다크 배경
- Windows: `Win + Shift + S` → PNG 로 저장
- Mac: `Cmd + Shift + 4` → space 로 창 선택
- 리사이즈 시 가로 1600~2000px, PNG 유지 (JPG 는 톤 변질)
