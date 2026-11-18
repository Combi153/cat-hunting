# 방문자와 단계별 플레이 분석

2026-11-18: GA4 측정 ID `G-TV3RS6L0MR`을 Vercel `cat-hunting` 프로젝트의 Production 환경에 설정했다. Preview와 Development에는 운영 측정 ID를 넣지 않는다. 배포된 프로덕션 빌드에서 방문·플레이 이벤트를 수집한다.

## 처음 만들기

1. [Google Analytics](https://analytics.google.com/)에 로그인하고 **측정 시작**을 누른다. 기존 계정이 있으면 관리 → 만들기를 사용한다.
2. 계정 이름은 개인/프로젝트 묶음 이름(예: `Chanmin Games`), 속성 이름은 `냥이잡기`로 만든다. 보고 시간대는 대한민국, 통화는 KRW로 설정한다.
3. 업종·규모는 실제 상황에 맞게 선택한다. 목표에는 사용자 참여/유지 관련 항목을 선택한다.
4. 데이터 수집 플랫폼에서 **웹**을 선택한다. 프로토콜 `https://`, 웹사이트 URL `cat-hunting.vercel.app`, 스트림 이름 `냥이잡기 웹`으로 생성한다.
5. 웹 스트림 상세의 **측정 ID**(`G-…`)를 복사한다. 숫자로만 된 속성 ID나 스트림 ID와 다르다. 별도 태그 관리자 컨테이너는 필요하지 않다.

[Google 공식 설정 안내](https://support.google.com/analytics/answer/9304153?hl=ko)

## 코드 연결

빌드 환경에 `VITE_GA_MEASUREMENT_ID=G-실제측정ID`를 설정하고 다시 빌드한다. 배포 환경에도 같은 변수가 필요하다. Vite는 빌드 시 값을 번들에 넣으므로 이미 만들어진 파일에 환경 변수만 추가해서는 적용되지 않는다.

로컬에서는 `.env.example`을 `.env.local`로 복사해 설정한다. 개발 서버는 기본적으로 수집하지 않는다. 테스트 속성과 `VITE_GA_DEBUG=true`를 함께 설정하면 로컬 DebugView 검증이 가능하다. 운영 환경에서는 DEBUG를 켜지 않는다. ID가 없거나 잘못되면 외부 스크립트와 이벤트 전송 모두 비활성이다. 분석 스크립트가 차단되어도 게임은 진행된다.

측정 ID는 공개 식별자다. 광고 개인화와 Google Signals는 코드에서 끈다. 플레이 이벤트에는 이름·이메일·입력 문구를 넣지 않는다. GA의 기본 방문 분석과 식별 방식은 별도로 적용된다.

## 수집하는 내용

| 이벤트 | 의미 |
| --- | --- |
| 기본 GA 방문 이벤트 | 방문자·세션·유입 경로·기기 |
| `level_load` / `level_load_error` | 시작 버튼 이후 시험실 준비 시도/실패 |
| `level_start` | 실제 시험 시작. `start_source`는 `lobby`, `retry`, `advance` |
| `first_inspection` | 해당 판에서 처음 학생을 선택함. 도착 완료를 의미하지 않음 |
| `student_report` | 신고 성공/오인 (`report_result`) |
| `help_complete` | 답안지/커튼 도움 완료 (`help_type`) |
| `level_progress` | 게임 시간 15초·30초 체크포인트 |
| `level_end` | 결과 확정. `success`와 `end_reason`의 `win`, `health`, `missed`로 구분 |
| `level_exit` | 사용자가 그만두기를 확인하고 로비로 돌아감 |
| `level_background` | 진행 중 탭을 숨김. 일시 중단일 수 있어 이탈로 확정하지 않음 |

플레이 이벤트에는 단계(`level_name`: `exam_1`~`exam_5`), 규칙 버전(`ruleset`), 판 식별자(`attempt_id`), 현재 페이지 내 단계별 도전 순서(`attempt_number`), 실제 게임 진행 초, 남은 체력, 적발/미검거/오인 신고/도움 지연/과도한 관찰/도움 완료/학생 선택 횟수를 보낸다. 도전 순서는 새로고침 시 초기화되므로 생애 첫 도전 횟수로 해석하지 않는다.

`level_start`, `level_end`는 [GA4 게임 권장 이벤트](https://developers.google.com/analytics/devguides/collection/ga4/reference/events#level_end)를 사용한다.

## 처음 볼 보고서

- **방문 규모:** 사용자 획득·트래픽 획득에서 사용자 수, 세션, 유입 경로를 본다. 이벤트 수는 사람 수가 아니다.
- **단계별 실패:** 탐색 자유 형식에서 `level_end`를 필터링하고 단계 × 종료 사유별 이벤트 수를 본다. 완료된 판 기준 실패율은 `(health + missed) / 전체 level_end`다. 미완료 판은 분모에 들어가지 않는다.
- **진행 퍼널:** `level_start(exam_1)` → `level_end(exam_1, win)` → `level_start(exam_2)` 순으로 다섯 단계까지 구성한다. 사용자 단위 퍼널로 어느 단계에서 다음 단계로 진행하지 않는지 확인한다.
- **원인:** 실패 판의 오인 신고·도움 지연·과도한 관찰·미검거 수와 경과 시간을 비교한다. 체력 소진 자체는 마지막 원인 하나를 뜻하지 않으므로 누적 원인을 함께 본다.
- **재도전:** `level_start` 중 `start_source=retry`를 단계별로 본다. 실패 직후 결과 화면의 재도전만 이 값이며 로비를 경유한 재시작은 `lobby`다.

탭 닫힘·모바일 강제 종료는 전송을 보장할 수 없다. 시작만 있고 종료가 없는 판은 미완료 추정이며 실패와 합치지 않는다. 정확한 판별 이탈 분석은 BigQuery에서 `attempt_id`를 기준으로 시작/종료/명시적 그만두기를 연결하고 관찰 기간을 정해서 계산한다. GA 탐색의 사용자 퍼널과 판별 완료율은 다른 지표다. 광고 차단 등으로 수집된 사용자는 실제 방문자보다 적을 수 있다.

## GA에서 추가로 등록할 항목

관리 → 데이터 표시 → 맞춤 정의에서 이벤트 범위 측정기준으로 `level_name`, `end_reason`, `start_source`, `ruleset`, `report_result`, `help_type`를 등록한다. 이미 같은 의미의 기본 측정기준이 제공되면 그것을 사용한다.

맞춤 측정항목에는 `elapsed_seconds`(초), `false_report_count`, `help_late_count`, `overobserve_count`, `missed_count`, `caught_count`, `served_count`, `inspection_count`를 등록한다. 누적 값은 `level_end`로 필터링해 비교한다. 모든 진행 이벤트를 합산하면 중복 집계가 된다. `attempt_id`는 값 종류가 많으므로 맞춤 측정기준으로 등록하지 않고 필요한 경우 내보낸 원시 데이터에서 사용한다.

[맞춤 정의 공식 안내](https://support.google.com/analytics/answer/14240153?hl=ko)

## 검증 상태

- `npm test`: ID 누락/개발 환경 비활성, GA 큐 순서, 차단 시 동작, 성공/실패/재도전/그만두기 구분, 종료 중복 방지 검사 포함.
- `npm run build`: 환경 변수 없는 배포 빌드 검사.
- Chrome 브라우저: 외부 GA 스크립트를 가로채 실제 전송 없이 시작 → 미검거 실패 → 재도전 → 명시적 그만두기를 실행. 시작 2회, 종료 1회, 그만두기 1회와 서로 다른 판 ID, 브라우저 오류 없음을 확인했다.
- 실제 속성 수신과 보고서 구성은 측정 ID 연결 후 **실시간/DebugView**에서 확인해야 한다.
