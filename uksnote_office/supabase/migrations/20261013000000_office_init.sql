-- UK'S OFFICE · Supabase 초기 스키마
-- Supabase 대시보드 > SQL Editor에 그대로 붙여 실행하거나 `supabase db push`로 적용합니다.
-- 서버(Vercel)는 DATABASE_URL(postgres 역할)로 직접 접속하므로 RLS를 통과합니다.
-- 브라우저용 anon/authenticated 키로는 어떤 테이블도 읽거나 쓸 수 없게 막아 둡니다.

-- 가입 신청·승인 상태 (Supabase Auth 사용자 1명당 1행)
create table if not exists public.office_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null default '',
  note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  last_login_at timestamptz
);
create index if not exists office_users_status on public.office_users (status, created_at desc);

-- 사용자 로그: 가입·로그인·로그아웃·관리자 승인·주요 요청 (계정이 삭제돼도 기록은 남김)
create table if not exists public.user_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid,
  email text,
  event text not null,
  action text,
  method text,
  status integer,
  ip text,
  user_agent text,
  detail jsonb not null default '{}'::jsonb
);
create index if not exists user_logs_created on public.user_logs (created_at desc);
create index if not exists user_logs_user on public.user_logs (user_id, created_at desc);
create index if not exists user_logs_event on public.user_logs (event, created_at desc);

-- 오피스 데이터 (기존 D1 구조 유지, owner = Supabase 사용자 ID)
create table if not exists public.records (
  id text primary key,
  owner text not null,
  kind text not null,
  data text not null,
  version integer not null default 1,
  updated text not null
);
create index if not exists records_owner_kind on public.records (owner, kind);
-- AI 팀 업무는 계정당 하나만 진행 (동시 요청 경쟁 방지)
create unique index if not exists records_one_running_ai_job on public.records (owner)
  where kind = 'ai-job' and jsonb_extract_path_text(data::jsonb, 'status') = 'running';

create table if not exists public.sessions (
  token text primary key,
  owner text not null,
  expires bigint not null
);
create index if not exists sessions_owner on public.sessions (owner);

create table if not exists public.attempts (
  owner text primary key,
  count integer not null,
  until bigint not null
);

create table if not exists public.secrets (
  owner text primary key,
  data text not null
);

-- 공개 API(anon/authenticated) 차단
do $$
declare t text;
begin
  foreach t in array array['office_users', 'user_logs', 'records', 'sessions', 'attempts', 'secrets'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
  end loop;
end $$;
