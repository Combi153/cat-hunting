# 개발 안내

상태: 현재 기준 · 코드 버전은 항목별 기록 참조 · 정리일: 2026-11-18

[문서 홈](../README.md) · [게임 기획](../product/game-design.md) · [공유와 배포](sharing-and-deployment.md)

## 실행

저장소 루트에서 실행한다. 현재 구성은 JavaScript ES modules, Three.js 0.180.0, Vite 6.4.1, Playwright 1.58.2다. 정확한 설치 버전은 [package-lock.json](../../package-lock.json)을 따른다.

```sh
npm ci
npm run dev
```

기본 개발 주소는 `http://127.0.0.1:5173`이다. 3D 실행에는 WebGL 2 지원이 필요하다. 표지·모델·글꼴·음향은 게임 내 로컬 자원과 코드에서 제공한다.

```sh
npm run build
npm run preview
```

휴대폰 실기기는 같은 Wi-Fi에서 `npm run phone`을 실행하고 터미널에 나온 Network 주소로 접속한다. 이 명령은 빌드 후 `0.0.0.0:4173`에서 제공한다.

## 코드 지도

| 파일 | 역할 |
| --- | --- |
| [main.js](../../src/main.js) | 시작/진행/종료, 입력, 일시정지, 저장, 화면 갱신, 규칙과 3D 연결 |
| [session.js](../../src/session.js) | 시험 시간, 좌석·사건 배정, 행동 주기, 관찰 문구, 신고·민원·승패 |
| [stages.js](../../src/stages.js) | 다섯 단계 수치와 단계 해제 |
| [world.js](../../src/world.js) | Three.js 장면·카메라, 감독관 이동과 도움 진행, 캐릭터 그리기 |
| [walkways.js](../../src/walkways.js) | 가구 장애물, 통과 가능한 경로, 교탁 뒤 복귀 위치 |
| [ui.js](../../src/ui.js), [style.css](../../src/style.css) | 로비·HUD·관찰·결과 문구와 반응형 배치 |
| [characters.js](../../src/art/characters.js) | 학생·감독관 리그, 소품, 표정, 행동 애니메이션 |
| [classroom.js](../../src/art/classroom.js), [dimensions.js](../../src/art/dimensions.js) | 교실·커튼과 책상 치수 기준 |
| [sound.js](../../src/sound.js) | 종·신고·도움·승패 음향 |
| [retries.js](../../src/retries.js) | 한국 날짜·하루 재도전 잔액, 별도 로컬 저장과 메모리 대체 |
| [share.js](../../src/share.js) | 로비·결과의 기본 공유, 링크 복사·대체 안내와 성공 보상 콜백 |
| [index.html](../../index.html) | 최초 문서와 공유 크롤러가 읽는 메타데이터 |

## 상태와 연결

`main.js`는 `home → running → ended` 화면 흐름을 관리한다. `Exam`이 게임 규칙과 시간을 갖고 `Room`이 위치·이동·도움 연출을 맡는다. 이동이 끝나기 전에는 신고·도움 버튼을 열지 않으며, 복귀·이동 중에는 새 학생 선택을 허용해 현재 위치에서 경로를 교체한다. `Room.select()`는 유효한 경로를 찾은 뒤 복귀 상태를 해제하며, 도움 행동 진행 중에만 학생 선택을 막는다. 도움 완료 시점과 시험 종료 시점은 연출과 규칙 양쪽을 함께 확인해야 한다.

결과의 `showResult()`는 캐릭터·대사를 먼저 렌더링하고 1.8초 타이머 후 네이티브 `#result-dialog.showModal()`을 호출한다. 새 시험·로비 이동·다시보기에서 타이머를 해제하고, 다시보기 복귀는 즉시 모달을 연다. 결과 캔버스는 세로 제목 100px·대사 110px를 제외한 공간을 사용한다. 가로는 왼쪽 캐릭터·오른쪽 대사이며 결과 모달은 중앙에 뜬다. Escape로 다시보기를 끝낼 때 기본 동작을 막아 같은 키가 새 모달까지 닫지 않게 한다.

결과에서 공유할 때는 결과 모달을 닫고 공유만 연다. 공유를 닫으면 ended 상태에서 결과 모달을 다시 연다.

실패 후 다시 보기는 `ended` 안의 표시 상태다. `Room.review()`/`closeReview()`가 대상과 재생 시계만 바꾸고 `Exam`은 진행하지 않는다. 적발 때 축소·퇴실한 학생의 표시 크기와 표정을 복원해 같은 소품·애니메이션을 재현한다. `ending.reviewIndex`가 있을 때 관찰 카메라를 사용하고 `.reviewing` 레이아웃에서 캔버스와 버튼 영역을 분리한다. 결과 복귀와 재도전 시 재생 상태를 해제한다. 다시 보기는 저장·진행을 바꾸지 않으며 열기·소품별 관찰 시간을 분석 이벤트로 기록한다.

렌더링되는 포즈는 `Exam.behavior()`가 정하지만, 관찰 문구는 `Exam.observationText()`를 거친다. `behavior.text`의 내부 증거 설명을 그대로 UI에 노출하면 정상·부정행위의 동일 문구라는 현재 결정을 깨뜨릴 수 있다.

저장 키는 `nyangijapgi.v2`다. 최근 10판, 열린 단계, 전체 완료, 음소거를 저장한다. 결과에는 `version: 2`, `ruleset: 4`, `duration: 45`와 단계·배치·승패·신고/민원 기록 등이 남는다. 이전 v1 저장을 지우지 않고 음소거 설정을 읽으며, 이전 기록만으로 새 단계를 자동 해제하지 않는다. 저장이 불가능한 환경에서도 플레이는 계속된다. 재도전은 별도 `nyangijapgi.retries.v1`의 `{day, remaining}`을 사용한다. 한국 시간 자정에 3회로 초기화하고 실패 결과에서만 차감한다. 공유 안내의 실제 공유/복사 성공 후 화면이 보이는 동안 내부 5초 대기를 완료하면 3회를 더한다. UI에는 초 숫자나 카운트다운을 표시하지 않는다. 네이티브 공유는 URL 하나만 보내 대상 앱의 text/url 결합을 피한다. `src/share.js`는 중복·늦은 콜백과 대기 타이머를 generation으로 무효화하며 안내 닫기·화면 이동은 대기를 취소한다. 저장 실패 시 메모리에서 유지하며, 시작 전과 3D 모듈 로드 후에 잔액을 확인한다. 로비·결과는 1초 주기, 포커스/탭 복귀와 storage 이벤트로 갱신한다. 서버 원자성이나 사람별 식별을 제공하지 않는다.

## 검증 명령

```sh
npm test
npm run build
```

개발 서버를 켠 상태에서 별도 터미널로 실행한다. 아래 예시는 5173 포트를 사용한다.

```sh
TEST_BASE_URL=http://127.0.0.1:5173 PLAYWRIGHT_CHANNEL=chrome npm run test:browser
TEST_BASE_URL=http://127.0.0.1:5173 PLAYWRIGHT_CHANNEL=chrome npm run test:campaign
TEST_BASE_URL=http://127.0.0.1:5173 PLAYWRIGHT_CHANNEL=chrome npm run test:assets
TEST_BASE_URL=http://127.0.0.1:5173 PLAYWRIGHT_CHANNEL=chrome npm run test:review
TEST_BASE_URL=http://127.0.0.1:5173 PLAYWRIGHT_CHANNEL=chrome npm run test:share
TEST_BASE_URL=http://127.0.0.1:5173 PLAYWRIGHT_CHANNEL=chrome npm run test:analytics
TEST_BASE_URL=http://127.0.0.1:5173 PLAYWRIGHT_CHANNEL=chrome npm run test:retries
TEST_BASE_URL=http://127.0.0.1:5173 PLAYWRIGHT_CHANNEL=chrome npm run test:results
```

설치된 Chrome 대신 Playwright Chromium을 쓰려면 `npx playwright install chromium` 후 `PLAYWRIGHT_CHANNEL`을 생략한다. 개발 서버 포트가 달라졌다면 `TEST_BASE_URL`도 맞춘다. 이 스크립트는 개발 모듈의 배치를 고정하는 라우트를 사용하므로 프로덕션 번들 검증 명령으로 사용하지 않는다.

| 검사 | 확인 범위 |
| --- | --- |
| `npm test` | 규칙·단계·행동·관절·소품·경로·왕복과 물리적 시간 가능성 |
| `test:browser` | 터치 관찰·신고·도움·복귀/이동 중 경로 전환·승패·음향·일시정지·화면 크기 |
| `test:campaign` | 정답을 아는 고정 배치에서 다섯 단계 진행·저장·재도전 |
| `test:assets` | 실제 행동 주기가 나타날 때 접근해 새 소품·일상 행동 캡처 |
| `test:review` | 실패 후 여섯 행동 재생·소품 복귀·순환, 결과 불변, 화면 크기, 모두 적발한 생명 패배·재도전 |
| `test:share` | 단계별 URL, 안내만 열기 무보상, 실제 공유/복사 후 5초 대기, 취소·실패·수동 복사·중복/지연 응답, 외부 앱 체류 중 대기 중지·복귀, 실제 클립보드, 네 화면 크기 |
| `test:retries` | 성공 불차감·실패 3회·0회 도전의 공유 안내·다시보기 허용, 지연 보상 후 재도전, 새로고침·반복 공유·그만두기·한국 자정 |
| `test:results` | 다섯 결과 유형·여섯 화면 크기, 1.8초 자동 모달, 초기 캐릭터 얼굴 경계, 강조 다시보기·44px 버튼 접근, Escape/키보드와 다시보기 복귀·저장 불변 |
| `npm run build` | 배포용 정적 파일 생성. 게임 플레이 검증을 대신하지 않음 |

자동 캡처는 Git에서 제외된 `test-results/`에 나온다. 검토한 증거만 버전별 `docs/playtest/`에 복사하고 출처를 기록한다. 3D 검토에서는 스크린샷과 실제 동작을 함께 본다. 브라우저 시계를 멈춘 검증에서는 시작 후 첫 프레임이 그려진 뒤 좌석을 눌러야 하며, 이동은 버튼이 준비될 때까지 시간을 진행한다. 실행 중 소스를 바꾸면 Vite 갱신으로 게임이 초기화될 수 있다.

## 결과 공유 페이지와 이미지

`src/share-content.js`가 안전한 공개 URL·문구·이미지 이름의 공통 원본이다. `npm run build`는 Vite 빌드 후 `scripts/build-share-pages.mjs`로 열 개의 `/share/.../index.html`을 만든다. JS를 실행하지 않는 크롤러도 정적 OG/X 메타데이터를 읽으며, 브라우저는 같은 게임 번들을 로드한다. 공유된 기록으로 수신자 진행을 해제하지 않는다.

`public/share-images/`의 JPEG는 `scripts/share-card.html`에서 실제 게임 모델을 렌더링한 결과다. Vite 개발 서버를 켠 뒤 `TEST_BASE_URL=http://127.0.0.1:5173 npm run render:share`로 다시 만들 수 있다. 생성 시 Playwright와 설치된 Chrome을 사용하며 배포 빌드에는 브라우저가 필요하지 않다. 생성한 이미지는 검토 후 함께 커밋한다.

빌드 뒤 미리보기 서버를 켜고 `TEST_BASE_URL=http://127.0.0.1:4173 PLAYWRIGHT_CHANNEL=chrome npm run test:share-pages`로 크롤러 HTML·이미지 10종과 수신자 게임 시작을 확인한다. 이 검사는 모듈 대역을 쓰지 않아 공개 HTTPS에서도 운영 GA를 차단한 채 수행할 수 있다.

## 작업 마무리

이 대화의 작업 대상은 `main`이다. 변경 전 작업 트리와 원격 상태를 확인하고, 변경에 맞는 검증을 수행한 다음 gitmoji 커밋으로 반영한다. 사용자가 요청한 커밋·푸시 흐름과 앞으로 새로 주는 지시를 따른다. 관련 현재 문서와 결정·검증 기록을 함께 갱신하고, 미확인 부분을 성공한 것처럼 기록하지 않는다.

문서만 수정한 경우에는 문서 링크와 코드 대비 사실 관계를 확인한다. 게임 동작이 바뀌지 않았다면 이전 플레이테스트를 이번 문서 작업에서 다시 수행한 것으로 적지 않는다.
