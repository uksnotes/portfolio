-- 가입 승인제 → 공개 가입으로 전환
-- 가입하면 바로 이용('approved'), 관리자가 차단한 계정만 'rejected'. 'pending'은 더 이상 쓰지 않는다.
-- 첫 번째 마이그레이션을 이미 실행했든 아니든, 그 다음에 이 파일을 실행하면 됩니다.
update public.office_users set status = 'approved' where status = 'pending';
alter table public.office_users alter column status set default 'approved';
alter table public.office_users drop constraint if exists office_users_status_check;
alter table public.office_users add constraint office_users_status_check check (status in ('approved', 'rejected'));
