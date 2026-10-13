import {hgnData, type AptListing, type AptTrade} from './apartment-data';
export const targetArea=(n:unknown):'59'|'84'|null=>{const x=Number(n);return x>=59&&x<60?'59':x>=84&&x<85?'84':null;};
export const dongKey=(s:unknown)=>(/미공개|비공개|미확인|[*-]/.test(String(s||''))?'':String(s||'').trim().replace(/\s*동$/,'').trim().replace(/^0+(?=\d)/,''));
const text=(s:unknown)=>typeof s==='string'?s.replace(/\s+/g,' ').trim():'';
export function parseBrokerListings(html:string,id:string,url:string):AptListing[]{
 const d=hgnData(html),q=d?.queryState?.queries?.find((q:any)=>q.queryKey?.some((k:any)=>k.entity==='getItemCatalogDetailsInfinite'));
 const pages=q?.state?.data?.pages;if(!Array.isArray(pages))throw Error('중개사 상세를 읽지 못했습니다.');
 const out:AptListing[]=[];
 for(const p of pages){if(p.aptInfo?.aptHash!==id)throw Error('매물 상세의 단지가 일치하지 않습니다.');
 for(const x of p.items||[]){if(x.aptHash!==id||x.tradeType!==0||!targetArea(x.privateArea)||!(Number(x.deposit)>0))continue;
 const broker=text(x.agent?.agentName);if(!broker)continue;
 out.push({id:'hgn:'+String(x.itemId),price:Number(x.deposit),area:Number(x.privateArea),publicArea:Number(x.publicArea)||null,building:text(x.aptDongName),floor:String(x.itemRequiredInfo?.floor??p.hoInfo?.floor??'미공개'),description:text(x.itemTitle+' '+(x.itemDescription||'')).slice(0,500),sourceUrl:url,type:text(x.danjiRoomType),source:'호갱노노',broker,brokerVerified:true,updatedAt:text(x.effectivenessUpdatedAt),direction:text(x.itemRequiredInfo?.direction)});
 }}return [...new Map(out.map(x=>[x.id,x])).values()];
}
export type Evidence={text:string;url:string;label:string};
export function buildingComparison(data:any,area:'all'|'59'|'84'='all'){
 const items:AptListing[]=[...(data?.listings?.items||[]),...(data?.naver?.items||[]),...(data?.manualListings||[])].filter(x=>targetArea(x.area)&&(area==='all'||targetArea(x.area)===area)&&x.brokerVerified);
 const trades:AptTrade[]=(data?.asil?.trades||[]).filter((x:AptTrade)=>targetArea(x.area)&&(area==='all'||targetArea(x.area)===area));
 const buildings=new Map<string,any>();for(const b of data?.apt?.buildings||[])buildings.set(dongKey(b.name),b);
 for(const x of [...items,...trades])if(dongKey(x.building)&&!buildings.has(dongKey(x.building)))buildings.set(dongKey(x.building),{name:dongKey(x.building),areas:[]});
 const rows=[...buildings].map(([name,b])=>{
 const ls=items.filter(x=>dongKey(x.building)===name),ts=trades.filter(x=>dongKey(x.building)===name).sort((a,b)=>b.date.localeCompare(a.date));
 const prefs=(data?.apt?.areas||[]).filter((a:any)=>targetArea(a.area)&&(area==='all'||targetArea(a.area)===area)&&(a.preferredBuildings||[]).some((n:string)=>dongKey(n)===name));
 const scopePopular=b.popular&&(b.areas||[]).some((n:number)=>targetArea(n)&&(area==='all'||targetArea(n)===area));
 const pros:Evidence[]=prefs.map((a:any)=>({text:`전용 ${a.area}㎡ (${a.type}) 선호 동 표시`,url:data.apt.sourceUrl,label:'호갱노노 평형별 선호 정보'}));
 // Overall popularity is explicitly separated from preferences for 59/84.
 if(scopePopular)pros.push({text:'단지 전체 기준 선호 동 표시 (59·84별 선호 여부는 별도 확인)',url:data.apt.sourceUrl,label:'호갱노노'});
 const cons:Evidence[]=[];
 for(const x of ls){const sentences=x.description.split(/[.!?\n]|[,，]/).map(s=>s.trim()).filter(Boolean);
 for(const s of sentences){const neg=/소음.{0,5}(심|많|발생|주의)|일조.{0,5}(부족|불리)|조망.{0,5}(가림|없|불가)|누수|수리\s*필요|급경사|역.{0,5}멀|임차인|세안고|전세안고|입주\s*불가/.test(s);
 if(neg)cons.push({text:s,url:x.sourceUrl,label:`${x.broker} 매물 설명 · 해당 매물에 한함`});
 else if(/조망|[강산숲]뷰|정원뷰|채광|일조|남향|역세권|역.{0,8}(분|가까)|초.{0,5}(인접|배정)|학군|조용|쾌적/.test(s)&&!/없|않|불가|불리|부족/.test(s))pros.push({text:s,url:x.sourceUrl,label:`${x.broker} 매물 설명 · 해당 매물에 한함`});
 }}
 const unique=(a:Evidence[])=>[...new Map(a.map(x=>[x.text,x])).values()].slice(0,3);
 const stats=(key:string)=>{const t=ts.filter(x=>!x.cancelled&&targetArea(x.area)===key),l=ls.filter(x=>targetArea(x.area)===key);const range=(a:{price:number}[])=>a.length?[Math.min(...a.map(x=>x.price)),Math.max(...a.map(x=>x.price))]:null;return {area:key,trades:t.length,tradeRange:range(t),listings:l.length,askRange:range(l),last:t[0]||null};};
 const claim=ls.find(x=>/로[얄열]동/.test(x.description)&&!/로[얄열]동.{0,4}(아님|아니|않)/.test(x.description));
 return {name,maxFloor:b.maxFloor,areas:b.areas||[],royal:prefs.length?'평형별 선호 동':scopePopular?'단지 선호 동':claim?'중개사 로얄동 주장':'근거 부족',royalLevel:prefs.length?3:scopePopular?2:claim?1:0,royalClaim:claim,pros:unique(pros),cons:unique(cons),stats:(area==='all'?['59','84']:[area]).map(stats),trades:ts,listings:ls};
 }).sort((a,b)=>b.royalLevel-a.royalLevel||a.name.localeCompare(b.name,'ko',{numeric:true}));
 return {rows,items,trades,unknownTrades:trades.filter(x=>!dongKey(x.building)),unknownListings:items.filter(x=>!dongKey(x.building))};
}
export function validateManualListing(input:any,apt:any):AptListing{
 const url=new URL(String(input.sourceUrl||''));if(url.protocol!=='https:'||!['fin.land.naver.com','new.land.naver.com','m.land.naver.com','land.naver.com'].includes(url.hostname)||url.username||url.password||url.port)throw Error('네이버 부동산 매물 원문 주소를 입력하세요.');
 if(!(/\/articles?\//.test(url.pathname)||/\/(?:article|articles)\b/.test(url.pathname)||url.searchParams.has('articleNo')||url.searchParams.has('articleId')))throw Error('단지 주소 대신 개별 매물 링크를 입력하세요.');
 const price=Number(input.price),area=Number(input.area),building=dongKey(input.building),broker=text(input.broker),floor=text(input.floor);
 if(!Number.isFinite(price)||price<=0||price>1e9||!targetArea(area)||!building||building.length>20||!broker||broker.length>100||!floor||floor.length>20)throw Error('매매 금액(만원), 전용 59·84㎡, 동·층, 중개사무소명을 확인하세요.');
 if((apt.buildings||[]).length&&!(apt.buildings||[]).some((b:any)=>dongKey(b.name)===building))throw Error('선택한 단지에 있는 동인지 확인하세요.');
 if(input.confirmed!==true)throw Error('선택 단지의 중개사 등록 매매 매물인지 확인해 주세요.');
 return {id:'manual:'+crypto.randomUUID(),source:'네이버 부동산 · 직접 입력',sourceUrl:url.href,price,area,publicArea:null,building:building+'동',floor,broker,brokerVerified:true,description:text(input.description).slice(0,500),type:'',updatedAt:new Date().toISOString()};
}
