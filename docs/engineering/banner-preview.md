# 생각하는 공간 광고 배너

2026-11-18 · 사용자 제공 배너로 기존 카페 시안을 교체했다. 광고망 SDK 없이 홈페이지로 연결하는 직접 배너다.

- 로비의 시작 버튼 아래와 결과의 게임·공유 버튼 아래에 표시한다. 플레이·관찰·일시정지·다시 보기 중에는 표시하지 않는다.
- 2172×724 원본의 3:1 비율을 유지한다. 최대 너비 320px, 높이 약 107px이며 좁은 컨테이너에서는 비율을 유지해 함께 줄어든다. 기존 50px 고정 높이·마스크·겹친 카페 문구는 제거했다.
- `광고`로 표시하고 배너 전체가 하나의 링크다. 새 탭으로 열어 게임 상태를 유지하며 Tab/Enter와 포커스 표시를 지원한다.
- 목적지: `https://thinkplace.co.kr/`. 최초 인스타그램 연결 제안은 사용자의 후속 요청으로 대체했다.
- UTM: `utm_source=cat_hunting`, `utm_medium=banner`, `utm_campaign=thinkplace`, `utm_content=lobby` 또는 `result`. 홈페이지 측 분석에서 유입 위치를 구별하기 위한 값이다. 게임에 별도 클릭 이벤트나 광고 추적 스크립트는 추가하지 않았다.
- 이미지: [WebP](../../public/thinkplace/thinkplace-banner.webp) 우선, [PNG](../../public/thinkplace/thinkplace-banner.png) 대체. 사용자 키트의 원본을 그대로 사용하며 이미지 안 문구도 유지한다.
- 구현: [ui.js](../../src/ui.js)의 `sponsorBanner(placement)`, [style.css](../../src/style.css)의 `.sponsor-banner`와 `.sponsor-banner-link`.
- 로비와 결과 패널의 기존 스크롤을 유지한다. 검증 조건·한계는 [현재 검증](../quality/current-review.md)에 기록한다.

## 이전 카페 시안 — 교체됨

아래는 교체 전 카페 시안의 기록이다. 현재 화면·에셋에는 사용하지 않는다.

- 시작 화면의 시작 버튼 아래, 결과 화면의 처음으로 버튼 아래에 표시한다. 최근 기록 안내는 2026-11-18 문구 정리에서 제거했다.
- 게임 진행·관찰·일시정지 중에는 표시하지 않는다.
- 기본 크기는 320×50px이며 좁은 컨테이너에서는 폭만 줄어든다. 실제 광고망 도입 시 해당 광고 단위의 반응형 규칙에 맞게 교체해야 한다.
- `광고 · 미리보기`로 구분한다. 링크·클릭 동작·광고 스크립트·광고 추적은 없다.
- 로비는 기존 세로 스크롤을 사용하고, 결과 패널도 작은 화면에서 스크롤할 수 있게 했다.
- 구현: [ui.js](../../src/ui.js)의 `adPreview()`, [style.css](../../src/style.css)의 `.ad-preview`.
- 이미지: [당시 cafe-ad-preview.jpg](https://github.com/Combi153/cat-hunting/blob/da34e77/public/art/cafe-ad-preview.jpg), 900×300px, 약 28KB. 문구는 HTML로 표시한다.

### 당시 이미지 생성

내장 `image_gen` 도구로 생성하고 JPEG로 축소·압축했다. 가상의 카페이며 실제 광고주가 아니다.

사용한 프롬프트:

> Use case: ads-marketing. Create a single polished fictional cat cafe banner illustration for a Korean mobile clay-style classroom game. Wide horizontal composition, 3:1 aspect ratio. Charming handmade ivory clay cat holding a tiny terracotta coffee cup at the RIGHT edge, small croissant beside it, on a warm pale butter-yellow seamless studio background. Reserve the LEFT two-thirds as clean pale yellow negative space for separately rendered Korean text. Soft tactile clay, rounded miniature forms, warm natural shadows, restrained sage-green accent, playful but premium. Keep all important art within the central horizontal half so it also crops well to a slim 6.4:1 mobile banner. No text, no lettering, no real brands, no watermark, no border. This is one banner artwork, not a website mockup.

### 당시 확인

- `npm test`: 25개 통과.
- `npm run build`: 성공. 기존 Three.js 번들 크기 경고가 남는다.
- `TEST_BASE_URL=http://127.0.0.1:5201 PLAYWRIGHT_CHANNEL=chrome npm run test:campaign`: 다섯 단계 성공·해제·재도전·저장 및 페이지 오류 없음 확인.
- Playwright로 실제 시작/진행/실패 결과 화면 확인. 390×844, 320×568, 568×320, 1280×800에서 배너 배치와 가로 넘침 없음 확인. 가로 화면에서는 결과 패널을 스크롤해 배너에 접근할 수 있다. 진행 화면에는 배너가 표시되지 않는다.
- 최초 시안은 로컬에서 확인했다. 이후 사용자의 배포 요청으로 `da34e77`을 Vercel 프로덕션에 배포하고 공개 주소에서도 확인했다. [배포 기록](sharing-and-deployment.md#임시-광고-배너-배포--2026-11-18)을 참고한다.
