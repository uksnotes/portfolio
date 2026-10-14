import { after } from 'next/server';
import { db } from './db';
/** 기능별 사용량(Supabase feature_usage). 화면 방문과 실행 횟수만 세고 입력 내용은 남기지 않는다. */
export const FEATURES = ['home', 'team', 'apartments', 'travel', 'portfolio', 'planner', 'news', 'analysis', 'mail', 'alarms', 'settings'] as const;
export type Feature = typeof FEATURES[number];

// 사용자가 직접 실행한 작업만 센다. 자동 진행·폴링(kospi-advance, team-advance, research-poll)과 단순 조회는 제외.
const ACTION_FEATURE: Record<string, Feature> = {
  'team-create': 'team', 'team-answers': 'team', 'team-retry': 'team', 'team-decision': 'team',
  'research-start': 'travel', 'research-itinerary-choice': 'travel', 'research-itinerary-location': 'travel',
  'apartment-search': 'apartments', 'apartment-read': 'apartments', 'apartment-refresh': 'apartments', 'apartment-manual': 'apartments', 'apartment-naver': 'apartments',
  'kospi-start': 'analysis', 'kospi-chart': 'analysis', 'chart-history': 'analysis', 'history': 'analysis',
  'refresh-quotes': 'portfolio', 'refresh-news': 'news',
  'ai-key': 'settings', 'settings': 'settings', 'team-openai-key': 'settings', 'team-claude-key': 'settings',
};
const RECORD_FEATURE: Record<string, Feature> = { task: 'planner', holding: 'portfolio', watch: 'portfolio', weights: 'analysis', draft: 'mail', alarm: 'alarms' };

export function isFeature(v: unknown): v is Feature { return typeof v === 'string' && (FEATURES as readonly string[]).includes(v); }
export function actionFeature(action: string, recordKind?: string): Feature | null {
  if (action === 'record') return recordKind ? RECORD_FEATURE[recordKind] ?? null : null;
  return ACTION_FEATURE[action] ?? null;
}

async function write(userId: string, feature: Feature, kind: 'visit' | 'action') {
  try {
    await db().prepare("INSERT INTO feature_usage(user_id,feature,day,visits,actions,last_used_at) VALUES(?::uuid,?,(now() AT TIME ZONE 'Asia/Seoul')::date,?,?,now()) ON CONFLICT(user_id,feature,day) DO UPDATE SET visits=feature_usage.visits+excluded.visits,actions=feature_usage.actions+excluded.actions,last_used_at=now()")
      .bind(userId, feature, kind === 'visit' ? 1 : 0, kind === 'action' ? 1 : 0).run();
  } catch (err) {
    console.error('feature usage failed', feature, (err as Error)?.message);
  }
}

/** 응답 후에도 기록을 마치도록 등록한다. 실패해도 사용자 요청은 막지 않는다. */
export function trackUsage(userId: string, feature: Feature, kind: 'visit' | 'action') {
  const task = write(userId, feature, kind);
  try { after(task); } catch { /* 요청 범위 밖(테스트 등)에서는 호출자가 await 한다. */ }
  return task;
}

/** 관리자용 집계. days=0이면 전체 기간. */
export async function usageReport(q: URLSearchParams) {
  const days = [7, 30, 90].includes(Number(q.get('days'))) ? Number(q.get('days')) : 0;
  const where = days ? "WHERE f.day > (now() AT TIME ZONE 'Asia/Seoul')::date - ?::int" : '';
  const rows = await db().prepare(`SELECT f.user_id::text AS user_id,u.email,u.name,f.feature,SUM(f.visits)::int AS visits,SUM(f.actions)::int AS actions,MAX(f.last_used_at) AS last_used_at FROM feature_usage f JOIN office_users u ON u.id=f.user_id ${where} GROUP BY f.user_id,u.email,u.name,f.feature ORDER BY SUM(f.visits)+SUM(f.actions) DESC`)
    .bind(...(days ? [days] : [])).all();
  return { days, usage: rows.results };
}
