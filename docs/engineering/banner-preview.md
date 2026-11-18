# 임시 광고 배너

2026-11-18 · 실제 광고망에 연결하지 않은 배치 확인용 시안.

- 시작 화면의 시작 버튼 아래, 결과 화면의 처음으로 버튼 아래에 표시한다. 최근 기록 안내는 2026-11-18 문구 정리에서 제거했다.
- 게임 진행·관찰·일시정지 중에는 표시하지 않는다.
- 기본 크기는 320×50px이며 좁은 컨테이너에서는 폭만 줄어든다. 실제 광고망 도입 시 해당 광고 단위의 반응형 규칙에 맞게 교체해야 한다.
- `광고 · 미리보기`로 구분한다. 링크·클릭 동작·광고 스크립트·광고 추적은 없다.
- 로비는 기존 세로 스크롤을 사용하고, 결과 패널도 작은 화면에서 스크롤할 수 있게 했다.
- 구현: [ui.js](../../src/ui.js)의 `adPreview()`, [style.css](../../src/style.css)의 `.ad-preview`.
- 이미지: [cafe-ad-preview.jpg](../../public/art/cafe-ad-preview.jpg), 900×300px, 약 28KB. 문구는 HTML로 표시한다.

## 이미지 생성

내장 `image_gen` 도구로 생성하고 JPEG로 축소·압축했다. 가상의 카페이며 실제 광고주가 아니다.

사용한 프롬프트:

> Use case: ads-marketing. Create a single polished fictional cat cafe banner illustration for a Korean mobile clay-style classroom game. Wide horizontal composition, 3:1 aspect ratio. Charming handmade ivory clay cat holding a tiny terracotta coffee cup at the RIGHT edge, small croissant beside it, on a warm pale butter-yellow seamless studio background. Reserve the LEFT two-thirds as clean pale yellow negative space for separately rendered Korean text. Soft tactile clay, rounded miniature forms, warm natural shadows, restrained sage-green accent, playful but premium. Keep all important art within the central horizontal half so it also crops well to a slim 6.4:1 mobile banner. No text, no lettering, no real brands, no watermark, no border. This is one banner artwork, not a website mockup.

## 확인

- `npm test`: 25개 통과.
- `npm run build`: 성공. 기존 Three.js 번들 크기 경고가 남는다.
- `TEST_BASE_URL=http://127.0.0.1:5201 PLAYWRIGHT_CHANNEL=chrome npm run test:campaign`: 다섯 단계 성공·해제·재도전·저장 및 페이지 오류 없음 확인.
- Playwright로 실제 시작/진행/실패 결과 화면 확인. 390×844, 320×568, 568×320, 1280×800에서 배너 배치와 가로 넘침 없음 확인. 가로 화면에서는 결과 패널을 스크롤해 배너에 접근할 수 있다. 진행 화면에는 배너가 표시되지 않는다.
- 최초 시안은 로컬에서 확인했다. 이후 사용자의 배포 요청으로 `da34e77`을 Vercel 프로덕션에 배포하고 공개 주소에서도 확인했다. [배포 기록](sharing-and-deployment.md#임시-광고-배너-배포--2026-11-18)을 참고한다.
