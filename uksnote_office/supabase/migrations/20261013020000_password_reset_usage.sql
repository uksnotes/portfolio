-- 관리자 비밀번호 재설정 + 기능별 사용량
-- 20261013010000_open_signup.sql 다음에 실행합니다.

-- 관리자가 임시 비밀번호를 정해 주면 true. 다음 로그인 때 새 비밀번호로 바꿔야 오피스를 쓸 수 있다.
alter table public.office_users add column if not exists must_change_password boolean not null default false;

-- 사용자별·기능별·날짜별(한국시간) 사용 횟수
--   visits  : 해당 업무실 화면을 연 횟수
--   actions : 그 기능에서 실행한 작업 수 (조회 시작, 저장, 검색 등. 자동 폴링 제외)
-- 계정을 삭제하면 사용량도 함께 삭제됩니다.
create table if not exists public.feature_usage (
  user_id uuid not null references public.office_users(id) on delete cascade,
  feature text not null,
  day date not null,
  visits integer not null default 0,
  actions integer not null default 0,
  last_used_at timestamptz not null default now(),
  primary key (user_id, feature, day)
);
create index if not exists feature_usage_day on public.feature_usage (day desc);

alter table public.feature_usage enable row level security;
revoke all on table public.feature_usage from anon, authenticated;
