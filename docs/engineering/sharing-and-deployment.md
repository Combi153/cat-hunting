# 공유와 배포

상태: 운영 기록 · 마지막 기능 배포 확인: 2026-11-18, `d329268`

[문서 홈](../README.md) · [개발 안내](development.md) · [미검증 항목](../quality/open-questions.md)

## 배포 연결

| 항목 | 확인된 값 |
| --- | --- |
| 저장소 | [Combi153/cat-hunting](https://github.com/Combi153/cat-hunting) |
| 반영 브랜치 | `main` |
| 플랫폼 | Vercel, Vite 정적 빌드 |
| 팀 / 프로젝트 | `chanmins-projects` / `cat-hunting` |
| 공개 주소 | https://cat-hunting.vercel.app/ |
| 배포 방식 | GitHub `main` 푸시에 연결된 프로덕션 자동 배포 |

`6c613d0`의 배포가 READY가 된 것과 공개 별칭에 연결된 것을 확인했다. 이는 당시 확인 기록이다. 이후 변경을 배포할 때는 현재 배포 커밋과 상태를 다시 확인한다. 일회성 배포 주소보다 위 공개 주소를 공유·대표 주소로 사용한다.

## 결과 모달·단계별 공유·지연 보상 배포 — 2026-11-18

기능 커밋 `d329268bd5d46b59fad239182b4dd73a367e2dfe`를 main에 푸시했다. Vercel 배포 `dpl_5E52VhTpdMy92Z9B6AhqHTTpYPCK`의 프로덕션 READY·공개 별칭을 확인했고 빌드는 약 7.3초다. 최초 Git 푸시의 HTTP 400 전송 오류 후 요청별 버퍼 설정으로 재시도했으며 원격 SHA 일치를 확인했다.

공개 HTTPS Chrome 360×606에서 버전·HTTP 200, 1.8초 모달·다시보기와 Escape 복귀, 실제 단계 링크 복사·4.9초 무보상/5.1초 3회 지급·재도전·페이지 오류 없음을 확인했다. 공개 결과 URL 10개의 크롤러 메타데이터·JPEG, 수신자의 로비 시작·단계 잠금도 확인했다. 운영 GA는 차단했고 결과는 무작위 배치·제어된 시계로 생성했다. 실제 카카오톡 카드 UI·친구 전달·서버 로그/드레인은 미검증이다.

## 결과 영역 정리 배포 — 2026-11-18

기능 커밋 `132d0ab39d4a91de73919eedadae83afb5ae6b58`을 main에 푸시했다. Vercel 프로덕션 배포 `dpl_7MKkqo7n8Uvii4bBDgW9LPhsuX2o`의 READY와 `cat-hunting.vercel.app` 별칭을 확인했다. 원격 빌드는 약 7.3초다. 공개 Chrome 360×606에서 버전·HTTP 200, 결과·규칙 펼치기, 다시보기 복귀, 실제 링크 복사와 3회 보상, 페이지 오류 없음을 확인했다. 무작위 배치와 제어된 시계를 사용하고 운영 GA 요청을 차단했다. 실기기 공유 앱 전달과 서버 로그·드레인 점검은 수행하지 않았다.

## 분석 확장 배포 — 2026-11-18

분석 기능 `bda0ca4`와 검증 문서 `ff13bc5`를 main에 푸시했다. Vercel `chanmins-projects/cat-hunting` 프로덕션 배포 `dpl_8DMPt9D1FaDcBj689YwF5ZAGhNQu`의 READY와 Git SHA `ff13bc5908453d0d71acb4ec0207294bc4005c0e`, 공개 별칭 `cat-hunting.vercel.app` 연결을 확인했다. 원격 빌드는 약 7.6초다.

공개 HTML·JS HTTP 200, `G-TV3RS6L0MR`, 새 이벤트 이름과 배포 버전을 확인했다. 공개 Chrome 390×844에서 실제 결과·다시보기·공유 자동 복사·배너·재도전을 수행해 GA 큐 생성과 페이지 오류 없음을 확인했다. GA/배너 목적지 요청은 가로채 운영 데이터를 오염시키지 않았다. 실기기 메신저 전달·GA 일반 보고서 실측·서버 런타임 로그/드레인 점검은 수행하지 않았다. 이번 후속 기록은 게임 코드 변경이 없는 문서 갱신이다.

## 결과 공유 배포 — 2026-11-18

공유 기능 커밋 `6882e14`를 `main`에 푸시했다. Vercel `chanmins-projects/cat-hunting` 프로덕션 배포 `dpl_2XG3SPicaLF7pA39UaCUANN8c5zp`의 READY, 대상 커밋과 공개 별칭 `cat-hunting.vercel.app` 연결을 확인했다. 원격 빌드는 약 5.9초였다.

공개 HTML·기존 대표 JPEG가 HTTP 200으로 응답했다. Chrome 390×844 터치 에뮬레이션에서 무작위 1단계를 제어된 시계로 종료하고 결과 공유창 → 실제 클립보드 쓰기·읽기 → 닫기 → 재도전을 확인했다. 복사된 주소는 공개 게임 시작 주소이며 페이지 오류는 없었다. GA 스크립트·수집 요청을 차단해 운영 분석에 테스트 이벤트가 전송되지 않게 했다. 실제 휴대폰 앱 전환·메신저 전송은 미검증이며 런타임 로그·드레인 점검은 수행하지 않았다.

## 임시 광고 배너 배포 — 2026-11-18

사용자가 휴대폰에서 배너 배치를 확인할 수 있도록 `da34e77`을 `main`에 푸시했다. Vercel 프로덕션 배포 `dpl_D5WoR49TrXD5FLpYm4v8YuohMTcV`의 READY와 공개 별칭 연결을 확인했다. 원격 빌드는 약 6.2초였다.

- 공개 HTML과 `/art/cafe-ad-preview.jpg`가 HTTP 200으로 응답하고 이미지는 `image/jpeg`다.
- 공개 주소를 Chrome 390×844 뷰포트에서 열어 시작 화면 배너와 이미지 로딩을 직접 확인했다. 제어된 브라우저 시계로 시작→45초 종료를 진행해 플레이 중 숨김과 결과 배너 표시를 확인했다. 페이지 실행 오류는 없었다.
- 검증 브라우저에서 GA 스크립트·수집 요청을 가로채 운영 분석에 테스트 이벤트가 전송되지 않게 했다. 서버 런타임 로그·드레인 상태 점검을 수행한 것은 아니다.
- 실제 광고망이나 클릭 목적지는 연결하지 않은 시안이다. 실기기 확인은 사용자가 진행한다. [시안 구현과 이미지 생성 기록](banner-preview.md)을 참고한다.

## 링크 미리보기

[최초 HTML](../../index.html)의 head에 정적으로 넣어 JavaScript를 실행하지 않는 크롤러도 읽는다. 클라이언트 JavaScript에서 뒤늦게 태그를 추가하는 방식으로 바꾸지 않는다.

| 정보 | 설정 |
| --- | --- |
| 제목 | 냥이잡기 · 45초 시험 감독 |
| 소개 | 누가 몰래 정답을 보고 있을까요? 시험 감독이 되어 45초 안에 부정행위를 모두 찾아내세요. |
| 대표 이미지 | https://cat-hunting.vercel.app/art/exam-keyart.jpg |
| 이미지 형식·치수 | JPEG, 1672 × 941 |
| 기본 OG | type=website, locale=ko_KR, site_name, title, description, url, image와 대체 설명 |
| X 카드 | summary_large_image, title, description, image와 대체 설명 |
| canonical / og:url | https://cat-hunting.vercel.app/ |

이미지는 기존 교실 표지 일러스트다. 링크 미리보기에 쓸 새 게임 화면이나 실제 카카오톡 카드 스크린샷을 만든 것은 아니다. 공개 페이지와 이미지에 로그인 없이 접근되는지 확인했다.

## 결과 화면의 친구 공유

2026-11-18 최신 요청: 로비·결과의 ‘공유하고 3회 더 받기’는 안내 모달을 먼저 연다. 실제 ‘공유하기’ 버튼에서 `navigator.share({title,text,url})`를 호출한다. 미지원·오류면 결과별 URL을 자동 복사한다. 성공 응답/복사 성공 뒤 화면이 보이는 5초를 기다리면 3회를 지급한다. 숨겨진 시간은 제외하며 취소·실패·수동 주소 선택·대기 닫기·화면 이동에는 지급하지 않는다. 전달 완료 검증은 아니고 OS 응답/복사 성공과 대기 시간 기준이다.

- `src/share-content.js`의 고정 공개 origin을 사용한다. 현재 페이지·미리보기 URL·쿼리·해시·저장 기록·정답 배치는 전달하지 않는다. 공유 이미지의 정보는 현재 단계와 성공/실패뿐이며 도전 횟수는 사용자 선택에 따라 제외했다.
- `/share/stage-N-missed/`, `/share/stage-N-win/`, `/share/complete/`에 총 10개의 정적 HTML·OG/X 메타데이터와 1200×630 JPEG를 제공한다. 5단계 성공은 complete를 사용한다. 이미지 경로는 `/share-images/`다. 링크를 받은 사람은 자신의 기존 진행으로 게임 로비를 연다.
- 링크만 복사해도 결과별 제목·이미지를 읽을 수 있다. 실제 미리보기 표시·크롭·캐시는 대상 앱이 결정하며 이미지 파일 첨부나 카카오 전용 SDK 전송을 구현한 것은 아니다.
- 실제 `share_result`는 안내 버튼이 아니라 실제 OS 공유/복사 시도에서 기록한다. `retry_reward`는 5초 대기를 완료해 지급한 때 기록한다. 취소·오류·수동 복사·늦은 응답의 기존 분류는 유지한다.
- 생성·검증 명령은 [개발 안내](development.md#결과-공유-페이지와-이미지)에 기록했다. `npm run build`가 빌드된 index HTML을 복제하고 결과 메타데이터를 넣으므로 해시된 JS/CSS 경로도 유지한다.

공식 근거 확인: 2026-11-18, [W3C Web Share API](https://www.w3.org/TR/web-share/), [카카오 스크랩 메시지의 Open Graph 처리](https://developers.kakao.com/docs/ko/message-template/common), [미리보기 캐시 안내](https://developers.kakao.com/docs/ko/message-template/faq). 기본 공유의 앱별 전달 내용과 실제 카카오톡 카드 표시는 별도 실기기 검증 대상이다.

## 변경 후 확인

1. `npm run build`가 끝난 `dist/index.html`에 제목·소개·이미지 절대 URL이 있는지 확인한다.
2. 대상 팀·프로젝트·브랜치와 커밋을 확인하고 정상 Git 푸시로 반영한다.
3. 자동 배포가 READY인지, 공개 별칭이 그 커밋을 가리키는지 확인한다.
4. 공개 HTML을 JavaScript 없이 읽고 이미지가 HTTP 200과 JPEG MIME으로 응답하는지 확인한다.
5. 실제 카카오톡 카드 검증은 별도다. 아직 실행하지 않았다면 완료로 기록하지 않는다.

읽기 전용 확인 예시:

```sh
curl -fsSL -A 'facebookexternalhit/1.1;kakaotalk-scrap/1.0' https://cat-hunting.vercel.app/
curl -fsSI https://cat-hunting.vercel.app/art/exam-keyart.jpg
```

도메인을 바꾸면 `src/share-content.js`의 공개 origin과 canonical, `og:url`, OG/X 이미지 URL, 이 문서와 README의 공개 링크를 함께 변경한다. 대표 이미지 자체를 교체할 때는 이미지 URL의 버전도 고려한다.

## 미리보기가 바뀌지 않을 때

[카카오 공유 디버거](https://developers.kakao.com/tool/debugger/sharing)에서 공개 URL의 메타데이터와 캐시를 확인한다. 기존 링크의 정보가 남아 있으면 초기화 후 다시 공유해 본다. 앱·이미지 캐시 때문에 결과가 달라질 수 있으며, 실제 화면 확인 전에는 해결을 단정하지 않는다. [카카오 공식 FAQ](https://developers.kakao.com/docs/ko/message-template/faq)와 [도구 안내](https://developers.kakao.com/docs/ko/tool/common)를 참고한다.

카톡방에 메시지를 자동 전송한 적은 없다. 카드 검증을 위해 메시지를 보내는 작업은 링크 접근 검사와 별개의 작업이다.

## 초기 공유 재도전 보상 — 이후 5초 대기로 변경 (2026-11-18)

아래는 `2653d64` 당시의 즉시 보상 기록이며 현재는 위 안내·5초 대기를 따른다. 당시 로비와 결과에 ‘공유하고 3회 더 받기’를 표시했다. 기본 공유 `resolved` 또는 클립보드 `writeText` 성공 시 콜백으로 별도 재도전 잔액을 3회 늘린다. 하루 여러 번 가능하며 중복 진행 요청·취소·수동 복사 안내에는 보상을 지급하지 않는다. 공유 오류 후 자동 복사가 성공하면 복사 보상 한 번만 지급한다. OS 성공 응답은 친구 전달 완료 증명이 아니다.

한국 자정의 기본 3회 갱신·실패 차감·저장 한계는 [게임 기획](../product/game-design.md#하루-재도전과-공유-보상)을 따른다. DB·로그인·외부 SDK를 추가하지 않는다. 기존 결과 공유 문구와 공개 시작 주소는 유지하고 로비는 일반 도전 문구를 사용한다.


### 재도전 기능 공개 배포 확인

2026-11-18: 기능 커밋 `2653d64916d11ee0d932a714f0e29f6a7f40b652`을 main에 푸시했다. 프로덕션 배포 `dpl_6aWa7PZz8ZsZ5mHPXvYp9KLjG6ri`의 READY와 공개 별칭 `cat-hunting.vercel.app` 연결을 확인했다. 공개 HTTPS Chrome 390×844에서 HTTP 200과 분석 큐의 `build_version=2653d64916d1`을 확인했다. GA 외부 요청을 차단한 채 무작위 배치·제어된 시계로 시간 실패 3회 → 0회 시작 차단 → 다시보기 → 실제 링크 복사 2회로 6회 충전 → 새로고침 후 6회 유지를 검사했다. 페이지 오류는 없었고 외부 앱 전송·실기기 검증은 아니다.


## 결과 카드 공개 배포 확인 (2026-11-18)

기능 커밋 `bdb22947ab598c01997022afde56a3e5474c81ad`을 main에 푸시했다. 배포 `dpl_6wBmNS7b8e7pSf59Nr1d89FvxmqF`의 프로덕션 READY와 공개 별칭 `cat-hunting.vercel.app` 연결을 확인했다. 공개 HTTPS Chrome 360×606에서 무작위 판·제어된 시계로 시간 실패 → 접힌 결과 → 카드 펼치기 → 다시보기/결과 복귀 → 실제 링크 복사·3회 보상 → 카드 접기를 수행했다. HTTP 200·배포 버전·페이지 오류 없음 확인. 운영 GA 요청은 차단했으며 실제 휴대폰 인앱 전송·스크롤 검증은 아니다.
