# 기능별 코드 안내

| 기능 | 화면 | 서버 / 계산 |
|---|---|---|
| 로그인·기본 레이아웃 | source/app/office.tsx | source/lib/server.ts, identity.ts, API route.ts |
| 3D 캐릭터·사무실 | source/app/scene.tsx | source/lib/movement.ts |
| 일정·보유 종목·메일 초안 | source/app/office.tsx | API route.ts의 record / state |
| 시세·뉴스 | source/app/office.tsx | providers.ts, public-pages.ts, news-summary.ts |
| 기존 보유 종목 분석 | source/app/stock-analysis.tsx | analysis.ts, history.ts, market-history.ts |
| 차트 | source/app/interactive-history.tsx | market-history.ts, kospi-ranking.ts |
| 코스피200 랭킹 | source/app/kospi-ranking.tsx | kospi-data.ts, kospi-ranking.ts |
| AI 팀 | source/app/team-office.tsx | ai-team.ts, ai-provider.ts, sol.ts, team-jobs.ts |
| 아파트 | source/app/apartment-office.tsx | apartments.ts, apartment-data.ts, asil-trades.ts |

`source/lib/` 내 파일명은 위 표에서 상대 경로를 생략했습니다.

로컬 실행 순서:
1. app.py가 Node 버전 및 사전 빌드 파일을 확인
2. 첫 실행에서만 비밀번호 해시·암호화 키 생성
3. runtime-dist/server.mjs 실행
4. 환경 어댑터가 SQLite를 열고 아직 적용하지 않은 SQL 마이그레이션만 실행
5. 브라우저에 static/ 화면 표시
6. 로그인 후 기존 API 경로를 통해 원래 분석·수집 로직 사용

로컬 서버는 127.0.0.1에만 바인딩됩니다. 사용자 헤더를 신뢰하지 않고 하나의 고정된 로컬 소유자를 사용합니다.
외부 출처 요청과 허용되지 않은 Host를 거절하며, data/ 파일은 웹으로 제공하지 않습니다.
