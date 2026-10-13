# tests — 기능 검증

`office-regression.mjs`는 공개 가입·관리자 차단·가입 제한·서버 AI 키 관리자 전용·사용자 로그·로그인·계정 분리·암호화·검색·여행 동선·항공권 조건·일정/맛집 화면 분리를 확인합니다. PGlite(메모리 Postgres)에 `supabase/migrations` SQL을 적용하고, Supabase Auth와 외부 API는 모의 응답으로 실행합니다.

실행: `node tests/office-regression.mjs`

필수 준비는 `docs/SETUP.md`를 확인하세요. 이 테스트 통과가 실제 외부 API의 잔액·접속 권한이나 브라우저 화면 확인을 대신하지는 않습니다.
