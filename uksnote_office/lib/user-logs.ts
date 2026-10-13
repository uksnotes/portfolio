import { after } from 'next/server';
import { db } from './db';
/** 사용자 로그(Supabase user_logs). 요청 본문·API 키는 남기지 않고 행위만 기록한다. */
export type LogEntry = {
  userId?: string | null;
  email?: string | null;
  event: string;
  action?: string | null;
  method?: string | null;
  status?: number | null;
  detail?: Record<string, unknown>;
};

export function clientInfo(r: Request) {
  const ip = (r.headers.get('x-forwarded-for') || '').split(',')[0].trim() || r.headers.get('x-real-ip') || '';
  return { ip: ip.slice(0, 64), userAgent: (r.headers.get('user-agent') || '').slice(0, 300) };
}

async function write(r: Request, e: LogEntry) {
  const { ip, userAgent } = clientInfo(r);
  try {
    await db().prepare('INSERT INTO user_logs(user_id,email,event,action,method,status,ip,user_agent,detail) VALUES(?::uuid,?,?,?,?,?,?,?,?::jsonb)')
      .bind(e.userId ?? null, e.email ?? null, e.event, e.action ?? null, e.method ?? null, e.status ?? null, ip || null, userAgent || null, JSON.stringify(e.detail ?? {}))
      .run();
  } catch (err) {
    // 로그 실패가 사용자 요청을 막지 않게 한다.
    console.error('user log failed', e.event, (err as Error)?.message);
  }
}

/** 기록을 시작하고, 응답 후에도 Vercel 함수가 기록을 마칠 때까지 유지되게 등록한다. */
export function logEvent(r: Request, e: LogEntry) {
  const task = write(r, e);
  try { after(task); } catch { /* 요청 범위 밖(테스트 등)에서는 호출자가 await 한다. */ }
  return task;
}
