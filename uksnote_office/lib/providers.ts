import {records,cache} from './server';
import {parseQuote,parseNews,parseRanking,articleDate} from './public-pages';
import {newsCategory} from './news-categories';
import {summarizeArticle} from './news-summary';
// Only public HTML documents are requested. No external API endpoints or keys.
export async function page(url:string){
 const signal=AbortSignal.timeout(12000);let current=new URL(url);
 for(let hop=0;hop<=3;hop++){
  if(current.protocol!=='https:'||current.username||current.password||current.port||!['news.naver.com','n.news.naver.com','m.stock.naver.com','stock.naver.com'].includes(current.hostname))throw new Error('허용되지 않은 공개 페이지 이동입니다.');
  const r=await fetch(current.toString(),{headers:{Accept:'text/html','Accept-Language':'ko-KR,ko;q=0.9'},signal,cache:'no-store',redirect:'manual'});
  if([301,302,303,307,308].includes(r.status)){const next=r.headers.get('location');await r.body?.cancel();if(!next)throw new Error('공개 페이지 이동 주소를 확인하지 못했습니다.');current=new URL(next,current);continue;}
  if(!r.ok)throw new Error(`공개 페이지 응답 오류 (${r.status})`);
  const body=await r.text();if(body.length>2500000)throw new Error('공개 페이지 크기 제한을 초과했습니다.');return body;
 }
 throw new Error('공개 페이지 이동이 너무 많습니다. 잠시 후 다시 조회해 주세요.');
}

export async function refreshQuotes(owner:string){const holdings=[...await records(owner,'holding'),...await records(owner,'watch')];const codes=[...new Set<string>(holdings.map(h=>h.code))];if(!codes.length)throw new Error('먼저 보유 종목 또는 관심종목을 등록해 주세요.');const existing=(await records(owner,'quotes'))[0]?.items||{},items={...existing},errors:string[]=[];let count=0;
 // Limit parallel requests and preserve cached values when a source fails.
 const selected=codes.slice(0,40);if(codes.length>40)errors.push('한 번에 최대 40개 종목을 조회합니다.');
 for(let i=0;i<selected.length;i+=4)await Promise.all(selected.slice(i,i+4).map(async code=>{try{const q=parseQuote(await page(`https://m.stock.naver.com/domestic/stock/${code}/total`),code);const now=new Date().toISOString();items[code]={...q,fetchedAt:now,historyFetchedAt:q.history.length?now:null,historyError:q.history.length?'':'공개 일봉 데이터 미제공'};count++;}catch(e){errors.push(code+': '+(e instanceof Error?e.message:'조회 실패')+' · 이전 시세 유지');}}));
 if(count)await cache(owner,'quotes',{items});return {items,count,errors};}
export async function refreshNews(owner:string,category='economy'){
 const config=newsCategory(category);if(!config)throw new Error('지원하지 않는 뉴스 분야입니다.');
 const html=await page(config.url);const items=config.id==='ranking'?parseRanking(html):parseNews(html);const errors:string[]=[];
 const previous=(await records(owner,config.id==='economy'?'news':'news-'+config.id))[0]?.digest||[];
 for(let i=0;i<items.length;i+=5)await Promise.all(items.slice(i,i+5).map(async n=>{
  try{const article=await page(n.url);n.publishedAt=articleDate(article);Object.assign(n,summarizeArticle(article,n.title));}
  catch{n.publishedAt=null;Object.assign(n,{summaryStatus:'fetch-failed',summaryPoints:[],keywords:[],summaryError:'본문 연결에 실패했습니다. 다시 가져오거나 원문을 확인해 주세요.'});}
  if(n.summaryStatus!=='ready'){const old=previous.find((p:any)=>p.url.split('?')[0]===n.url.split('?')[0]&&p.title===n.title&&p.summaryPoints?.length);if(old)Object.assign(n,{summaryStatus:'cached',summaryPoints:old.summaryPoints,keywords:old.keywords||[],summaryMethod:old.summaryMethod,summaryGeneratedAt:old.summaryGeneratedAt});}
 }));
 const ready=items.filter(n=>n.summaryStatus==='ready').length;if(ready<items.length)errors.push(`본문 요약 ${ready}/${items.length}건 완료 · 나머지는 기사별 상태 확인`);
 if(items.some(n=>!n.publishedAt))errors.push('일부 기사 발행 시각 미확인 · 날짜 기반 분석에서 제외');
 const data={category:config.id,items:items.map(n=>({...n,category:config.id})),digest:items,fetchedAt:new Date().toISOString(),source:`네이버 ${config.name} 공개 페이지`,sourceUrl:config.url,errors};
 // Separate records preserve other categories during concurrent refreshes and failures.
 await cache(owner,config.id==='economy'?'news':'news-'+config.id,data);return data;
}
