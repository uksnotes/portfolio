import { createClient } from '@supabase/supabase-js';
/** Supabase Auth는 이메일·비밀번호 보관과 검증만 맡는다.
 * 오피스 입장 가능 여부(관리자 승인)는 office_users.status로 따로 판단한다.
 * 서버 전용: service role 키는 브라우저로 보내지 않는다.
 */
function client() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase 인증 설정(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)이 필요합니다.');
  // 요청마다 새 클라이언트: 로그인 세션이 다른 요청의 관리자 호출에 섞이지 않게 한다.
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export type AuthUserResult = { id: string } | { exists: true };

/** 이메일 확인 메일 없이 계정을 만든다. 입장은 관리자 승인으로 막는다. */
export async function createAuthUser(email: string, password: string, name: string): Promise<AuthUserResult> {
  const { data, error } = await client().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
  if (error) {
    if (error.code === 'email_exists' || error.code === 'user_already_exists' || (error.status === 422 && /already/i.test(error.message))) return { exists: true };
    if (error.code === 'weak_password') throw new Error('비밀번호가 너무 단순합니다. 더 긴 비밀번호를 사용해 주세요.');
    console.error('supabase createUser failed', error.code, error.message);
    throw new Error('가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
  }
  return { id: data.user.id };
}

/** 비밀번호가 맞으면 Supabase 사용자 ID, 틀리면 null. */
export async function verifyPassword(email: string, password: string): Promise<string | null> {
  const { data, error } = await client().auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === 'invalid_credentials' || error.code === 'email_not_confirmed' || error.status === 400) return null;
    console.error('supabase signIn failed', error.code, error.message);
    throw new Error('인증 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
  return data.user?.id ?? null;
}
