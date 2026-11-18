# 냥이잡기

점토 교실의 12명을 관찰하는 모바일 3D 시험 감독 게임. 45초씩 다섯 번의 시험에서 평범한 손짓과 숨은 부정행위를 구별한다. 학생을 탭해 다가가고, 확신이 들면 신고하며, 도움을 기다리는 학생도 돌본다.

[게임 플레이](https://cat-hunting.vercel.app/) · [문서 홈과 빠른 인계](docs/README.md) · [대화와 결정 이력](docs/decisions/conversation-log.md)

## 시작하기

```sh
npm ci
npm run dev
```

기본 개발 주소는 `http://127.0.0.1:5173`이다. WebGL 2 지원 브라우저에서 실행한다. 같은 Wi-Fi의 휴대폰에서는 `npm run phone`을 실행하고 터미널의 Network 주소로 접속한다.

## 문서

| 목적 | 문서 |
| --- | --- |
| 현재 규칙과 단계별 밸런스 | [게임 기획](docs/product/game-design.md) |
| 점토 아트·행동·새 에셋과 소재 검토 | [아트 방향](docs/product/art-direction.md) |
| 사용자 요청, 변경 이유, 취소된 결정 | [대화와 결정 이력](docs/decisions/conversation-log.md) |
| 코드 구조·로컬 실행·테스트 | [개발 안내](docs/engineering/development.md) |
| 공개 주소·Vercel·카톡 미리보기 | [공유와 배포](docs/engineering/sharing-and-deployment.md) |
| 방문자·단계별 실패·GA4 설정 | [플레이 분석](docs/engineering/analytics.md) |
| 개발 루브릭·검증 증거 | [현재 검증](docs/quality/current-review.md) |
| 다음에 확인할 경험·환경 | [미검증 항목](docs/quality/open-questions.md) |

초기 점수제와 90초 버전은 [문서 홈의 보관 자료](docs/README.md)에서 찾을 수 있다. 현재 사양과 과거 기록을 구분해 읽는다.

## 검증

```sh
npm test
npm run build
```

개발 서버에서 `npm run test:browser`, `npm run test:campaign`, `npm run test:assets`로 터치·캠페인·에셋을 검사한다. 서버 주소와 브라우저 선택은 [개발 안내](docs/engineering/development.md)를 따른다.

표지 일러스트는 프로젝트용으로 생성했다. Jua 글꼴은 [SIL Open Font License](public/fonts/OFL-Jua.txt)로 배포된다.
