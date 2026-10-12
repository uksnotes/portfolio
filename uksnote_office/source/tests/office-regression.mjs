import fs from 'node:fs';import path from 'node:path';import ts from 'typescript';import {DatabaseSync} from 'node:sqlite';import assert from 'node:assert/strict';
const root=process.cwd(),out=path.join(root,'.sites-runtime/checks');fs.mkdirSync(out,{recursive:true});
for(const [source,name] of [['lib/kospi-data.ts','kospi-data'],['lib/kospi-ranking.ts','kospi-ranking'],['lib/apartment-data.ts','apartment-data'],['lib/asil-trades.ts','asil-trades'],['lib/apartments.ts','apartments'],['lib/ai-provider.ts','ai-provider'],['lib/ai-team.ts','ai-team'],['lib/sol.ts','sol'],['lib/team-jobs.ts','team-jobs'],['lib/client-session.ts','client-session'],['lib/server.ts','server'],['lib/identity.ts','identity'],['lib/news-categories.ts','news-categories'],['lib/news-summary.ts','news-summary'],['lib/providers.ts','providers'],['lib/public-pages.ts','public-pages'],['lib/movement.ts','movement'],['lib/mail.ts','mail'],['lib/market-history.ts','market-history'],['lib/history.ts','history'],['lib/analysis.ts','analysis'],['app/api/[action]/route.ts','route']]){let src=fs.readFileSync(source,'utf8').replace("import {env} from 'cloudflare:workers';","const env=globalThis.__officeEnv;").replaceAll("'./ai-provider'","'./ai-provider.mjs'").replaceAll("'@/lib/ai-provider'","'./ai-provider.mjs'").replaceAll("'./kospi-data'","'./kospi-data.mjs'").replaceAll("'@/lib/kospi-ranking'","'./kospi-ranking.mjs'").replaceAll("'./apartment-data'","'./apartment-data.mjs'").replaceAll("'./asil-trades'","'./asil-trades.mjs'").replaceAll("'@/lib/apartments'","'./apartments.mjs'").replaceAll("'./server'","'./server.mjs'").replaceAll("'./ai-team'","'./ai-team.mjs'").replaceAll("'./sol'","'./sol.mjs'").replaceAll("'@/lib/team-jobs'","'./team-jobs.mjs'").replaceAll("'./identity'","'./identity.mjs'").replaceAll("'./public-pages'","'./public-pages.mjs'").replaceAll("'./news-categories'","'./news-categories.mjs'").replaceAll("'./news-summary'","'./news-summary.mjs'").replaceAll("'@/lib/server'","'./server.mjs'").replaceAll("'@/lib/providers'","'./providers.mjs'").replaceAll("'@/lib/analysis'","'./analysis.mjs'").replaceAll("'@/lib/history'","'./history.mjs'").replaceAll("'@/lib/market-history'","'./market-history.mjs'");fs.writeFileSync(path.join(out,name+'.mjs'),ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);}
const sql=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('drizzle/'+f,'utf8'));const mock={async batch(statements){return Promise.all(statements.map(s=>s.run()));},prepare(query){let values=[];const s={bind(...v){values=v;return s;},async first(){return sql.prepare(query).get(...values)||null;},async all(){return {results:sql.prepare(query).all(...values)};},async run(){const r=sql.prepare(query).run(...values);return {meta:{changes:Number(r.changes)}};}};return s;}};
globalThis.__officeEnv={DB:mock,...Object.fromEntries(fs.readFileSync('.env','utf8').trim().split('\n').map(s=>{const p=s.indexOf('=');return [s.slice(0,p),s.slice(p+1)];}))};
const {GET,POST,DELETE}=await import(path.join(out,'route.mjs'));
async function call(action,body,opts={}){const method=opts.method||(body?'POST':'GET');const headers={'Content-Type':'application/json',origin:opts.origin||'https://test.example','oai-authenticated-user-id':opts.owner||'ownerA'};if(opts.cookie)headers.cookie=opts.cookie;if(opts.token)headers.authorization='Bearer '+opts.token;if(opts.email){headers['oai-authenticated-user-email']=opts.email;if(!opts.withId)delete headers['oai-authenticated-user-id'];}if(opts.anonymous)delete headers['oai-authenticated-user-id'];const req=new Request('https://test.example/api/'+action,{method,headers,body:body?JSON.stringify(body):undefined});const res=await ({GET,POST,DELETE}[method])(req);const data=await res.json();return {status:res.status,data,cookie:res.headers.get('set-cookie')?.split(';')[0]};}
assert.equal((await call('state',undefined,{anonymous:true})).status,401);
assert.equal((await call('session',{username:'datascience_user1',password:'wrong'})).status,401);
let login=await call('session',{username:'datascience_user1',password:'1234'});assert.equal(login.status,200);let cookie=login.cookie;
const task=await call('record',{kind:'task',data:{title:'Persistence test',date:'2026-09-11',done:false}},{cookie});assert.equal(task.status,200);
const holding=await call('record',{kind:'holding',data:{name:'삼성전자',code:'005930',cost:100000,quantity:2}},{cookie});assert.equal(holding.status,200);
assert.equal((await call('record',{kind:'holding',data:{name:'bad',code:'005930',cost:1,quantity:-1}},{cookie})).status,400);
let state=await call('state',undefined,{cookie});assert.equal(state.data.records.length,2);const t=state.data.records.find(x=>x.kind==='task');
assert.equal((await call('record',{kind:'task',id:t.id,version:t.version,data:{title:t.title,date:t.date,done:true}},{cookie})).status,200);
assert.equal((await call('record',{kind:'task',id:t.id,version:t.version,data:{title:'stale',date:t.date,done:false}},{cookie})).status,409);
assert.equal((await call('state',undefined,{cookie,owner:'ownerB'})).status,401);
assert.equal((await call('record',{kind:'task',data:{title:'csrf',date:'2026-09-11'}},{cookie,origin:'https://evil.example'})).status,403);
globalThis.fetch=async()=>{throw new Error('공개 페이지 연결 실패');};
const unavailable=await call('refresh-quotes',{}, {cookie});assert.equal(unavailable.data.count,0);assert.equal(unavailable.data.errors.length,1);
assert.equal((await call('refresh-news',{}, {cookie})).status,500);
await call('logout',{}, {cookie});assert.equal((await call('state',undefined,{cookie})).status,401);
login=await call('session',{username:'datascience_user1',password:'1234'});cookie=login.cookie;state=await call('state',undefined,{cookie});assert.equal(state.data.records.length,2);assert.equal(state.data.records.find(x=>x.kind==='task').done,true);assert.equal(state.data.records.find(x=>x.kind==='holding').cost,100000);
await call('settings',{kisKey:'test-key',kisSecret:'test-secret'},{cookie});const encrypted=sql.prepare('SELECT data FROM secrets').get().data;assert.ok(!encrypted.includes('test-secret'));assert.equal((await call('state',undefined,{cookie})).data.connections.kis,true);
const {analyze,DEFAULT_WEIGHTS}=await import(path.join(out,'analysis.mjs'));const h={name:'삼성전자',peerPer:20};assert.equal(analyze(h,null,[]).total,null);const history=Array.from({length:80},(_,i)=>({date:new Date(Date.now()-(80-i)*86400000).toISOString().slice(0,10).replaceAll('-',''),close:100+i,volume:1000+i*20}));const q={history,historyFetchedAt:new Date().toISOString(),per:10};const a=analyze(h,q,[]);assert.ok(a.total>=0&&a.total<=100);assert.equal(a.coverage,90);assert.equal(analyze(h,{...q,historyFetchedAt:'2020-01-01'},[]).total,null);
// Regression: the production dispatcher supplied email but no user-id.
let emailLogin=await call('session',{username:'datascience_user1',password:'1234'},{email:'analyst@example.com'});assert.equal(emailLogin.status,200);
const emailCookie=emailLogin.cookie;
assert.equal((await call('record',{kind:'task',data:{title:'Email identity persistence',date:'2026-09-11',done:false}},{email:'analyst@example.com',cookie:emailCookie})).status,200);
let emailState=await call('state',undefined,{email:'ANALYST@example.com',cookie:emailCookie});assert.equal(emailState.status,200);assert.equal(emailState.data.records.length,1);
assert.equal((await call('state',undefined,{email:'another@example.com',cookie:emailCookie})).status,401);
await call('logout',{}, {email:'analyst@example.com',cookie:emailCookie});emailLogin=await call('session',{username:'datascience_user1',password:'1234'},{email:'analyst@example.com'});assert.equal((await call('state',undefined,{email:'analyst@example.com',cookie:emailLogin.cookie})).data.records.length,1);
const linked=await call('state',undefined,{email:'analyst@example.com',withId:true,owner:'new-platform-id',cookie:emailLogin.cookie});assert.equal(linked.status,200);assert.equal(linked.data.records.length,1);
assert.equal((await call('state',undefined,{owner:'new-platform-id',cookie:emailLogin.cookie})).data.records.length,1);
assert.equal((await call('session',{username:'datascience_user1',password:'wrong'},{email:'analyst@example.com'})).status,401);
console.log('PASS: email-only production identity, casing, session isolation, logout/relogin persistence, later user-id linkage; ');
console.log('PASS: login, auth isolation, CSRF, persistence across logout/login, optimistic update conflict, invalid holdings, encrypted settings, public-page failure states, scoring coverage and stale-data gate');

const {parseQuote,parseNews,articleDate}=await import(path.join(out,'public-pages.mjs'));
const quoteHtml='<script id="__NEXT_DATA__">'+JSON.stringify({props:{pageProps:{dehydratedState:{queries:[{state:{data:{result:{itemCode:'005930',stockName:'삼성전자',closePrice:'70,000',fluctuationsRatio:'-1.20',localTradedAt:'2026-09-11T15:30:00+09:00'}}}},{state:{data:{result:{totalInfos:[{code:'per',value:'12.5배'}],dealTrendInfos:[{itemCode:'005930',bizdate:'20260910',closePrice:'71,000',accumulatedTradingVolume:'10,000'}]}}}}]}}}})+'</script>';
assert.equal(parseQuote(quoteHtml,'005930').price,70000);assert.equal(parseQuote(quoteHtml,'005930').per,12.5);assert.throws(()=>parseQuote(quoteHtml,'000660'));
const newsHtml='<div class="sa_item"><a class="sa_text_title" href="https://n.news.naver.com/mnews/article/001/0000000001">시험 기사</a><div class="sa_text_lede">짧은 발췌</div></div>';
assert.equal(parseNews(newsHtml+newsHtml).length,1);assert.equal(articleDate('<span class="media_end_head_info_datestamp" data-date-time="2026-09-11 09:30:00"></span>'),'2026-09-11T00:30:00.000Z');assert.throws(()=>parseNews('blocked'));
globalThis.fetch=async url=>new Response(String(url).includes('/domestic/stock/')?quoteHtml:String(url).includes('/section/')?newsHtml:'<span class="media_end_head_info_datestamp" data-date-time="2026-09-11 09:30:00"></span>');
const fresh=await call('refresh-quotes',{}, {cookie});assert.equal(fresh.data.count,1);assert.equal(fresh.data.items['005930'].price,70000);
assert.equal((await call('refresh-news',{}, {cookie})).data.digest.length,1);
globalThis.fetch=async()=>new Response('blocked',{status:403});assert.equal((await call('refresh-quotes',{}, {cookie})).data.items['005930'].price,70000);
assert.equal((await call('refresh-news',{}, {cookie})).status,500);assert.equal((await call('state',undefined,{cookie})).data.records.find(x=>x.kind==='news').digest.length,1);
const {walkable,pathTo}=await import(path.join(out,'movement.mjs'));
for(const x of [-2.45,2.45])for(const z of [-3.25,1,4.7]){const p=pathTo({x:0,z:4.2},{x,z});assert.ok(p.length);assert.ok(p.every(p=>walkable(p.x,p.z)));assert.ok(Math.hypot(p.at(-1).x-x,p.at(-1).z-z)<.4);}
assert.equal(walkable(0,0),false);assert.equal(pathTo({x:0,z:4.2},{x:99,z:99}).length,0);
const {mailUrl}=await import(path.join(out,'mail.mjs'));const d={to:'a@example.com',subject:'시험 & 확인',body:'첫 줄\n둘째 줄'};assert.equal(new URL(mailUrl('gmail',d)).searchParams.get('body'),d.body);assert.equal(new URL(mailUrl('outlook',d)).searchParams.get('subject'),d.subject);assert.ok(mailUrl('default',d).startsWith('mailto:'));
console.log('PASS: keyless HTML parsing, partial failure cache preservation, article dates, six character room paths, mail compose encoding');

// Reproduce production: password POST succeeds, but the next request has no
// app cookie (embedded browser / dispatch cookie filtering).
const tabStorage=new Map();globalThis.sessionStorage={getItem:k=>tabStorage.get(k)||null,setItem:(k,v)=>tabStorage.set(k,v),removeItem:k=>tabStorage.delete(k)};
globalThis.window=new EventTarget();let expiredEvents=0;window.addEventListener('office-session-expired',()=>expiredEvents++);
globalThis.fetch=async (url,init)=>{const headers=new Headers(init.headers);headers.set('origin','https://test.example');headers.set('oai-authenticated-user-email','cookie-blocked@example.com');assert.equal(headers.has('cookie'),false);const req=new Request('https://test.example'+url,{...init,headers});return await ({GET,POST,DELETE}[init.method])(req);};
const client=await import(path.join(out,'client-session.mjs'));
await assert.rejects(client.api('session',{username:'datascience_user1',password:'wrong'}));assert.equal(tabStorage.size,0);
const created=await client.api('session',{username:'datascience_user1',password:'1234'});assert.ok(created.sessionToken);
assert.equal((await client.api('session')).username,'datascience_user1');
await client.api('record',{kind:'task',data:{title:'Cookie-free persisted task',date:'2026-09-13',done:false}});
await client.api('record',{kind:'holding',data:{name:'현대해상',code:'001450',cost:10000,quantity:1}});
const restored=await import(path.join(out,'client-session.mjs')+'?reload=1');assert.equal((await restored.api('state')).records.length,2);
assert.equal((await call('state',undefined,{token:created.sessionToken,owner:'another-owner'})).status,401);
assert.equal((await call('state',undefined,{token:created.sessionToken,anonymous:true})).status,401);
assert.equal((await call('record',{kind:'task',data:{title:'csrf',date:'2026-09-13'}},{token:created.sessionToken,email:'cookie-blocked@example.com',origin:'https://evil.example'})).status,403);
await restored.api('logout',{});assert.equal(tabStorage.size,0);
assert.equal((await call('state',undefined,{token:created.sessionToken,email:'cookie-blocked@example.com'})).status,401);
await restored.api('session',{username:'datascience_user1',password:'1234'});assert.equal((await restored.api('state')).records.length,2);
sql.prepare('UPDATE sessions SET expires=0 WHERE owner=(SELECT owner FROM records WHERE data LIKE ?)').run('%Cookie-free persisted task%');
await assert.rejects(restored.api('state'),e=>e.status===401);assert.equal(expiredEvents,1);assert.equal(tabStorage.size,0);
// Storage-denied browser still gets an in-memory session for this open tab.
globalThis.sessionStorage={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}};
const memoryOnly=await import(path.join(out,'client-session.mjs')+'?storageBlocked=1');await memoryOnly.api('session',{username:'datascience_user1',password:'1234'});assert.equal((await memoryOnly.api('state')).records.length,2);await memoryOnly.api('logout',{});
console.log('PASS: production cookie-loss reproduction, actual client login/state/save/reload/logout/relogin, expiry, blocked browser storage, owner isolation, CSRF');

const {page}=await import(path.join(out,'providers.mjs'));
const calls=[];globalThis.fetch=async(url,options)=>{assert.equal(options.redirect,'manual');calls.push(url);return calls.length===1?new Response(null,{status:302,headers:{location:'/redirected'}}):new Response('public html');};
assert.equal(await page('https://news.naver.com/section/101'),'public html');assert.equal(calls[1],'https://news.naver.com/redirected');
globalThis.fetch=async()=>new Response(null,{status:302,headers:{location:'https://example.com/private'}});await assert.rejects(page('https://news.naver.com/section/101'),/허용되지/);
globalThis.fetch=async()=>new Response(null,{status:302,headers:{location:'/loop'}});await assert.rejects(page('https://news.naver.com/section/101'),/너무 많/);
globalThis.fetch=async()=>new Response(null,{status:302});await assert.rejects(page('https://news.naver.com/section/101'),/주소/);
const {parseRanking}=await import(path.join(out,'public-pages.mjs'));
const rankingHtml='<div class="rankingnews_box"><strong class="rankingnews_name">시험 언론사</strong><ul class="rankingnews_list"><li><a class="list_title" href="https://n.news.naver.com/article/001/0000000002?ntype=RANKING">인기 기사</a></li></ul></div>';
assert.equal(parseRanking(rankingHtml)[0].publisherRank,1);assert.equal(parseRanking(rankingHtml)[0].publisher,'시험 언론사');assert.throws(()=>parseRanking('blocked'));
globalThis.fetch=async(url,options)=>{assert.equal(options.redirect,'manual');return new Response(String(url).includes('/ranking/')?rankingHtml:String(url).includes('/section/')?newsHtml:'<span class="media_end_head_info_datestamp" data-date-time="2026-09-13 09:30:00"></span>');};
const categoryLogin=await call('session',{username:'datascience_user1',password:'1234'},{owner:'category-owner'}),categoryAuth={owner:'category-owner',token:categoryLogin.data.sessionToken};
for(const category of ['economy','society','it','world','ranking']){const r=await call('refresh-news',{category},categoryAuth);assert.equal(r.status,200);assert.equal(r.data.category,category);assert.equal(r.data.digest.length,1);}
let categories=(await call('state',undefined,categoryAuth)).data.records;assert.equal(categories.length,5);assert.equal(categories.find(x=>x.kind==='news-ranking').digest[0].publisherRank,1);
const before=categories.find(x=>x.kind==='news-it').fetchedAt;globalThis.fetch=async()=>new Response('blocked',{status:403});assert.equal((await call('refresh-news',{category:'it'},categoryAuth)).status,500);
categories=(await call('state',undefined,categoryAuth)).data.records;assert.equal(categories.length,5);assert.equal(categories.find(x=>x.kind==='news-it').fetchedAt,before);
console.log('PASS: edge-compatible manual redirects, bounded allowed-host redirects, five isolated news categories, ranking extraction, failed-category cache preservation');

const {normalizedWeights,FACTORS}=await import(path.join(out,'analysis.mjs'));assert.equal(FACTORS.length,5);assert.ok(!FACTORS.some(x=>x.key==='value'));
assert.equal(analyze({...h,peerPer:999},{...q,per:9999},[]).total,analyze({...h,peerPer:1},{...q,per:1},[]).total);
assert.equal(analyze(h,{...q,history:q.history.slice(-5)},[]).total,analyze(h,q,[]).total);assert.equal(analyze(h,{...q,history:q.history.slice(-4)},[]).total,null);
assert.deepEqual(normalizedWeights({trend:25,momentum:15,volume:15,value:15,risk:20,news:10}),DEFAULT_WEIGHTS);
const {parseHistoryCSV,historyWindow}=await import(path.join(out,'history.mjs'));const csv='date,close\n2025-09-12,70000\n2025-09-15,71000';assert.equal(parseHistoryCSV(csv).length,2);assert.throws(()=>parseHistoryCSV('date,close\n2025-02-30,1\n2025-03-01,2'));assert.throws(()=>parseHistoryCSV('date,close\n2025-01-01,1\n2025-01-01,2'));
const chartLogin=await call('session',{username:'datascience_user1',password:'1234'},{owner:'chart-owner'}),chartAuth={owner:'chart-owner',token:chartLogin.data.sessionToken};
assert.equal((await call('record',{kind:'holding',data:{name:'삼성전자',code:'005930',quantity:1,cost:70000}},chartAuth)).status,200);
assert.equal((await call('history',{code:'005930',csv},chartAuth)).status,200);assert.equal((await call('history',{code:'000660',csv},chartAuth)).status,400);
assert.equal((await call('record',{kind:'weights',data:DEFAULT_WEIGHTS},chartAuth)).status,200);const stored=(await call('state',undefined,chartAuth)).data.records;assert.equal(stored.find(x=>x.kind==='history-005930').rows.length,2);
assert.equal((await call('history',{code:'005930',csv:'date,close\n2025-09-12,-1\n2025-09-15,0'},chartAuth)).status,400);assert.equal((await call('state',undefined,chartAuth)).data.records.find(x=>x.kind==='history-005930').rows.length,2);
console.log('PASS: short-score five-day window, PER-independent scores, legacy weights normalization, history CSV validation and durable per-stock storage');

// Numeric, keyless historical charts: full pagination, durable resumption, failure isolation.
const {parseDailyTable}=await import(path.join(out,'market-history.mjs'));
for(const p of [1,26,125,135]){const sample=path.join(root,'.sites-runtime/public-samples/daily-'+p+'.html');if(fs.existsSync(sample)){const parsed=parseDailyTable(fs.readFileSync(sample,'utf8'),'005930');assert.equal(parsed.rows.length,10);assert.ok(parsed.rows.every(r=>r.close>0&&r.high>=r.close&&r.low<=r.close&&r.volume>=0));assert.ok(parsed.lastPage>=p);}}
assert.throws(()=>parseDailyTable('<html>blocked</html>','005930'));
const dailyDates=[];for(let d=new Date();dailyDates.length<2000;d.setUTCDate(d.getUTCDate()-1)){if(d.getUTCDay()!==0&&d.getUTCDay()!==6)dailyDates.push(d.toISOString().slice(0,10).replaceAll('-','.'));}
let pagesRequested=[],failPage=0,shortListing=false;
function dailyHTML(p){const dates=shortListing?dailyDates.slice(0,3):dailyDates.slice((p-1)*10,p*10);return '<table class="type2">'+dates.map(d=>`<tr><td>${d}</td><td>70,000</td><td>100</td><td>69,000</td><td>71,000</td><td>68,000</td><td>1,234,567</td></tr>`).join('')+'</table><table class="Nnavi"><tr><td><a href="?code=005930&page='+(shortListing?1:200)+'">마지막</a></td></tr></table>';}
globalThis.fetch=async(url,options)=>{const u=new URL(url);assert.equal(u.hostname,'finance.naver.com');assert.equal(u.pathname,'/item/sise_day.naver');assert.equal(options.redirect,'manual');assert.equal(options.headers.Referer,'https://finance.naver.com/');const p=Number(u.searchParams.get('page'));pagesRequested.push(p);if(p===failPage)return new Response('blocked',{status:503});return new Response(dailyHTML(p));};
assert.equal((await call('chart-history',{code:'000660',years:5},chartAuth)).status,500);assert.equal(pagesRequested.length,0);
let result=await call('chart-history',{code:'005930',years:5},chartAuth);assert.equal(result.status,200);assert.equal(result.data.complete,false);assert.equal(result.data.loaded,10);
assert.ok(!(await call('state',undefined,chartAuth)).data.records.some(r=>r.kind.startsWith('chart-job-')));
let loops=1;while(!result.data.complete&&loops<25){const n=pagesRequested.length;result=await call('chart-history',{code:'005930',years:5,continue:true,jobId:result.data.jobId},chartAuth);assert.equal(result.status,200,JSON.stringify(result.data));assert.ok(pagesRequested.length-n<=8);loops++;}
assert.equal(result.data.complete,true);assert.equal(result.data.fullPeriod,true);assert.ok(result.data.rows.length>1200&&result.data.rows.length<1350);assert.equal(new Set(result.data.rows.map(r=>r.date)).size,result.data.rows.length);assert.ok(result.data.rows.every(r=>r.date>=result.data.requestedFrom));assert.ok(result.data.rows.every((r,i,arr)=>i===0||arr[i-1].date<r.date));
const completed=result.data;const requestCount=pagesRequested.length;
assert.equal((await call('chart-history',{code:'005930',years:5,continue:true,jobId:completed.jobId},chartAuth)).data.complete,true);assert.equal(pagesRequested.length,requestCount);
assert.equal((await call('chart-history',{code:'005930',years:5},chartAuth)).data.rows.length,completed.rows.length);assert.equal(pagesRequested.length,requestCount);
result=await call('chart-history',{code:'005930',years:5,restart:true},chartAuth);assert.equal(result.data.loaded,10);failPage=2;
assert.equal((await call('chart-history',{code:'005930',years:5,continue:true,jobId:result.data.jobId},chartAuth)).status,500);
assert.deepEqual((await call('state',undefined,chartAuth)).data.records.find(r=>r.kind==='market-history-005930-5').rows,completed.rows);
failPage=0;const resumed=await call('chart-history',{code:'005930',years:5},chartAuth);assert.equal(resumed.data.jobId,result.data.jobId);assert.equal(resumed.data.loaded,90);assert.equal(resumed.data.complete,false);
shortListing=true;const listing=await call('chart-history',{code:'005930',years:1,restart:true},chartAuth);assert.equal(listing.data.complete,true);assert.equal(listing.data.fullPeriod,false);assert.equal(listing.data.rows.length,3);
assert.equal((await call('state',undefined,categoryAuth)).data.records.some(r=>r.kind.startsWith('market-history-')),false);
await call('logout',{},chartAuth);const relog=await call('session',{username:'datascience_user1',password:'1234'},{owner:'chart-owner'});assert.equal((await call('state',undefined,{owner:'chart-owner',token:relog.data.sessionToken})).data.records.find(r=>r.kind==='market-history-005930-5').rows.length,completed.rows.length);
console.log('PASS: real HTML OHLCV samples, complete numeric five-year pagination, bounded manual fetches, cache reuse, completed-request retry, interrupted refresh resumes, preserved prior chart, listing-limited coverage and login/owner persistence');

const {summarizeArticle}=await import(path.join(out,'news-summary.mjs'));
const summaryFixture='<main><div id="dic_area"><div class="end_photo_org">사진 설명 광고 매출 999억원 급증</div><script>무조건 주식을 매수하세요.</script><p>한국은행은 기준금리를 연 3.5%로 동결했다고 발표했다.</p><p>기준금리 인하는 물가 상승 우려 때문에 결정하지 않았다고 설명했다.</p><p>한국은행은 기준금리를 연 3.5%로 동결했다고 발표했다.</p><p>무단 전재 및 재배포 금지. 구독해주세요.</p></div><aside>관련 없는 추천 기사</aside></main>';
const summarized=summarizeArticle(summaryFixture,'한국은행 기준금리 3.5% 동결');assert.equal(summarized.summaryStatus,'ready');assert.equal(summarized.summaryPoints.length,2);assert.ok(summarized.summaryPoints.join(' ').includes('3.5%'));assert.ok(summarized.summaryPoints.join(' ').includes('결정하지 않았다고'));assert.ok(!summarized.summaryPoints.join(' ').includes('999'));assert.ok(!summarized.summaryPoints.join(' ').includes('매수'));assert.ok(summarized.summaryPoints.join('').length<=360);assert.ok(summarized.keywords.length<=3);assert.equal(summarizeArticle('<div>추천 기사뿐</div>','제목').summaryStatus,'unavailable');assert.equal(summarizeArticle('<div id="dic_area">짧음</div>','제목').summaryStatus,'unavailable');
globalThis.fetch=async url=>new Response(String(url).includes('/section/')?newsHtml:summaryFixture+'<span class="media_end_head_info_datestamp" data-date-time="2026-09-15 09:00:00"></span>');
const summaryRefresh=await call('refresh-news',{category:'it'},categoryAuth);assert.equal(summaryRefresh.status,200);assert.equal(summaryRefresh.data.digest[0].summaryStatus,'ready');assert.ok(summaryRefresh.data.digest[0].summaryPoints.length);const savedSummary=summaryRefresh.data.digest[0].summaryPoints;
globalThis.fetch=async url=>String(url).includes('/section/')?new Response(newsHtml):new Response('unavailable',{status:503});
const cachedSummary=await call('refresh-news',{category:'it'},categoryAuth);assert.equal(cachedSummary.status,200);assert.equal(cachedSummary.data.digest[0].summaryStatus,'cached');assert.deepEqual(cachedSummary.data.digest[0].summaryPoints,savedSummary);assert.equal(cachedSummary.data.digest[0].publishedAt,null);assert.ok(cachedSummary.data.errors.length);
const durableSummary=(await call('state',undefined,categoryAuth)).data.records.find(r=>r.kind==='news-it').digest[0];assert.deepEqual(durableSummary.summaryPoints,savedSummary);assert.equal(durableSummary.summaryStatus,'cached');
console.log('PASS: body-only concise summaries, decimal/negation preservation, caption/script/boilerplate exclusion, deduplication, missing-body state, refresh integration and durable cached summaries on article failure');

// Team workflows: authenticated ownership, bounded model work, decisions and durable history.
globalThis.__officeEnv.OPENAI_API_KEY='unit-test-key-not-a-real-secret';
const teamLogin=await call('session',{username:'datascience_user1',password:'1234'},{owner:'team-owner'}),teamAuth={owner:'team-owner',token:teamLogin.data.sessionToken};
await call('record',{kind:'holding',data:{name:'테스트종목',code:'005930',quantity:2,cost:10000}},teamAuth);
assert.equal((await call('team-list',undefined,teamAuth)).data.configured,true);
assert.equal((await call('team-create',{instruction:'테스트 업무입니다',requestId:crypto.randomUUID()},{anonymous:true})).status,401);
assert.equal((await call('team-create',{instruction:'테스트 업무입니다',requestId:crypto.randomUUID()},{...teamAuth,origin:'https://evil.example'})).status,403);
const payload={instruction:'보유 종목 정보를 검토하고 결정을 위한 보고서를 작성해 주세요.',reference:'추가 자료 없음',includeOffice:true,requestId:crypto.randomUUID()};
let team=await call('team-create',payload,teamAuth);assert.equal(team.status,200);assert.equal(team.data.contextInfo.holdings,1);assert.equal(team.data.status,'running');const teamId=team.data.id;
assert.equal((await call('team-create',payload,teamAuth)).data.id,teamId);
assert.equal((await call('team-create',{...payload,includeOffice:false},teamAuth)).status,500);
assert.equal((await call('team-create',{...payload,requestId:crypto.randomUUID()},teamAuth)).status,500);
assert.equal((await call('team-decision',{id:teamId,version:team.data.version,action:'approve'},teamAuth)).status,500);
assert.equal((await call('record',{kind:'ai-job',data:{status:'approved'}},teamAuth)).status,400);
const fakeResult={title:'검토 보고',summary:'입력 자료를 검토했습니다.',findings:[{point:'현재가 미제공',evidence:'입력 자료에 현재가가 없어 평가금액을 확정할 수 없습니다.',source_ids:[]}],uncertainties:['현재가 조회 필요'],recommendation:'최신 시세를 확인하세요.',options:[{label:'자료 보완',benefit:'판단 근거 확보',tradeoff:'추가 조회 필요'}],next_tasks:['시세 확인']};
let modelCreates=0,modelGets=0,creditFailure=false;const madeBodies=[];
globalThis.fetch=async(url,options)=>{assert.ok(String(url).startsWith('https://api.openai.com/v1/responses'));assert.equal(options.headers.Authorization,'Bearer unit-test-key-not-a-real-secret');assert.equal(options.redirect,'manual');if(options.method==='POST'&&!String(url).endsWith('/cancel')){modelCreates++;const b=JSON.parse(options.body);madeBodies.push(b);assert.equal(b.model,'gpt-5.6-sol');assert.equal(b.background,true);assert.equal(b.text.format.strict,true);assert.ok(!b.input.includes('unit-test-key'));return Response.json({id:'resp_test'+modelCreates,status:'queued'});}if(String(url).endsWith('/cancel'))return Response.json({status:'cancelled'});modelGets++;return Response.json(creditFailure?{status:'failed',error:{code:'credit_balance_exhausted'}}:{status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(fakeResult),annotations:[{type:'url_citation',url:'https://example.com/source',title:'검증 출처'}]}]}],usage:{input_tokens:100,output_tokens:150,total_tokens:250}});};
const concurrent=await Promise.all([call('team-advance',{id:teamId},teamAuth),call('team-advance',{id:teamId},teamAuth)]);assert.equal(modelCreates,1);assert.ok(concurrent.every(r=>r.status===200));
for(let i=0;i<12;i++){team=await call('team-advance',{id:teamId},teamAuth);assert.equal(team.status,200);if(team.data.status==='awaiting_decision')break;}
assert.equal(team.data.status,'awaiting_decision');assert.equal(modelCreates,5);assert.equal(modelGets,5);assert.ok(team.data.steps.every(s=>s.status==='complete'));assert.ok(madeBodies[1].tools.some(t=>t.type==='web_search'));assert.equal(JSON.parse(madeBodies[4].input).previous_results.length,4);
assert.ok(!JSON.stringify(team.data).includes('unit-test-key'));assert.ok(!JSON.stringify(team.data).includes('resp_test'));assert.ok(!(await call('state',undefined,teamAuth)).data.records.some(r=>r.kind==='ai-job'));
assert.equal((await call('team-list',undefined,categoryAuth)).data.jobs.length,0);assert.equal((await call('team-advance',{id:teamId},categoryAuth)).status,500);
assert.equal((await call('team-decision',{id:teamId,version:1,action:'approve'},teamAuth)).status,500);
team=await call('team-decision',{id:teamId,version:team.data.version,action:'hold',feedback:'대표 검토 중'},teamAuth);assert.equal(team.data.status,'held');
team=await call('team-decision',{id:teamId,version:team.data.version,action:'revise',feedback:'최신 시세가 없는 점을 더 명확하게 표시하세요.'},teamAuth);assert.equal(team.data.status,'running');assert.equal(team.data.revision,1);assert.equal(team.data.archives.length,1);assert.ok(!JSON.stringify(team.data).includes('resp_test'));
team=await call('team-decision',{id:teamId,version:team.data.version,action:'cancel'},teamAuth);assert.equal(team.data.status,'cancelled');await call('team-advance',{id:teamId},teamAuth);assert.equal(modelCreates,5);
let second=await call('team-create',{...payload,requestId:crypto.randomUUID(),includeOffice:false},teamAuth);const secondId=second.data.id;assert.equal(second.data.contextInfo.holdings,0);
creditFailure=true;await call('team-advance',{id:secondId},teamAuth);second=await call('team-advance',{id:secondId},teamAuth);assert.equal(second.data.status,'error');assert.match(second.data.steps[0].error,/크레딧/);
creditFailure=false;second=await call('team-retry',{id:secondId,version:second.data.version},teamAuth);assert.equal(second.data.status,'running');
await call('team-advance',{id:secondId},teamAuth);const acceptedCreates=modelCreates,successfulFetch=globalThis.fetch;
globalThis.fetch=async()=>{throw new Error('temporary network failure');};
for(let i=0;i<3;i++)second=await call('team-advance',{id:secondId},teamAuth);
assert.equal(second.data.status,'error');assert.equal(second.data.steps[0].retryPoll,true);
second=await call('team-retry',{id:secondId,version:second.data.version},teamAuth);
globalThis.fetch=successfulFetch;second=await call('team-advance',{id:secondId},teamAuth);
assert.equal(second.data.steps[0].status,'complete');assert.equal(modelCreates,acceptedCreates);
for(let i=0;i<12;i++){second=await call('team-advance',{id:secondId},teamAuth);if(second.data.status==='awaiting_decision')break;}assert.equal(second.data.status,'awaiting_decision');const beforeApproval=modelCreates;
second=await call('team-decision',{id:secondId,version:second.data.version,action:'approve',feedback:'내용 확인'},teamAuth);assert.equal(second.data.status,'approved');await call('team-advance',{id:secondId},teamAuth);assert.equal(modelCreates,beforeApproval);assert.equal(second.data.decisions.at(-1).action,'approve');
await call('logout',{},teamAuth);const finalLogin=await call('session',{username:'datascience_user1',password:'1234'},{owner:'team-owner'});const persistent=(await call('team-list',undefined,{owner:'team-owner',token:finalLogin.data.sessionToken})).data;assert.equal(persistent.jobs.length,2);assert.equal(persistent.jobs.find(j=>j.id===secondId).status,'approved');
const {responseResult,aiFailureMessage}=await import(path.join(out,'sol.mjs'));assert.match(aiFailureMessage('credit_balance_exhausted'),/크레딧/);assert.throws(()=>responseResult({status:'completed',output:[{type:'message',content:[{type:'refusal'}]}]}));assert.throws(()=>responseResult({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'{"findings":[]}' }]}]}));
console.log('PASS: five separate Sol requests, persisted delegation, concurrent request lease, owner/CSRF isolation, no client keys, user-only approvals, revision archives, cancellation, credit failure/retry and logout persistence');

// Explicit provider choice, encrypted Claude key and diagnostics (all mocked, no paid calls).
const chooseLogin=await call('session',{username:'datascience_user1',password:'1234'},{owner:'choice-owner'}),chooseAuth={owner:'choice-owner',token:chooseLogin.data.sessionToken};
assert.equal((await call('team-preference',{model:'unknown'},chooseAuth)).status,500);
assert.equal((await call('team-create',{...payload,model:'unknown',requestId:crypto.randomUUID()},chooseAuth)).status,500);
assert.equal((await call('team-preference',{model:'claude-sonnet-5'},chooseAuth)).status,200);
assert.equal((await call('team-list',undefined,chooseAuth)).data.selectedModel,'claude-sonnet-5');
assert.equal((await call('team-create',{...payload,model:'claude-sonnet-5',requestId:crypto.randomUUID()},chooseAuth)).status,500);
const claudeTestKey='claude-unit-test-key-not-a-real-secret';
assert.equal((await call('team-claude-key',{key:claudeTestKey},{...chooseAuth,origin:'https://evil.example'})).status,403);
assert.equal((await call('team-claude-key',{key:claudeTestKey},{anonymous:true})).status,401);
assert.equal((await call('team-claude-key',{key:claudeTestKey},chooseAuth)).status,200);
assert.ok(sql.prepare('SELECT data FROM secrets').all().every(r=>!r.data.includes(claudeTestKey)));
assert.equal((await call('team-list',undefined,chooseAuth)).data.providers.anthropic,true);
assert.equal((await call('team-list',undefined,categoryAuth)).data.providers.anthropic,false);
let claudeCalls=0;const claudeBodies=[];
globalThis.fetch=async(url,opts)=>{assert.equal(url,'https://api.anthropic.com/v1/messages');assert.equal(opts.headers['x-api-key'],claudeTestKey);assert.equal(opts.headers['anthropic-version'],'2023-06-01');assert.equal(opts.redirect,'manual');const body=JSON.parse(opts.body);claudeBodies.push(body);assert.equal(body.output_config.format.type,'json_schema');assert.ok(!body.tools);assert.ok(!body.background);claudeCalls++;return Response.json({id:'msg_mock'+claudeCalls,model:body.model,stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(fakeResult)}],usage:{input_tokens:100,output_tokens:150}});};
let choice=await call('team-create',{...payload,model:'claude-sonnet-5',requestId:crypto.randomUUID()},chooseAuth);assert.equal(choice.data.provider,'anthropic');const choiceId=choice.data.id;
await call('team-preference',{model:'gpt-5.6-sol'},chooseAuth);
for(let i=0;i<5;i++)choice=await call('team-advance',{id:choiceId},chooseAuth);
assert.equal(choice.data.status,'awaiting_decision');assert.equal(claudeCalls,5);assert.ok(claudeBodies.every(b=>b.model==='claude-sonnet-5'));assert.equal(choice.data.steps[0].usage.total,250);assert.ok(choice.data.steps.every(s=>s.model==='claude-sonnet-5'));assert.ok(!JSON.stringify(choice.data).includes(claudeTestKey));assert.equal(JSON.parse(claudeBodies[4].messages[0].content).previous_results.length,4);
choice=await call('team-decision',{id:choiceId,version:choice.data.version,action:'approve'},chooseAuth);assert.equal(choice.data.status,'approved');
let failedClaude=await call('team-create',{...payload,model:'claude-opus-5',requestId:crypto.randomUUID()},chooseAuth);globalThis.fetch=async(url)=>{assert.equal(url,'https://api.anthropic.com/v1/messages');return Response.json({error:{message:claudeTestKey}},{status:401});};failedClaude=await call('team-advance',{id:failedClaude.data.id},chooseAuth);assert.equal(failedClaude.data.status,'error');assert.match(failedClaude.data.steps[0].error,/인증/);assert.ok(!JSON.stringify(failedClaude.data).includes(claudeTestKey));assert.equal(failedClaude.data.model,'claude-opus-5');
assert.equal((await call('team-openai-check',{}, {anonymous:true})).status,401);
globalThis.fetch=async(url,opts)=>{assert.equal(url,'https://api.openai.com/v1/responses');const b=JSON.parse(opts.body);assert.equal(b.model,'gpt-5.6-sol');assert.equal(b.store,false);assert.ok(b.max_output_tokens<=64);return Response.json({status:'completed',model:b.model});};assert.equal((await call('team-openai-check',{},chooseAuth)).data.ok,true);
for(const code of ['credit_balance_exhausted','project_spend_limit_exceeded','organization_spend_limit_exceeded']){globalThis.fetch=async()=>Response.json({error:{code,message:'private error'}},{status:429});const result=await call('team-openai-check',{},chooseAuth);assert.equal(result.data.ok,false);assert.equal(result.data.code,code);assert.ok(!result.data.message.includes('private error'));}
console.log('PASS: persisted model choice, Claude provider routing, encrypted owner-scoped keys, no provider fallback, existing job model immutability, safe GPT billing diagnostics');

// User-supplied OpenAI keys: all API paths use the same encrypted owner credential.
const personalOpenAIKey='sk-unit-test-personal-key-not-real';
assert.equal((await call('team-openai-key',{key:personalOpenAIKey},{anonymous:true})).status,401);
assert.equal((await call('team-openai-key',{key:personalOpenAIKey},{...chooseAuth,origin:'https://evil.example'})).status,403);
assert.equal((await call('team-openai-key',{key:'invalid'},chooseAuth)).status,500);
let keySaveCalls=0;globalThis.fetch=async()=>{keySaveCalls++;throw new Error('Save must not call an API');};
const savedKeyResult=await call('team-openai-key',{key:personalOpenAIKey},chooseAuth);assert.equal(savedKeyResult.status,200);assert.equal(keySaveCalls,0);assert.ok(!JSON.stringify(savedKeyResult).includes(personalOpenAIKey));
assert.ok(sql.prepare('SELECT data FROM secrets').all().every(r=>!r.data.includes(personalOpenAIKey)));
let ownConfig=(await call('team-list',undefined,chooseAuth)).data;assert.equal(ownConfig.openaiKeySource,'personal');assert.equal(ownConfig.providers.openai,true);assert.equal(ownConfig.providers.anthropic,true);assert.ok(!JSON.stringify(ownConfig).includes(personalOpenAIKey));
assert.equal((await call('team-list',undefined,categoryAuth)).data.openaiKeySource,'server');
assert.equal((await call('team-openai-key',{key:''},chooseAuth)).status,500);
const openAIRequests=[];
globalThis.fetch=async(url,options)=>{assert.ok(url.startsWith('https://api.openai.com/v1/responses'));assert.equal(options.headers.Authorization,'Bearer '+personalOpenAIKey);openAIRequests.push({url,method:options.method});if(url.endsWith('/cancel'))return Response.json({status:'cancelled'});if(options.method==='GET')return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(fakeResult)}]}]});const b=JSON.parse(options.body);return Response.json(b.background?{id:'resp_personal'+openAIRequests.length,status:'queued'}:{status:'completed',model:b.model});};
assert.equal((await call('team-openai-check',{},chooseAuth)).data.ok,true);
let personalJob=await call('team-create',{...payload,model:'gpt-5.6-sol',requestId:crypto.randomUUID()},chooseAuth);assert.equal(personalJob.status,200);
personalJob=await call('team-advance',{id:personalJob.data.id},chooseAuth);assert.equal(personalJob.data.steps[0].status,'running');
personalJob=await call('team-advance',{id:personalJob.data.id},chooseAuth);assert.equal(personalJob.data.steps[0].status,'complete');
personalJob=await call('team-advance',{id:personalJob.data.id},chooseAuth);
personalJob=await call('team-decision',{id:personalJob.data.id,version:personalJob.data.version,action:'cancel'},chooseAuth);assert.equal(personalJob.data.status,'cancelled');assert.ok(openAIRequests.some(r=>r.url.endsWith('/cancel')));assert.ok(openAIRequests.some(r=>r.method==='GET'));
await call('logout',{},chooseAuth);const keyRelogin=await call('session',{username:'datascience_user1',password:'1234'},{owner:'choice-owner'}),keyAuth={owner:'choice-owner',token:keyRelogin.data.sessionToken};assert.equal((await call('team-list',undefined,keyAuth)).data.openaiKeySource,'personal');
let failedPersonalCalls=0;globalThis.fetch=async(url,options)=>{failedPersonalCalls++;assert.equal(options.headers.Authorization,'Bearer '+personalOpenAIKey);return Response.json({error:{message:personalOpenAIKey}},{status:401});};const badPersonal=await call('team-openai-check',{},keyAuth);assert.equal(badPersonal.data.ok,false);assert.equal(failedPersonalCalls,1);assert.ok(!JSON.stringify(badPersonal).includes(personalOpenAIKey));
globalThis.__officeEnv.OPENAI_API_KEY='';assert.equal((await call('team-list',undefined,keyAuth)).data.providers.openai,true);assert.equal((await call('team-list',undefined,categoryAuth)).data.providers.openai,false);
console.log('PASS: personal GPT key save without API calls, encryption, owner/CSRF isolation, persistence, correct key for test/create/poll/cancel, no fallback after authentication failure');

// Apartment data: factual extraction, guest-page flow, isolation and failure preservation.
const estate=await import(path.join(out,'apartment-data.mjs'));const {estatePage}=await import(path.join(out,'apartments.mjs'));const {createCipheriv}=await import('node:crypto');
const present=(d)=>'<script id="__HGNN_DATA__" type="application/json">'+JSON.stringify(d)+'</script>';
const apartmentHTML=present({altState:{AptStore:{detail:{id:'testA',name:'시험아파트',address:'서울특별시 시험구 시험동 1',total_household:100,baseinfo:{floor_max:20},dongList:[{name:'101',highest_floor:20,isPopular:true}],area:[{area_type:'110A',private_area:84.99}],molitTradeReal:[{id:1,category:1,price:60000,date:'2026-09-01T15:00:00.000Z',floor:8,areaType:'110A',isCancelled:false}]}}}});
const listingHTML=present({queryState:{queries:[{queryKey:[{entity:'getAptItemCatalogsInfinite',params:{aptHash:'testA'}}],state:{data:{pages:[{itemCatalogSummaries:[{aptHash:'testA',tradeType:0,deposit:65000,privateArea:84.99,publicArea:110,aptDongName:'101동',floor:'중',itemTitle:'로얄동 로얄층',areaHoId:1,itemIds:[{itemId:2}],danjiRoomType:'110A'},{aptHash:'testA',tradeType:1,deposit:30000,privateArea:84.99}],itemCatalogTotalCount:8,itemCatalogCountPerTradeType:{trade:5}}]}}}]}});
assert.equal(estate.parseApartment(apartmentHTML,'testA').trades[0].date,'2026-09-02');assert.throws(()=>estate.parseApartment(apartmentHTML,'wrong'));
assert.equal(estate.parseApartmentListings(listingHTML,'testA').items.length,1);assert.equal(estate.parseApartmentListings(listingHTML,'testA').items[0].floor,'중');assert.throws(()=>estate.parseApartmentListings('blocked','testA'));assert.equal(estate.koreanPrice('12억 3,000'),123000);
const presentationKey='example-key-1234';const encField=v=>{const c=createCipheriv('aes-128-ecb',Buffer.from(presentationKey),null);return Buffer.concat([c.update(v,'utf8'),c.final()]).toString('base64');};
const asilPayload=[{val:[{yyyymm:'202609',val:[{day:2,val:[{money:encField('6억'),rent:encField(''),dong:encField('101'),floor:'8',type:'84',option:'0',k:'1',a:'1',s:'1'},{money:encField('6억'),rent:encField(''),dong:encField('101'),floor:'8',type:'84',option:'1',k:'1',a:'1',s:'2'},{money:encField('3억'),rent:encField('0'),dong:encField('101'),floor:'8',type:'84',option:'0'}]}]}]}];
const asilHTML='<h2>시험아파트</h2><p>주소 : 서울 시험구 시험동 1 사용승인</p><script>newver_6.jsp?sido=11&dealmode=123&seq=123&m2=84;getKey("'+presentationKey+'");search3(0, \'84\', \'33\')</script>';
let estateCalls=[];globalThis.fetch=async(raw,options)=>{const u=String(raw);assert.equal(options.redirect,'manual');estateCalls.push(u);if(u.includes('getAptname'))return Response.json([{name:'시험아파트',seq:'123',type:'1',desc:'서울 시험구 시험동 / 아파트'}]);if(u.includes('apt_info'))return new Response(asilHTML,{headers:{'set-cookie':'JSESSIONID=public-guest; Path=/'}});if(u.includes('apt_price')){assert.equal(options.headers.Cookie,'JSESSIONID=public-guest');assert.ok(options.headers.Referer.includes('apt_info'));return Response.json(asilPayload);}return new Response(u.includes('item-catalog')?listingHTML:apartmentHTML);};
const apartmentResult=await call('apartment-refresh',{id:'testA'},keyAuth);assert.equal(apartmentResult.status,200);assert.equal(apartmentResult.data.asil.trades.length,2);assert.equal(apartmentResult.data.asil.trades[0].price,60000);assert.equal(apartmentResult.data.asil.trades[1].cancelled,true);assert.equal(apartmentResult.data.listings.items.length,1);assert.equal(apartmentResult.data.royal[0].floors[0].floor,'중');
assert.equal((await call('apartment-read',{id:'testA'},categoryAuth)).data,null);assert.equal((await call('apartment-read',{id:'testA'},keyAuth)).data.apt.name,'시험아파트');assert.equal((await call('apartment-refresh',{id:'../private'},keyAuth)).status,500);
globalThis.fetch=async(raw)=>new Response(String(raw).endsWith('/testA')?apartmentHTML:'blocked',{status:String(raw).endsWith('/testA')?200:403});const oldApartment=await call('apartment-refresh',{id:'testA'},keyAuth);assert.equal(oldApartment.data.listings.items.length,1);assert.equal(oldApartment.data.asil.trades.length,2);assert.ok(oldApartment.data.listingError);assert.ok(oldApartment.data.asilError);
assert.equal((await call('state',undefined,keyAuth)).data.records.some(x=>x.kind.startsWith('apartment-')),false);
globalThis.fetch=async()=>new Response(null,{status:302,headers:{location:'https://example.com/private'}});await assert.rejects(estatePage('https://hogangnono.com/apt/testA'),/허용되지/);await assert.rejects(estatePage('http://127.0.0.1/'),/허용되지/);
console.log('PASS: apartment extraction, sale vs rent, KST dates, cancellation, unchanged floor labels, guest Asil flow, matched apartment identities, persistent owner-scoped records, failed-source preservation and redirect allowlist');

const kd=await import(path.join(out,'kospi-data.mjs'));const kr=await import(path.join(out,'kospi-ranking.mjs'));
const testMembers=Array.from({length:200},(_,i)=>({code:String(i+1).padStart(6,'0'),name:'가상기업'+i}));const memberFixture='<title>코스피200 편입종목</title><script>window.__NUXT__=(function(a){return {kospi200:['+testMembers.map(m=>'{'+'jmcode:"KR7'+m.code+'003",shcode:"'+m.code+'",jmseq:"0",shname:"'+m.name+'",ename:"test"}').join(',')+']}}("safe"));</script>';
assert.equal(kd.parseKospiMembers(memberFixture).length,200);assert.throws(()=>kd.parseKospiMembers(memberFixture.replace('코스피200','잘못된 지수')));assert.throws(()=>kd.parseKospiMembers(memberFixture.replace('KR7000001003','KR7000002003')));
const closedDay=new Date(Date.now()+9*3600000);closedDay.setUTCDate(closedDay.getUTCDate()-1);const bars=Array.from({length:80},(_,i)=>{const d=new Date(closedDay);d.setUTCDate(d.getUTCDate()-(79-i));const close=10000+i*5+(i%4)*12;return {date:d.toISOString().slice(0,10).replaceAll('-',''),open:close-5,high:close+50,low:close-50,close,volume:10000+(i%3)*500};});
const xmlFor=code=>'<protocol><chartdata symbol="'+code+'" timeframe="day">'+bars.map(r=>'<item data="'+[r.date,r.open,r.high,r.low,r.close,r.volume].join('|')+'"/>').join('')+'</chartdata></protocol>';
assert.equal(kd.parseChartFeed(xmlFor('0126Z0'),'0126Z0').length,80);assert.throws(()=>kd.parseChartFeed(xmlFor('000001'),'000002'));const scored=kd.technicalRank(bars,new Date(),bars.at(-1).date);assert.ok(scored.score>=0&&scored.score<=100);assert.ok(scored.plan.stop<scored.plan.buyLow&&scored.plan.buyLow<scored.plan.buyHigh&&scored.plan.buyHigh<scored.plan.target1&&scored.plan.target1<scored.plan.target2);assert.equal(kd.technicalRank(bars.slice(-10)).score,null);assert.equal(kd.technicalRank(bars,new Date(),'19000101').score,null);assert.equal(kd.technicalRank(bars.map((r,i)=>({...r,volume:i===79?0:r.volume}))).score,null);
assert.equal(kd.rankCutoff(new Date('2026-10-07T11:59:00Z')).includeToday,false);assert.equal(kd.rankCutoff(new Date('2026-10-07T12:00:00Z')).includeToday,true);
let rankFetchCalls=0;globalThis.fetch=async(raw,options)=>{assert.equal(options.redirect,'manual');rankFetchCalls++;const u=new URL(raw);return new Response(u.hostname==='markets.hankyung.com'?memberFixture:xmlFor(u.searchParams.get('symbol')));};
const startRank=await call('kospi-start',{},keyAuth);assert.equal(startRank.status,200);assert.equal(startRank.data.job.total,200);assert.equal((await call('kospi-ranking',undefined,categoryAuth)).data.job,null);
const advancedRank=await call('kospi-advance',{runId:startRank.data.job.runId},keyAuth);assert.equal(advancedRank.status,200);assert.equal(advancedRank.data.job.done,6);assert.equal(advancedRank.data.job.items.length,6);assert.equal((await call('kospi-start',{},keyAuth)).data.job.runId,startRank.data.job.runId);assert.equal((await call('kospi-chart',{code:'000001'},categoryAuth)).status,500);
const chartRank=await call('kospi-chart',{code:'000001'},keyAuth);assert.equal(chartRank.status,200);assert.equal(chartRank.data.rows.length,80);assert.equal(chartRank.data.fullPeriod,false);const callsBeforeCache=rankFetchCalls;assert.equal((await call('kospi-chart',{code:'000001'},keyAuth)).status,200);assert.equal(rankFetchCalls,callsBeforeCache);
const simultaneous=await Promise.all([call('kospi-advance',{runId:startRank.data.job.runId},keyAuth),call('kospi-advance',{runId:startRank.data.job.runId},keyAuth)]);assert.ok(simultaneous.some(r=>r.status===200));const resumedRank=(await call('kospi-ranking',undefined,keyAuth)).data.job;assert.ok(resumedRank.done===12||resumedRank.done===18);assert.equal(new Set(resumedRank.items.map(x=>x.code)).size,resumedRank.done);assert.equal((await call('state',undefined,keyAuth)).data.records.some(x=>x.kind.startsWith('kospi-')||x.kind.startsWith('rank-chart-')),false);
let finishedRank=resumedRank;while(finishedRank.status!=='complete'){const next=await call('kospi-advance',{runId:finishedRank.runId},keyAuth);assert.equal(next.status,200);finishedRank=next.data.job;}assert.equal(finishedRank.done,200);assert.equal(finishedRank.items.length,200);assert.equal((await call('kospi-ranking',undefined,keyAuth)).data.previous.items.length,200);
globalThis.fetch=async()=>new Response(null,{status:302,headers:{location:'https://evil.example/'}});await assert.rejects(kr.rankPage(kd.MEMBER_SOURCE),/허용되지/);
console.log('PASS: full constituent validation, alphanumeric symbols, chart identity, completed-session cutoff, scoring guards, ordered trade targets, resumable ranking, concurrency lease, chart cache, owner isolation and allowed redirects');
