# 기능별로 어디를 수정하나요?

| 수정하려는 내용 | 화면 | 실제 처리 |
| --- | --- | --- |
| 이름·메뉴·홈 | `app/office.tsx`, `app/layout.tsx` | — |
| 3D 공간·캐릭터 | `app/scene.tsx` | `lib/movement.ts` |
| 공통 API 키 | `app/api-key-settings.tsx` | `lib/ai-keys.ts`, `lib/ai-provider.ts` |
| AI 팀 업무 | `app/team-office.tsx` | `lib/team-jobs.ts`, `lib/sol.ts`, `lib/ai-gateway.ts` |
| 여행 검색 조건 | `app/travel-office.tsx` | `lib/research-jobs.ts`, `lib/travel-data.ts` |
| 일정표·맛집 탭 | `app/travel-itinerary-results.tsx` | `lib/travel-itinerary.ts` |
| 1~5일차 표·맛집 리스트 | `app/travel-itinerary-overview.tsx` | `mode`로 두 화면 구분 |
| 지도·핀·주소 확인 | `app/travel-itinerary-map.tsx` | `lib/itinerary-map.ts` |
| 항공권 | `app/flight-results.tsx`, `app/airport-picker.tsx` | `lib/kiwi-fares.ts`, `lib/flight-fares.ts`, `lib/flight-search.ts` |
| 부동산 | `app/apartment-office.tsx`, `app/royal-ranking.tsx` | `lib/apartments.ts`, `lib/royal-search.ts` |
| 주식·차트·랭킹 | `app/stock-analysis.tsx`, `app/kospi-ranking.tsx` | `lib/analysis.ts`, `lib/market-history.ts`, `lib/kospi-ranking.ts` |
| 뉴스 수집·요약 | `app/office.tsx` | `lib/providers.ts`, `lib/news-summary.ts` |
| 로그인·가입·데이터 저장 | `app/office.tsx`, `app/api/[action]/route.ts` | `lib/accounts.ts`, `lib/ai-keys.ts`(서버 AI 키 관리자 전용), `lib/server.ts`, `lib/db.ts`, `lib/supabase-auth.ts` |
| 사용자 차단·로그·비밀번호 재설정·기능 사용량 | `app/admin/admin-console.tsx` | `lib/accounts.ts`, `lib/user-logs.ts`, `lib/usage.ts`, `supabase/migrations/` |

모양만 바꾸려면 `app/`와 `app/globals.css`, 계산·검색 규칙을 바꾸려면 `lib/`를 먼저 확인하세요.
