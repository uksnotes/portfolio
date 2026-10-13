# 실행·배포 준비 (Vercel + Supabase)

Next.js 서버 포함 프로젝트입니다. 데이터·계정·사용자 로그는 Supabase, 배포는 Vercel을 사용합니다.

```
브라우저 ──▶ Vercel (Next.js, app/api/[action]) ──▶ Supabase Postgres  (오피스 데이터, office_users, user_logs)
                                              └──▶ Supabase Auth      (이메일·비밀번호 보관/검증)
```

## 1. Supabase 프로젝트

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성 (리전: **Northeast Asia (Seoul)** 권장, Vercel `icn1`과 맞춤)
2. **SQL Editor**에서 `supabase/migrations/`의 SQL 파일을 **이름 순서대로** 하나씩 붙여 넣고 실행
   - `20261013000000_office_init.sql` → `20261013010000_open_signup.sql`
   - 첫 번째 파일을 이미 실행했다면 두 번째만 실행하면 됩니다
   - Supabase CLI를 쓰면 `supabase link` 후 `supabase db push`
3. **Authentication > Sign In / Providers**
   - Email 공급자는 켜 둡니다 (로그인 검증에 사용)
   - **Allow new users to sign up은 끄기 권장**: 이 앱의 가입은 서버가 관리자 API로 처리하므로 꺼도 그대로 동작합니다. 끄면 모든 가입이 앱을 거치게 되어 가입 로그·IP별 가입 제한이 빠짐없이 적용됩니다
   - 서버가 계정을 만들 때 이메일을 확인된 상태로 만들므로 *Confirm email* 설정과 확인 메일 발송 한도는 영향이 없습니다
4. 값 확인
   - **Connect > Transaction pooler** 연결 문자열 (포트 `6543`) → `DATABASE_URL`
   - **Project Settings > API**: Project URL → `SUPABASE_URL`, `service_role` 키 → `SUPABASE_SERVICE_ROLE_KEY`

> service role 키와 `DATABASE_URL`은 서버 전용입니다. `NEXT_PUBLIC_` 접두사를 붙이지 마세요.
> 모든 테이블은 RLS가 켜져 있고 anon/authenticated 권한이 없어 공개 키로는 읽을 수 없습니다.

## 2. Vercel 배포

1. Vercel > **Add New > Project** > 이 GitHub 저장소 선택
2. **Root Directory**: `uksnote_office` (저장소 루트가 portfolio이므로 필수)
3. Framework는 Next.js로 자동 인식. 설치 명령은 `vercel.json`에 지정되어 있습니다(pnpm 11.19.0)
4. **Environment Variables** 등록 (`.env.example` 참고)

| 이름                          | 값                                         |
| --------------------------- | ----------------------------------------- |
| `DATABASE_URL`              | Supabase Transaction pooler 연결 문자열        |
| `SUPABASE_URL`              | `https://<project>.supabase.co`           |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role 키                   |
| `ADMIN_EMAILS`              | 관리자로 쓸 본인 이메일 (쉼표로 여러 명)                  |
| `OFFICE_ENCRYPTION_KEY`     | `openssl rand -base64 32` 결과. 정한 뒤 바꾸지 않기 |
| `OPENAI_API_KEY` 등          | 선택 사항. 관리자 계정에서만 사용됨                      |

   - 대안: Vercel **Integrations > Supabase**로 연결하면 `POSTGRES_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`가 자동 등록되며 코드가 그대로 인식합니다 (`DATABASE_URL`이 없으면 `POSTGRES_URL` 사용)
5. Deploy. 이후 `main`에 push하면 자동 배포, PR은 Preview 배포가 만들어집니다

## 3. 첫 관리자 만들기

1. 배포 주소에서 **가입하기** → `ADMIN_EMAILS`에 넣은 이메일로 가입
2. 이 계정은 바로 관리자(`role=admin`)가 됩니다
3. 왼쪽 메뉴 **관리자** 또는 `/admin`에서 사용자 목록·로그 확인, 필요하면 차단

SQL로 직접 관리자를 지정하려면:

```sql
update office_users set role = 'admin' where email = 'me@example.com';
```

## 가입·차단 흐름

누구나 가입하면 바로 로그인되어 자기 오피스를 씁니다. 관리자는 문제가 있는 계정만 차단합니다.

| 상태 (`office_users.status`) | 로그인                 | 비고                                  |
| -------------------------- | ------------------- | ----------------------------------- |
| `approved` (가입 직후)         | 허용                  | 일반 이용 상태                            |
| `rejected` (관리자가 차단)       | 거부: "이용이 제한된 계정입니다" | 차단 즉시 기존 세션 종료, `/admin`에서 차단 해제 가능 |

- 같은 IP에서 1시간에 10건 넘게 가입하면 잠시 막습니다. 로그인은 같은 이메일로 10분 안에 5번 틀리면 10분 잠깁니다
- **서버 AI 키(`OPENAI_API_KEY` 등)는 관리자만 씁니다.** 일반 사용자는 화면의 `+ API 키 추가`로 자기 키를 등록해야 AI 기능을 쓸 수 있어, 내 키로 다른 사람 비용이 나가지 않습니다
- Supabase 대시보드 **Authentication > Users**에서 직접 만든 계정도 첫 로그인 때 일반 사용자로 등록됩니다
- 비밀번호 재설정은 Supabase 대시보드 **Authentication > Users > ⋯ > Reset password / Update user**에서 합니다
- 계정 삭제: Authentication > Users에서 삭제하면 `office_users` 행도 함께 삭제됩니다 (로그는 남음)

## 사용자 로그 (`user_logs`)

| event | 기록 시점 |
| --- | --- |
| `signup`, `signup_duplicate`, `signup_blocked` | 가입, 이미 있는 이메일로 재가입, IP별 가입 제한 |
| `login_success`, `login_failed` | 로그인 성공 / 비밀번호 오류 |
| `login_blocked` | 차단된 계정(`blocked`), 10분 내 5회 실패 잠금(`too_many_attempts`) — `detail.reason` |
| `logout` | 로그아웃 |
| `admin_review` | 관리자의 차단·차단 해제·권한 변경 (`detail`에 대상·결과) |
| `api` | 로그인 사용자의 변경 요청(POST/DELETE)과 서버 오류. 자동 폴링·조회(GET)는 제외 |

각 행에는 시각, 사용자 ID·이메일, IP, User-Agent가 함께 남습니다. 요청 본문·비밀번호·API 키는 기록하지 않습니다.
`/admin`의 **사용자 로그** 탭이나 Supabase **Table Editor > user_logs**에서 볼 수 있습니다. 예:

```sql
select created_at, email, event, action, status, ip from user_logs order by id desc limit 100;
```

## GitHub 공개 저장소 규칙

코드만 GitHub에 올리고, 사람·키 정보는 올리지 않습니다.

| 어디에 | 무엇을 |
| --- | --- |
| GitHub | 코드, 빈 테이블 구조(`supabase/migrations`), 값이 빈 `.env.example` |
| Supabase | 회원·차단 상태(`office_users`), 사용자 로그(`user_logs`), 오피스 데이터 |
| Vercel 환경변수 / `.env.local` | DB 주소, service role 키, 암호화 키, `ADMIN_EMAILS` |

- `.gitignore`가 `.env*`, `legacy/`, Supabase 시드, 백업·CSV·덤프를 제외합니다
- 커밋할 때마다 `scripts/check-secrets.mjs`가 API 키·DB 비밀번호·실제 이메일·위 파일을 검사해 발견하면 커밋을 멈춥니다
  - 새 PC에서 clone한 뒤에는 `pnpm hooks:install`로 다시 설치 (hook은 git에 저장되지 않음)
  - 전체 점검: `pnpm check:secrets`
- 커밋 작성자 이메일은 GitHub 비공개 주소(`…@users.noreply.github.com`)를 씁니다

## 로컬 개발

- Node.js 22.13 이상, pnpm 11.19.0 (`corepack pnpm@11.19.0 ...` 또는 `npx pnpm@11.19.0 ...`)

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local   # 값 채우기 (Supabase 프로젝트 하나를 개발용으로 써도 됨)
pnpm dev                     # http://localhost:3000
```

## 확인 명령

```bash
pnpm exec tsc --noEmit
pnpm build
pnpm test        # node tests/office-regression.mjs
```

회귀 테스트는 실제 Supabase에 접속하지 않습니다. PGlite(메모리 Postgres)에 `supabase/migrations` SQL을 그대로 적용하고, Supabase Auth와 외부 API는 모의 응답을 사용합니다. `.env`가 없어도 실행됩니다.

## 기존 데이터

이전 OpenAI Sites(D1)에 있던 일정·보유 종목 등은 자동으로 옮겨지지 않습니다. 필요하면 D1에서 `records`를 내보낸 뒤 `owner`를 새 Supabase 사용자 ID로 바꿔 넣으세요. 저장된 API 키(`secrets`)는 같은 `OFFICE_ENCRYPTION_KEY`를 쓸 때만 복호화됩니다.
