# 공유와 배포

상태: 운영 기록 · 마지막 기능 배포 확인: 2026-11-18, `da34e77`

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
| 소개 | 평범한 손짓일까, 몰래 보는 정답일까? 45초 안에 숨은 부정행위를 찾아보세요. |
| 대표 이미지 | https://cat-hunting.vercel.app/art/exam-keyart.jpg |
| 이미지 형식·치수 | JPEG, 1672 × 941 |
| 기본 OG | type=website, locale=ko_KR, site_name, title, description, url, image와 대체 설명 |
| X 카드 | summary_large_image, title, description, image와 대체 설명 |
| canonical / og:url | https://cat-hunting.vercel.app/ |

이미지는 기존 교실 표지 일러스트다. 링크 미리보기에 쓸 새 게임 화면이나 실제 카카오톡 카드 스크린샷을 만든 것은 아니다. 공개 페이지와 이미지에 로그인 없이 접근되는지 확인했다.

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

도메인을 바꾸면 canonical, `og:url`, OG/X 이미지 URL, 이 문서와 README의 공개 링크를 함께 변경한다. 대표 이미지 자체를 교체할 때는 이미지 URL의 버전도 고려한다.

## 미리보기가 바뀌지 않을 때

[카카오 공유 디버거](https://developers.kakao.com/tool/debugger/sharing)에서 공개 URL의 메타데이터와 캐시를 확인한다. 기존 링크의 정보가 남아 있으면 초기화 후 다시 공유해 본다. 앱·이미지 캐시 때문에 결과가 달라질 수 있으며, 실제 화면 확인 전에는 해결을 단정하지 않는다. [카카오 공식 FAQ](https://developers.kakao.com/docs/ko/message-template/faq)와 [도구 안내](https://developers.kakao.com/docs/ko/tool/common)를 참고한다.

카톡방에 메시지를 자동 전송한 적은 없다. 카드 검증을 위해 메시지를 보내는 작업은 링크 접근 검사와 별개의 작업이다.
