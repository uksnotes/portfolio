import {searchAirports} from '@/lib/flight-airports';
import {researchList,startResearch,pollResearch,saveItineraryChoice,itineraryLocation} from '@/lib/research-jobs';
import {rankingState,rankingStart,rankingAdvance,rankingChart} from '@/lib/kospi-ranking';
import {apartmentSearch,apartmentList,apartmentRead,apartmentRefresh,apartmentManual,apartmentNaver} from '@/lib/apartments';
import {providerConfig,saveGlobalKey,saveModelPreference,saveClaudeKey,saveOpenAIKey,checkOpenAI} from '@/lib/ai-provider';
import {sessionToken,currentUser,sameOrigin,db,response,sha,credentials,saveCredentials,records,type OfficeUser} from '@/lib/server';
import {signup,login,listUsers,reviewUser,listLogs,resetPassword,changePassword} from '@/lib/accounts';
import {trackUsage,actionFeature,isFeature,usageReport} from '@/lib/usage';
import {logEvent} from '@/lib/user-logs';
import {storageError} from '@/lib/db';
import {refreshQuotes,refreshNews} from '@/lib/providers';
import {validWeights} from '@/lib/analysis';
import {parseHistoryCSV} from '@/lib/history';
import {cache} from '@/lib/server';
import {refreshMarketHistory} from '@/lib/market-history';
import {teamList,createTeamJob,advanceTeamJob,retryTeamJob,decideTeamJob,answerTeamJob} from '@/lib/team-jobs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
type Context={action:string,user:OfficeUser|null,recordKind?:string};
async function handle(r:Request,ctx:Context){try{const action=ctx.action;if(r.method!=='GET')sameOrigin(r);
if(action==='signup'&&r.method==='POST')return response(await signup(r,await r.json()));
if(action==='session'&&r.method==='POST'){const result=await login(r,await r.json());if('error' in result)return response({error:result.error},result.status);return response({ok:true,sessionToken:result.token},200,{'Set-Cookie':`hi_session=${result.token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`});}
const user=await currentUser(r);ctx.user=user;const owner=user.id;
if(action==='session'&&r.method==='GET')return response({username:user.name||user.email,email:user.email,role:user.role,mustChangePassword:!!user.mustChangePassword});
if(action==='logout'&&r.method==='POST'){const token=sessionToken(r)!;await db().prepare('DELETE FROM sessions WHERE token=? AND owner=?').bind(await sha(token),owner).run();await logEvent(r,{userId:owner,email:user.email,event:'logout'});return response({ok:true},200,{'Set-Cookie':'hi_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'});}
if(action==='password'&&r.method==='POST')return response(await changePassword(r,user,await r.json()));
// 관리자가 임시 비밀번호를 준 계정은 새 비밀번호로 바꾸기 전까지 다른 기능을 쓸 수 없다.
if(user.mustChangePassword)return response({error:'임시 비밀번호입니다. 새 비밀번호로 바꾼 뒤 이용해 주세요.',mustChangePassword:true},403);
if(action==='usage'&&r.method==='POST'){const b:any=await r.json();if(!isFeature(b?.feature))return response({error:'알 수 없는 기능입니다.'},400);await trackUsage(owner,b.feature,'visit');return response({ok:true});}
if(action.startsWith('admin-')&&user.role!=='admin')return response({error:'관리자만 사용할 수 있습니다.'},403);
if(action==='admin-users'&&r.method==='GET')return response(await listUsers());
if(action==='admin-user'&&r.method==='POST')return response(await reviewUser(r,user,await r.json()));
if(action==='admin-logs'&&r.method==='GET')return response(await listLogs(new URL(r.url).searchParams));
if(action==='admin-password'&&r.method==='POST')return response(await resetPassword(r,user,await r.json()));
if(action==='admin-usage'&&r.method==='GET')return response(await usageReport(new URL(r.url).searchParams));
if(action==='ai-config'&&r.method==='GET')return response(await providerConfig(owner));
if(action==='ai-key'&&r.method==='POST')return response(await saveGlobalKey(owner,await r.json()));
if(action==='team-openai-check'&&r.method==='POST')return response(await checkOpenAI(owner));
if(action==='team-preference'&&r.method==='POST')return response(await saveModelPreference(owner,await r.json()));
if(action==='team-openai-key'&&r.method==='POST')return response(await saveOpenAIKey(owner,await r.json()));
if(action==='team-claude-key'&&r.method==='POST')return response(await saveClaudeKey(owner,await r.json()));
if(action==='team-list'&&r.method==='GET')return response(await teamList(owner));
if(action==='team-create'&&r.method==='POST')return response(await createTeamJob(owner,await r.json()));
if(action==='team-advance'&&r.method==='POST')return response(await advanceTeamJob(owner,(await r.json() as any).id));
if(action==='team-answers'&&r.method==='POST')return response(await answerTeamJob(owner,await r.json()));
if(action==='team-retry'&&r.method==='POST')return response(await retryTeamJob(owner,await r.json()));
if(action==='team-decision'&&r.method==='POST')return response(await decideTeamJob(owner,await r.json()));
if(action==='flight-airports'&&r.method==='POST')return response(searchAirports(String((await r.json() as any).query||'')));
if(action==='research-list'&&r.method==='POST')return response(await researchList(owner,await r.json()));
if(action==='research-start'&&r.method==='POST')return response(await startResearch(owner,await r.json()));
if(action==='research-itinerary-location'&&r.method==='POST')return response(await itineraryLocation(owner,await r.json()));
if(action==='research-itinerary-choice'&&r.method==='POST')return response(await saveItineraryChoice(owner,await r.json()));
if(action==='research-poll'&&r.method==='POST')return response(await pollResearch(owner,await r.json()));
if(action==='apartment-list'&&r.method==='GET')return response(await apartmentList(owner));
if(action==='apartment-search'&&r.method==='POST')return response(await apartmentSearch(await r.json()));
if(action==='apartment-read'&&r.method==='POST')return response(await apartmentRead(owner,(await r.json() as any).id));
if(action==='apartment-refresh'&&r.method==='POST')return response(await apartmentRefresh(owner,await r.json()));
if(action==='apartment-manual'&&r.method==='POST')return response(await apartmentManual(owner,await r.json()));
if(action==='apartment-naver'&&r.method==='POST')return response(await apartmentNaver(owner,await r.json()));
if(action==='kospi-ranking'&&r.method==='GET')return response(await rankingState(owner));
if(action==='kospi-start'&&r.method==='POST')return response(await rankingStart(owner));
if(action==='kospi-advance'&&r.method==='POST')return response(await rankingAdvance(owner,await r.json()));
if(action==='kospi-chart'&&r.method==='POST')return response(await rankingChart(owner,await r.json()));
if(action==='state'&&r.method==='GET'){const c=await credentials(owner);return response({records:(await records(owner)).filter((x:any)=>x.kind!=='research-job'&&!x.kind.startsWith('kospi-')&&!x.kind.startsWith('rank-chart-')&&!x.kind.startsWith('apartment-')&&!x.kind.startsWith('chart-job-')&&x.kind!=='ai-job'&&x.kind!=='ai-preference'),connections:{kis:!!(c.kisKey&&c.kisSecret),naver:!!(c.naverId&&c.naverSecret)}});}
if(action==='settings'&&r.method==='POST'){const b:any=await r.json(),c=await credentials(owner);for(const k of ['kisKey','kisSecret','naverId','naverSecret'])if(typeof b[k]==='string'&&b[k].trim()){if(b[k].length>2000)throw new Error('입력 길이가 너무 깁니다.');c[k]=b[k].trim();}if(b.kisKey||b.kisSecret){delete c.kisToken;delete c.kisExpiry;}await saveCredentials(owner,c);return response({ok:true});}
if(action==='chart-history'&&r.method==='POST')return response(await refreshMarketHistory(owner,await r.json()));
if(action==='history'&&r.method==='POST'){const raw=await r.text();if(raw.length>250000)return response({error:'CSV 크기는 250KB 이하여야 합니다.'},400);const b=JSON.parse(raw);if(!/^\d{6}$/.test(b.code)||typeof b.csv!=='string')return response({error:'종목코드와 CSV를 확인하세요.'},400);if(!(await records(owner,'holding')).some(h=>h.code===b.code))return response({error:'보유 종목을 먼저 등록하세요.'},400);try{const rows=parseHistoryCSV(b.csv);await cache(owner,'history-'+b.code,{code:b.code,rows,source:'사용자 등록 CSV · 종가',fetchedAt:new Date().toISOString()});return response({count:rows.length});}catch(e){return response({error:(e as Error).message},400);}}
if(action==='refresh-quotes'&&r.method==='POST')return response(await refreshQuotes(owner));
if(action==='refresh-news'&&r.method==='POST'){const b:any=await r.json();return response(await refreshNews(owner,b.category||'economy'));}
if(action==='record'&&r.method==='POST'){const b:any=await r.json();ctx.recordKind=typeof b?.kind==='string'?b.kind:undefined;if(!['task','holding','watch','draft','alarm','weights'].includes(b.kind))return response({error:'지원하지 않는 항목입니다.'},400);const d=b.data||{};if(b.kind==='task'){if(typeof d.title!=='string'||!d.title.trim()||d.title.length>200||!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||!Number.isFinite(Date.parse(d.date)))return response({error:'일정 제목과 날짜를 확인해 주세요.'},400);d.done=!!d.done;}
if(['holding','watch'].includes(b.kind)){if(!/^\d{6}$/.test(d.code)||typeof d.name!=='string'||!d.name.trim()||d.name.length>60)return response({error:'6자리 종목코드와 종목명을 입력해 주세요.'},400);if(b.kind==='holding'&&(!Number.isSafeInteger(d.quantity)||d.quantity<=0||!Number.isFinite(d.cost)||d.cost<=0||d.cost>1e15))return response({error:'수량은 양의 정수, 총매수금액은 양수로 입력해 주세요.'},400);}
if(b.kind==='weights'&&!validWeights(d))return response({error:'단기 지표 5개와 가중치 합계 100%를 확인하세요.'},400);
if(JSON.stringify(d).length>20000)return response({error:'입력 내용이 너무 깁니다.'},400);const id=b.id||crypto.randomUUID();if(typeof id!=='string'||id.length>100)return response({error:'항목 ID 오류'},400);const now=new Date().toISOString();if(b.version){const res=await db().prepare('UPDATE records SET data=?,updated=?,version=version+1 WHERE id=? AND owner=? AND kind=? AND version=?').bind(JSON.stringify(d),now,id,owner,b.kind,b.version).run();if(!res.meta.changes)return response({error:'다른 화면에서 변경되었습니다. 새로고침 후 다시 수정해 주세요.'},409);}else{const old=await db().prepare('SELECT id FROM records WHERE id=?').bind(id).first();if(old)return response({error:'이미 저장된 항목입니다. 새로고침해 주세요.'},409);await db().prepare('INSERT INTO records(id,owner,kind,data,updated) VALUES(?,?,?,?,?)').bind(id,owner,b.kind,JSON.stringify(d),now).run();}return response({ok:true,id});}
if(action==='record'&&r.method==='DELETE'){const b:any=await r.json();await db().prepare('DELETE FROM records WHERE id=? AND owner=? AND kind IN (?,?,?,?,?)').bind(b.id,owner,'task','holding','watch','draft','alarm').run();return response({ok:true});}return response({error:'요청을 찾을 수 없습니다.'},404);
}catch(e){const message=e instanceof Error?e.message:'처리 중 오류가 발생했습니다.';if(message==='AUTH')return response({error:'로그인이 필요합니다.'},401);if(message==='ORIGIN')return response({error:'요청 출처를 확인할 수 없습니다.'},403);console.error('office request failed',message.replace(/Bearer\s+\S+/g,'[redacted]'));return response({error:storageError(e)||message},500);}}
// 상태 조회·폴링(GET, 자동 진행)은 제외하고, 사용자가 실행한 변경 요청과 서버 오류만 user_logs에 남긴다.
// 비밀번호 변경·재설정은 자체 이벤트로, 화면 방문은 feature_usage로 따로 기록한다.
const SKIP_ACTIVITY=new Set(['logout','admin-user','admin-password','password','usage','research-poll','team-advance','kospi-advance']);
async function run(r:Request){const ctx:Context={action:new URL(r.url).pathname.split('/').pop()||'',user:null};const res=await handle(r,ctx);if(ctx.user&&!SKIP_ACTIVITY.has(ctx.action)&&(r.method!=='GET'||res.status>=500))logEvent(r,{userId:ctx.user.id,email:ctx.user.email,event:'api',action:ctx.action,method:r.method,status:res.status});
// 성공한 실행만 기능 사용량에 더한다.
const feature=ctx.user&&r.method!=='GET'&&res.status<400?actionFeature(ctx.action,ctx.recordKind):null;if(feature)trackUsage(ctx.user!.id,feature,'action');return res;}
export const GET=run;export const POST=run;export const DELETE=run;
