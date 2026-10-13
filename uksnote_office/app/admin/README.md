# admin — 사용자 관리·로그

`/admin`은 `office_users.role = 'admin'`인 계정만 사용할 수 있습니다. 가입은 승인 없이 바로 이용되며, 관리자는 필요할 때만 개입합니다.

- 사용자: 차단·차단 해제(차단 즉시 로그인 종료), 관리자 지정·해제
- 사용자 로그: Supabase `user_logs` 조회 (이메일·이벤트 필터, 100건씩)

API는 `app/api/[action]/route.ts`의 `admin-users`, `admin-user`, `admin-logs`, 처리 로직은 `lib/accounts.ts`에 있습니다.
