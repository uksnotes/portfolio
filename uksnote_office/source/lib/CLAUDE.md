# source/lib/ — 서버/계산 로직

route.ts와 화면에서 import하는 비즈니스 모듈. 압축 스타일이므로 `grep -n "export"`로 함수 위치부터 확인.

| 영역 | 파일 |
|---|---|
| 공통 서버 유틸 (db, setting, sha, passwordHash, response, records, cache) | `server.ts` — `cloudflare:workers`의 `env` 사용 (로컬은 `runtime/environment.ts`로 대체됨) |
| 사용자 식별·세션 | `identity.ts`, `client-session.ts` |
| 시세·뉴스 수집 | `providers.ts`, `public-pages.ts`, `naver-chart.ts` |
| 뉴스 요약·분류 | `news-summary.ts`, `news-categories.ts` |
| 보유 종목 분석 | `analysis.ts`(가중치), `history.ts`(CSV 파싱), `market-history.ts`(1년/5년 시세) |
| 코스피200 | `kospi-data.ts`(점수·매수/손절/목표가 계산), `kospi-ranking.ts`(수집·진행 상태) |
| AI 팀 | `ai-team.ts`(모델 목록·역할), `ai-provider.ts`(키 저장·OpenAI/Claude 호출), `team-jobs.ts`(업무 상태 머신), `sol.ts` |
| 부동산 | `apartments.ts`(API 진입), `apartment-data.ts`(로열동·층 계산), `asil-trades.ts`(실거래) |
| 기타 | `movement.ts`(3D 이동), `mail.ts`, `utils.ts`(cn) |

## 알아둘 점
- 코스피200 가중치: 추세 30 / 모멘텀 25 / 거래량 20 / 가격 위치 15 / 변동성 10 (`kospi-data.ts`). 완료된 일봉만 사용, 부족·오래된 데이터는 보류.
- 외부 사이트(공개 페이지) 스크래핑 기반 — 형식이 바뀌면 `providers.ts`/`kospi-ranking.ts`/`market-history.ts`/`apartments.ts` 파서를 수정. 실패 시 임의 값으로 채우지 않는다.
- API 키는 `secrets` 테이블에 `OFFICE_ENCRYPTION_KEY`로 암호화 저장.
- 모델 ID 변경은 `ai-team.ts`.
- 수정 후 최상위에서 `npm run build`.
