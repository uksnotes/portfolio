import {rankingState,rankingStart,rankingAdvance,rankingChart} from '@/lib/kospi-ranking';
import {apartmentSearch,apartmentList,apartmentRead,apartmentRefresh} from '@/lib/apartments';
import {saveModelPreference,saveClaudeKey,saveOpenAIKey,checkOpenAI} from '@/lib/ai-provider';
import {sessionToken,authorized,identity,sameOrigin,db,response,sha,passwordHash,setting,credentials,saveCredentials,records} from '@/lib/server';
import {refreshQuotes,refreshNews} from '@/lib/providers';
import {validWeights} from '@/lib/analysis';
import {parseHistoryCSV} from '@/lib/history';
import {cache} from '@/lib/server';
import {refreshMarketHistory} from '@/lib/market-history';
import {teamList,createTeamJob,advanceTeamJob,retryTeamJob,decideTeamJob} from '@/lib/team-jobs';
export const dynamic='force-dynamic';
async function run(r:Request){try{const action=new URL(r.url).pathname.split('/').pop();if(r.method!=='GET')sameOrigin(r);
if(action==='session'&&r.method==='POST'){const owner=await identity(r),body:any=await r.json();const a=await db().prepare('SELECT * FROM attempts WHERE owner=?').bind(owner).first<any>();if(a&&a.until>Date.now()&&a.count>=5)return response({error:'로그인 시도가 많습니다. 10분 후 다시 시도해 주세요.'},429);if(typeof body.password!=='string'||body.password.length>256||body.username!=='datascience_user1'||await passwordHash(body.password,setting('OFFICE_PASSWORD_SALT'))!==setting('OFFICE_PASSWORD_HASH')){await db().prepare('INSERT INTO attempts(owner,count,until) VALUES(?,1,?) ON CONFLICT(owner) DO UPDATE SET count=CASE WHEN attempts.until>? THEN attempts.count+1 ELSE 1 END,until=CASE WHEN attempts.until>? THEN attempts.until ELSE excluded.until END').bind(owner,Date.now()+600000,Date.now(),Date.now()).run();return response({error:'아이디 또는 비밀번호를 확인해 주세요.'},401);}await db().prepare('DELETE FROM attempts WHERE owner=?').bind(owner).run();const token=crypto.randomUUID()+crypto.randomUUID();await db().prepare('INSERT INTO sessions(token,owner,expires) VALUES(?,?,?)').bind(await sha(token),owner,Date.now()+86400000).run();return response({ok:true,sessionToken:token},200,{'Set-Cookie':`hi_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`});}
const owner=await authorized(r);
if(action==='session'&&r.method==='GET')return response({username:'datascience_user1'});
if(action==='logout'&&r.method==='POST'){const token=sessionToken(r)!;await db().prepare('DELETE FROM sessions WHERE token=? AND owner=?').bind(await sha(token),owner).run();return response({ok:true},200,{'Set-Cookie':'hi_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'});}
if(action==='team-openai-check'&&r.method==='POST')return response(await checkOpenAI(owner));
if(action==='team-preference'&&r.method==='POST')return response(await saveModelPreference(owner,await r.json()));
if(action==='team-openai-key'&&r.method==='POST')return response(await saveOpenAIKey(owner,await r.json()));
if(action==='team-claude-key'&&r.method==='POST')return response(await saveClaudeKey(owner,await r.json()));
if(action==='team-list'&&r.method==='GET')return response(await teamList(owner));
if(action==='team-create'&&r.method==='POST')return response(await createTeamJob(owner,await r.json()));
if(action==='team-advance'&&r.method==='POST')return response(await advanceTeamJob(owner,(await r.json() as any).id));
if(action==='team-retry'&&r.method==='POST')return response(await retryTeamJob(owner,await r.json()));
if(action==='team-decision'&&r.method==='POST')return response(await decideTeamJob(owner,await r.json()));
if(action==='apartment-list'&&r.method==='GET')return response(await apartmentList(owner));
if(action==='apartment-search'&&r.method==='POST')return response(await apartmentSearch(await r.json()));
if(action==='apartment-read'&&r.method==='POST')return response(await apartmentRead(owner,(await r.json() as any).id));
if(action==='apartment-refresh'&&r.method==='POST')return response(await apartmentRefresh(owner,await r.json()));
if(action==='kospi-ranking'&&r.method==='GET')return response(await rankingState(owner));
if(action==='kospi-start'&&r.method==='POST')return response(await rankingStart(owner));
if(action==='kospi-advance'&&r.method==='POST')return response(await rankingAdvance(owner,await r.json()));
if(action==='kospi-chart'&&r.method==='POST')return response(await rankingChart(owner,await r.json()));
if(action==='state'&&r.method==='GET'){const c=await credentials(owner);return response({records:(await records(owner)).filter((x:any)=>!x.kind.startsWith('kospi-')&&!x.kind.startsWith('rank-chart-')&&!x.kind.startsWith('apartment-')&&!x.kind.startsWith('chart-job-')&&x.kind!=='ai-job'&&x.kind!=='ai-preference'),connections:{kis:!!(c.kisKey&&c.kisSecret),naver:!!(c.naverId&&c.naverSecret)}});}
if(action==='settings'&&r.method==='POST'){const b:any=await r.json(),c=await credentials(owner);for(const k of ['kisKey','kisSecret','naverId','naverSecret'])if(typeof b[k]==='string'&&b[k].trim()){if(b[k].length>2000)throw new Error('입력 길이가 너무 깁니다.');c[k]=b[k].trim();}if(b.kisKey||b.kisSecret){delete c.kisToken;delete c.kisExpiry;}await saveCredentials(owner,c);return response({ok:true});}
if(action==='chart-history'&&r.method==='POST')return response(await refreshMarketHistory(owner,await r.json()));
if(action==='history'&&r.method==='POST'){const raw=await r.text();if(raw.length>250000)return response({error:'CSV 크기는 250KB 이하여야 합니다.'},400);const b=JSON.parse(raw);if(!/^\d{6}$/.test(b.code)||typeof b.csv!=='string')return response({error:'종목코드와 CSV를 확인하세요.'},400);if(!(await records(owner,'holding')).some(h=>h.code===b.code))return response({error:'보유 종목을 먼저 등록하세요.'},400);try{const rows=parseHistoryCSV(b.csv);await cache(owner,'history-'+b.code,{code:b.code,rows,source:'사용자 등록 CSV · 종가',fetchedAt:new Date().toISOString()});return response({count:rows.length});}catch(e){return response({error:(e as Error).message},400);}}
if(action==='refresh-quotes'&&r.method==='POST')return response(await refreshQuotes(owner));
if(action==='refresh-news'&&r.method==='POST'){const b:any=await r.json();return response(await refreshNews(owner,b.category||'economy'));}
if(action==='record'&&r.method==='POST'){const b:any=await r.json();if(!['task','holding','watch','draft','alarm','weights'].includes(b.kind))return response({error:'지원하지 않는 항목입니다.'},400);const d=b.data||{};if(b.kind==='task'){if(typeof d.title!=='string'||!d.title.trim()||d.title.length>200||!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||!Number.isFinite(Date.parse(d.date)))return response({error:'일정 제목과 날짜를 확인해 주세요.'},400);d.done=!!d.done;}
if(['holding','watch'].includes(b.kind)){if(!/^\d{6}$/.test(d.code)||typeof d.name!=='string'||!d.name.trim()||d.name.length>60)return response({error:'6자리 종목코드와 종목명을 입력해 주세요.'},400);if(b.kind==='holding'&&(!Number.isSafeInteger(d.quantity)||d.quantity<=0||!Number.isFinite(d.cost)||d.cost<=0||d.cost>1e15))return response({error:'수량은 양의 정수, 총매수금액은 양수로 입력해 주세요.'},400);}
if(b.kind==='weights'&&!validWeights(d))return response({error:'단기 지표 5개와 가중치 합계 100%를 확인하세요.'},400);
if(JSON.stringify(d).length>20000)return response({error:'입력 내용이 너무 깁니다.'},400);const id=b.id||crypto.randomUUID();if(typeof id!=='string'||id.length>100)return response({error:'항목 ID 오류'},400);const now=new Date().toISOString();if(b.version){const res=await db().prepare('UPDATE records SET data=?,updated=?,version=version+1 WHERE id=? AND owner=? AND kind=? AND version=?').bind(JSON.stringify(d),now,id,owner,b.kind,b.version).run();if(!res.meta.changes)return response({error:'다른 화면에서 변경되었습니다. 새로고침 후 다시 수정해 주세요.'},409);}else{const old=await db().prepare('SELECT id FROM records WHERE id=?').bind(id).first();if(old)return response({error:'이미 저장된 항목입니다. 새로고침해 주세요.'},409);await db().prepare('INSERT INTO records(id,owner,kind,data,updated) VALUES(?,?,?,?,?)').bind(id,owner,b.kind,JSON.stringify(d),now).run();}return response({ok:true,id});}
if(action==='record'&&r.method==='DELETE'){const b:any=await r.json();await db().prepare('DELETE FROM records WHERE id=? AND owner=? AND kind IN (?,?,?,?,?)').bind(b.id,owner,'task','holding','watch','draft','alarm').run();return response({ok:true});}return response({error:'요청을 찾을 수 없습니다.'},404);
}catch(e){const message=e instanceof Error?e.message:'처리 중 오류가 발생했습니다.';if(message==='AUTH')return response({error:'로그인이 필요합니다.'},401);if(message==='ORIGIN')return response({error:'요청 출처를 확인할 수 없습니다.'},403);console.error('office request failed',message.replace(/Bearer\s+\S+/g,'[redacted]'));return response({error:message.startsWith('D1')?'저장소 응답을 확인할 수 없습니다. 입력을 유지하고 다시 시도해 주세요.':message},500);}}
export const GET=run;export const POST=run;export const DELETE=run;
