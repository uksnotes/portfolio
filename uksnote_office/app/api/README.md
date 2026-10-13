# api — 화면 요청의 입구

`[action]/route.ts` 한곳에서 요청 이름별로 처리 함수를 연결합니다. 예: `ai-key`, `research-start`, `research-poll`, `research-itinerary-choice`.

`signup`(가입)·`session`(로그인)을 제외한 모든 요청은 세션과 차단 여부를 확인합니다. `admin-*` 요청은 관리자만 쓸 수 있습니다. 새 기능은 여기에서 분기만 추가하고 실제 로직은 `lib/`에 둡니다.
