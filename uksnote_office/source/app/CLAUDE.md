# source/app/ — 화면(React)과 API 라우터

코드가 한 줄 압축 스타일(파일당 수십 줄, 수십 KB)이므로 `grep -n`으로 위치를 찾은 뒤 부분 확인.

| 파일 | 화면 |
|---|---|
| `office.tsx` | 최상위 앱: 로그인, 레이아웃, 공간 전환, 일정·보유종목·메일 초안·시세·뉴스 (가장 큼) |
| `scene.tsx` | three.js 3D 오피스·캐릭터 (이동 로직은 `lib/movement.ts`) |
| `stock-analysis.tsx` | 보유 종목 분석 |
| `kospi-ranking.tsx` | 코스피200 랭킹 |
| `interactive-history.tsx` | lightweight-charts 기반 시세 차트 |
| `team-office.tsx` | AI 팀 오피스 (API 키 설정, 업무 진행) |
| `apartment-office.tsx` | 부동산 리서치 |
| `globals.css` | Tailwind v4 전역 스타일 |
| `chatgpt-auth.ts` | 클라이언트 인증 보조 |
| `layout.tsx`, `page.tsx`, `login/` | 원본 Next 진입점 — 로컬판은 `web/main.tsx`가 `office.tsx`를 직접 렌더 |

## API: `api/[action]/route.ts`
단일 파일에서 URL 마지막 경로(`/api/<action>`)로 분기. `if(action==='...')` 블록을 grep해서 찾는다.
액션: `session`, `logout`, `state`, `record`, `settings`, `history`, `chart-history`, `refresh-quotes`, `refresh-news`,
`kospi-ranking|start|advance|chart`, `apartment-search|list|read|refresh`,
`team-list|create|advance|retry|decision|preference|claude-key|openai-key|openai-check`.

- `session` POST(로그인) 외 모든 액션은 `authorized(r)` 통과 필요, GET 이외 요청은 `sameOrigin` 검사.
- 응답은 `lib/server.ts`의 `response()` 사용 (`Cache-Control: no-store`).
- 새 액션 추가 시: route.ts에 분기 추가 → 로직은 `lib/`에 → 화면에서 `fetch('/api/<action>')` → `npm run build`.
