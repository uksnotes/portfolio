# lib — 실제 기능 처리

| 묶음 | 주요 파일 |
| --- | --- |
| 로그인·암호화·저장 | `server.ts`, `db.ts`(Supabase Postgres), `client-session.ts` |
| 가입·차단·사용자 로그 | `accounts.ts`, `supabase-auth.ts`, `user-logs.ts` |
| 공통 AI 선택·호출 | `ai-keys.ts`, `ai-provider.ts`, `ai-gateway.ts`, `sol.ts` |
| AI 팀 작업 상태 | `ai-team.ts`, `team-jobs.ts` |
| 여행·리서치 | `research-jobs.ts`, `travel-data.ts`, `travel-itinerary.ts`, `travel-route.ts` |
| 지도·주소 | `itinerary-map.ts` |
| 항공권 수집·비교 | `kiwi-fares.ts`, `flight-fares.ts`, `flight-search.ts`, `flight-airports.ts` |
| 아파트·실거래·매물 | `apartments.ts`, `apartment-data.ts`, `asil-trades.ts`, `naver-estate.ts`, `royal-search.ts` |
| 시세·뉴스·투자 분석 | `providers.ts`, `news-summary.ts`, `analysis.ts`, `market-history.ts`, `kospi-ranking.ts` |

화면에서 받은 값을 그대로 믿지 않고 여기서 조건·출처를 검사합니다. 여행 결과는 저장 후 다시 사용하며, 식당 변경은 추가 AI 검색 없이 동선만 계산합니다.
