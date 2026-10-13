import { db, sha, setting, type OfficeUser } from './server';
import { createAuthUser, verifyPassword } from './supabase-auth';
import { clientInfo, logEvent } from './user-logs';
/** 가입하면 바로 이용. 관리자는 문제 계정만 차단한다.
 * 비밀번호는 Supabase Auth가 보관하고, 차단 여부는 office_users.status('approved' 이용 중 / 'rejected' 차단)로 판단한다.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = ['approved', 'rejected'] as const;
const SESSION_MS = 86400000;

export function normalizeEmail(v: unknown) { return typeof v === 'string' ? v.trim().toLowerCase() : ''; }
const SIGNUP_LIMIT = 10, SIGNUP_WINDOW_MS = 3600000;
/** ADMIN_EMAILS에 적힌 이메일은 가입 즉시 관리자가 된다(최초 관리자 지정용). */
function isAdminEmail(email: string) { return setting('ADMIN_EMAILS').split(',').map(s => s.trim().toLowerCase()).filter(Boolean).includes(email); }
function text(v: unknown, max: number) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }

export async function signup(r: Request, b: any) {
  const email = normalizeEmail(b?.email), name = text(b?.name, 40), note = text(b?.note, 300), { ip } = clientInfo(r);
  if (!EMAIL.test(email) || email.length > 254) throw new Error('이메일 주소를 확인해 주세요.');
  if (!name) throw new Error('이름을 입력해 주세요.');
  if (typeof b?.password !== 'string' || b.password.length < 8 || b.password.length > 72) throw new Error('비밀번호는 8~72자로 입력해 주세요.');
  // 공개 가입이므로 같은 IP의 대량 가입을 막는다 (시간당 10건)
  if (ip) {
    const key = 'signup-ip:' + await sha(ip), now = Date.now();
    const a = await db().prepare('SELECT count,until FROM attempts WHERE owner=?').bind(key).first<{ count: number; until: number }>();
    if (a && a.until > now && a.count >= SIGNUP_LIMIT) {
      await logEvent(r, { email, event: 'signup_blocked', detail: { reason: 'too_many_signups' } });
      throw new Error('가입 요청이 많습니다. 잠시 후 다시 시도해 주세요.');
    }
    await db().prepare('INSERT INTO attempts(owner,count,until) VALUES(?,1,?) ON CONFLICT(owner) DO UPDATE SET count=CASE WHEN attempts.until>? THEN attempts.count+1 ELSE 1 END,until=CASE WHEN attempts.until>? THEN attempts.until ELSE excluded.until END')
      .bind(key, now + SIGNUP_WINDOW_MS, now, now).run();
  }
  const created = await createAuthUser(email, b.password, name);
  if ('exists' in created) {
    await logEvent(r, { email, event: 'signup_duplicate' });
    throw new Error('이미 가입된 이메일입니다. 로그인해 주세요.');
  }
  const role = isAdminEmail(email) ? 'admin' : 'user';
  await db().prepare("INSERT INTO office_users(id,email,name,note,status,role) VALUES(?::uuid,?,?,?,'approved',?) ON CONFLICT(id) DO NOTHING")
    .bind(created.id, email, name, note, role).run();
  await logEvent(r, { userId: created.id, email, event: 'signup', detail: { role } });
  return { ok: true };
}

type LoginResult = { token: string } | { error: string; status: number };
export async function login(r: Request, b: any): Promise<LoginResult> {
  const email = normalizeEmail(b?.email), password = b?.password;
  const invalid = { error: '이메일 또는 비밀번호를 확인해 주세요.', status: 401 };
  if (!EMAIL.test(email) || typeof password !== 'string' || !password || password.length > 256) return invalid;
  const key = 'email:' + await sha(email), now = Date.now();
  const a = await db().prepare('SELECT count,until FROM attempts WHERE owner=?').bind(key).first<{ count: number; until: number }>();
  if (a && a.until > now && a.count >= 5) {
    await logEvent(r, { email, event: 'login_blocked', detail: { reason: 'too_many_attempts' } });
    return { error: '로그인 시도가 많습니다. 10분 후 다시 시도해 주세요.', status: 429 };
  }
  const id = await verifyPassword(email, password);
  if (!id) {
    await db().prepare('INSERT INTO attempts(owner,count,until) VALUES(?,1,?) ON CONFLICT(owner) DO UPDATE SET count=CASE WHEN attempts.until>? THEN attempts.count+1 ELSE 1 END,until=CASE WHEN attempts.until>? THEN attempts.until ELSE excluded.until END')
      .bind(key, now + 600000, now, now).run();
    await logEvent(r, { email, event: 'login_failed' });
    return invalid;
  }
  await db().prepare('DELETE FROM attempts WHERE owner=?').bind(key).run();
  // Supabase 대시보드에서 직접 만든 계정처럼 office_users 행이 없으면 일반 사용자로 등록한다.
  await db().prepare("INSERT INTO office_users(id,email,name,status,role) VALUES(?::uuid,?,'','approved','user') ON CONFLICT(id) DO NOTHING").bind(id, email).run();
  if (isAdminEmail(email)) await db().prepare("UPDATE office_users SET role='admin' WHERE id=?::uuid").bind(id).run();
  const user = await db().prepare('SELECT status FROM office_users WHERE id=?::uuid').bind(id).first<{ status: string }>();
  if (user?.status === 'rejected') {
    await logEvent(r, { userId: id, email, event: 'login_blocked', detail: { reason: 'blocked' } });
    return { error: '이용이 제한된 계정입니다. 관리자에게 문의해 주세요.', status: 403 };
  }
  const token = crypto.randomUUID() + crypto.randomUUID();
  await db().prepare('INSERT INTO sessions(token,owner,expires) VALUES(?,?,?)').bind(await sha(token), id, now + SESSION_MS).run();
  await db().prepare('UPDATE office_users SET last_login_at=now() WHERE id=?::uuid').bind(id).run();
  await logEvent(r, { userId: id, email, event: 'login_success' });
  return { token };
}

export async function listUsers() {
  const rows = await db().prepare("SELECT id::text AS id,email,name,note,status,role,created_at,reviewed_at,last_login_at FROM office_users ORDER BY created_at DESC").all();
  return { users: rows.results };
}

export async function reviewUser(r: Request, admin: OfficeUser, b: any) {
  const id = typeof b?.id === 'string' ? b.id : '';
  if (!UUID.test(id)) throw new Error('사용자를 확인해 주세요.');
  if (id === admin.id) throw new Error('본인 계정의 차단 상태나 권한은 바꿀 수 없습니다.');
  if (!STATUSES.includes(b.status)) throw new Error('계정 상태를 확인해 주세요.');
  const role = b.role === undefined ? null : b.role;
  if (role !== null && role !== 'user' && role !== 'admin') throw new Error('권한을 확인해 주세요.');
  const target = await db().prepare('SELECT email FROM office_users WHERE id=?::uuid').bind(id).first<{ email: string }>();
  if (!target) throw new Error('사용자를 찾을 수 없습니다.');
  await db().prepare('UPDATE office_users SET status=?,role=COALESCE(?,role),reviewed_at=now(),reviewed_by=?::uuid WHERE id=?::uuid').bind(b.status, role, admin.id, id).run();
  // 차단 즉시 기존 로그인도 끊는다.
  if (b.status === 'rejected') await db().prepare('DELETE FROM sessions WHERE owner=?').bind(id).run();
  await logEvent(r, { userId: admin.id, email: admin.email, event: 'admin_review', detail: { target: id, targetEmail: target.email, status: b.status, role } });
  return { ok: true };
}

export async function listLogs(q: URLSearchParams) {
  const where: string[] = [], values: unknown[] = [];
  const event = q.get('event'), email = normalizeEmail(q.get('email')), before = Number(q.get('before'));
  if (event) { where.push('event=?'); values.push(event.slice(0, 40)); }
  if (email) { where.push("email LIKE ? ESCAPE '\\'"); values.push('%' + email.slice(0, 100).replace(/[\\%_]/g, m => '\\' + m) + '%'); }
  if (Number.isSafeInteger(before) && before > 0) { where.push('id<?'); values.push(before); }
  const limit = Math.min(Math.max(Number(q.get('limit')) || 100, 1), 200);
  const rows = await db().prepare(`SELECT id,created_at,user_id::text AS user_id,email,event,action,method,status,ip,user_agent,detail FROM user_logs${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT ${limit}`).bind(...values).all();
  return { logs: rows.results };
}
