# 개발 안내

상태: 현재 기준 · 코드 기준: `6c613d0` · 정리일: 2026-11-18

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
| [index.html](../../index.html) | 최초 문서와 공유 크롤러가 읽는 메타데이터 |

## 상태와 연결

`main.js`는 `home → running → ended` 화면 흐름을 관리한다. `Exam`이 게임 규칙과 시간을 갖고 `Room`이 위치·이동·도움 연출을 맡는다. 이동이 끝나기 전에는 신고·도움 버튼을 열지 않으며, 복귀·이동 중에는 새 학생 선택을 허용해 현재 위치에서 경로를 교체한다. `Room.select()`는 유효한 경로를 찾은 뒤 복귀 상태를 해제하며, 도움 행동 진행 중에만 학생 선택을 막는다. 도움 완료 시점과 시험 종료 시점은 연출과 규칙 양쪽을 함께 확인해야 한다.

실패 후 다시 보기는 `ended` 안의 표시 상태다. `Room.review()`/`closeReview()`가 대상과 재생 시계만 바꾸고 `Exam`은 진행하지 않는다. 적발 때 축소·퇴실한 학생의 표시 크기와 표정을 복원해 같은 소품·애니메이션을 재현한다. `ending.reviewIndex`가 있을 때 관찰 카메라를 사용하고 `.reviewing` 레이아웃에서 캔버스와 버튼 영역을 분리한다. 결과 복귀와 재도전 시 재생 상태를 해제한다. 다시 보기 자체는 저장하거나 분석 이벤트를 추가하지 않는다.

렌더링되는 포즈는 `Exam.behavior()`가 정하지만, 관찰 문구는 `Exam.observationText()`를 거친다. `behavior.text`의 내부 증거 설명을 그대로 UI에 노출하면 정상·부정행위의 동일 문구라는 현재 결정을 깨뜨릴 수 있다.

저장 키는 `nyangijapgi.v2`다. 최근 10판, 열린 단계, 전체 완료, 음소거를 저장한다. 결과에는 `version: 2`, `ruleset: 4`, `duration: 45`와 단계·배치·승패·신고/민원 기록 등이 남는다. 이전 v1 저장을 지우지 않고 음소거 설정을 읽으며, 이전 기록만으로 새 단계를 자동 해제하지 않는다. 저장이 불가능한 환경에서도 플레이는 계속된다.

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
```

설치된 Chrome 대신 Playwright Chromium을 쓰려면 `npx playwright install chromium` 후 `PLAYWRIGHT_CHANNEL`을 생략한다. 개발 서버 포트가 달라졌다면 `TEST_BASE_URL`도 맞춘다. 이 스크립트는 개발 모듈의 배치를 고정하는 라우트를 사용하므로 프로덕션 번들 검증 명령으로 사용하지 않는다.

| 검사 | 확인 범위 |
| --- | --- |
| `npm test` | 규칙·단계·행동·관절·소품·경로·왕복과 물리적 시간 가능성 |
| `test:browser` | 터치 관찰·신고·도움·복귀/이동 중 경로 전환·승패·음향·일시정지·화면 크기 |
| `test:campaign` | 정답을 아는 고정 배치에서 다섯 단계 진행·저장·재도전 |
| `test:assets` | 실제 행동 주기가 나타날 때 접근해 새 소품·일상 행동 캡처 |
| `test:review` | 실패 후 여섯 행동 재생·소품 복귀·순환, 결과 불변, 화면 크기, 모두 적발한 생명 패배·재도전 |
| `npm run build` | 배포용 정적 파일 생성. 게임 플레이 검증을 대신하지 않음 |

자동 캡처는 Git에서 제외된 `test-results/`에 나온다. 검토한 증거만 버전별 `docs/playtest/`에 복사하고 출처를 기록한다. 3D 검토에서는 스크린샷과 실제 동작을 함께 본다. 브라우저 시계를 멈춘 검증에서는 시작 후 첫 프레임이 그려진 뒤 좌석을 눌러야 하며, 이동은 버튼이 준비될 때까지 시간을 진행한다. 실행 중 소스를 바꾸면 Vite 갱신으로 게임이 초기화될 수 있다.

## 작업 마무리

이 대화의 작업 대상은 `main`이다. 변경 전 작업 트리와 원격 상태를 확인하고, 변경에 맞는 검증을 수행한 다음 gitmoji 커밋으로 반영한다. 사용자가 요청한 커밋·푸시 흐름과 앞으로 새로 주는 지시를 따른다. 관련 현재 문서와 결정·검증 기록을 함께 갱신하고, 미확인 부분을 성공한 것처럼 기록하지 않는다.

문서만 수정한 경우에는 문서 링크와 코드 대비 사실 관계를 확인한다. 게임 동작이 바뀌지 않았다면 이전 플레이테스트를 이번 문서 작업에서 다시 수행한 것으로 적지 않는다.
