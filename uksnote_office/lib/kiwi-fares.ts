import {FareTask} from './flight-fares';
import {safeURL,validDate,todayKST} from './travel-data';

export type KiwiTask=FareTask&{flex?:boolean;outWindow?:number[];backWindow?:number[]};
const ENDPOINT='https://mcp.kiwi.com';
const windows=(band:string,strict:boolean)=>!strict||band==='any'?[undefined]:band==='morning'?[[6,9]]:band==='evening'?[[18,21]]:[[0,6],[21,23]];
export function kiwiTasks(p:any):KiwiTask[]{
 const from=p.originAirport.code,to=p.destinationAirport.code,out=windows(p.outBand,p.strictTime),back=windows(p.returnBand,p.strictTime),tasks:KiwiTask[]=[];
 const add=(flex=false)=>{for(const outWindow of out)for(const backWindow of back)tasks.push({from,to,depart:p.start,back:p.end,flex,outWindow,backWindow});for(const outWindow of out)tasks.push({from,to,depart:p.start,flex,outWindow});for(const outWindow of back)tasks.push({from:to,to:from,depart:p.end,flex,outWindow});};
 add();if(p.flex)add(true);
 if(p.alternates)for(const pair of [...p.nearbyOrigins.map((x:any)=>({from:x.code,to})),...p.nearbyDestinations.map((x:any)=>({from,to:x.code}))])for(const outWindow of out)for(const backWindow of back)tasks.push({...pair,depart:p.start,back:p.end,outWindow,backWindow});
 return tasks;
}
const kiwiDate=(s:string)=>s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4);
export function kiwiArguments(t:KiwiTask,p:any){
 const args:any={flyFrom:t.from,flyTo:t.to,departureDate:kiwiDate(t.depart),adults:p.adults,children:0,infants:0,currency:'KRW',locale:'en',cabinClass:'M',max_sector_stopovers:0,select_airlines:p.airlines.join(','),sort:'price'};
 if(t.back)args.returnDate=kiwiDate(t.back);
 if(t.flex){const dates=p.pairs.map((x:any)=>t.from===p.originAirport.code?x.depart:x.back).sort();args.departureDate=kiwiDate(dates[0]);args.departureDateTo=kiwiDate(dates.at(-1));if(t.back){const backs=p.pairs.map((x:any)=>x.back).sort();args.returnDate=kiwiDate(backs[0]);args.returnDateTo=kiwiDate(backs.at(-1));}}
 if(t.outWindow){args.dtime_from=t.outWindow[0];args.dtime_to=t.outWindow[1];}if(t.backWindow){args.ret_dtime_from=t.backWindow[0];args.ret_dtime_to=t.backWindow[1];}
 if(p.baggage)args.adults_hold_bags=Array(p.adults).fill(1);
 return args;
}
// Bound each response and stop at its matching JSON-RPC message, even if SSE stays open.
export async function readMcpResponse(response:Response,id:number){
 if(!response.ok)throw Error(`Kiwi.com 연결 HTTP ${response.status}`);
 const reader=response.body?.getReader();if(!reader)throw Error('Kiwi.com 응답이 비어 있습니다.');
 const decoder=new TextDecoder();let buffer='',bytes=0;const sse=response.headers.get('content-type')?.includes('text/event-stream');
 const parse=(s:string)=>{try{const d=JSON.parse(s);return d.id===id?d:null;}catch{return null;}};
 try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2500000)throw Error('Kiwi.com 응답 크기 제한 초과');buffer+=decoder.decode(value,{stream:true});
  if(sse){let match;while((match=/\r?\n\r?\n/.exec(buffer))){const event=buffer.slice(0,match.index);buffer=buffer.slice(match.index+match[0].length);const d=parse(event.split(/\r?\n/).filter(x=>x.startsWith('data:')).map(x=>x.slice(5).trimStart()).join('\n'));if(d)return d;}}
  else {const d=parse(buffer);if(d)return d;}
 }const d=parse(buffer);if(d)return d;throw Error('Kiwi.com 검색 응답을 읽지 못했습니다.');}finally{await reader.cancel().catch(()=>{});}
}
async function kiwiSearch(args:any){
 const signal=AbortSignal.timeout(45000),headers:Record<string,string>={'Content-Type':'application/json',Accept:'application/json, text/event-stream'};
 const send=(body:any)=>fetch(ENDPOINT,{method:'POST',headers,body:JSON.stringify(body),signal,redirect:'error'});
 const init=await send({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'UKS-OFFICE',version:'1.0'}}});
 const session=init.headers.get('mcp-session-id'),hello=await readMcpResponse(init,1);if(hello.error||!hello.result?.capabilities?.tools)throw Error('Kiwi.com 항공 검색 도구를 사용할 수 없습니다.');
 headers['MCP-Protocol-Version']=hello.result.protocolVersion||'2025-03-26';if(session)headers['Mcp-Session-Id']=session;
 const ready=await send({jsonrpc:'2.0',method:'notifications/initialized'});await ready.body?.cancel();if(!ready.ok)throw Error('Kiwi.com 검색 연결 초기화 실패');
 const rpc=await readMcpResponse(await send({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'search-flight',arguments:args}}),2);
 if(rpc.error||rpc.result?.isError)throw Error('Kiwi.com이 검색을 완료하지 못했습니다. 잠시 후 새로 조회하세요.');
 let data=rpc.result?.structuredContent;if(!data){try{data=JSON.parse(rpc.result.content.find((x:any)=>x.type==='text').text);}catch{throw Error('Kiwi.com 운임 데이터 형식이 변경됐습니다.');}}
 if(data.error)throw Error('Kiwi.com 운임 검색 실패. 날짜·공항을 확인하거나 잠시 후 다시 조회하세요.');return data;
}
export function parseKiwiFares(data:any,t:KiwiTask,p:any,checkedAt=new Date().toISOString()){
 if(data.currency!=='KRW'||data.passengers?.adults!==p.adults||data.passengers?.children!==0||data.passengers?.infants!==0||!Array.isArray(data.itineraries))throw Error('Kiwi.com 응답의 통화·인원이 검색 조건과 다릅니다.');
 const offers:any[]=[],oneWayFares:any[]=[],sources:any[]=[],positive=(x:any)=>typeof x==='number'&&Number.isFinite(x)&&x>0;
 const allowedDate=(s:string,back:boolean)=>validDate(s)&&s>=todayKST()&&(t.flex?p.pairs.some((x:any)=>(back||t.from===p.destinationAirport.code?x.back:x.depart)===s):s===(back?t.back:t.depart));
 const validLeg=(l:any,back=false)=>l&&l.stops===0&&l.segments?.length===1&&JSON.stringify(l.route)===JSON.stringify(back?[t.to,t.from]:[t.from,t.to])&&l.from===(back?t.to:t.from)&&l.to===(back?t.from:t.to)&&l.segments[0].from===l.from&&l.segments[0].to===l.to&&p.airlines.includes(l.segments[0].carrier)&&l.cabinClass==='Economy'&&l.segments[0].cabinClass==='Economy'&&typeof l.departureTime==='string'&&/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d/.test(l.departureTime)&&allowedDate(l.departureTime.slice(0,10),back);
 for(const item of data.itineraries.slice(0,100)){
  const o=item.outbound,r=item.inbound,sourceUrl=safeURL(item.bookingUrl);if(!sourceUrl||new URL(sourceUrl).protocol!=='https:'||!['kiwi.com','www.kiwi.com'].includes(new URL(sourceUrl).hostname)||!positive(item.price)||!validLeg(o)||t.back&&!validLeg(r,true)||!t.back&&r)continue;
  const checked=item.baggage?.checkedBag,baggage=typeof checked==='number'&&checked>0?'included':checked===0?'excluded':'unknown',amount=Math.round(item.price),codes=[o.segments[0].carrier,...(r?[r.segments[0].carrier]:[])];
  const common={partySize:p.adults,taxesIncluded:false,displayPriceVerified:true,sourceUrl,evidence:`Kiwi.com MCP · 성인 ${p.adults}명 ${t.back?'왕복':'편도'} 표시가 ${amount.toLocaleString('ko-KR')}원`,seller:'Kiwi.com',checkedAt,baggage,flightNumbers:[o.segments[0].flightNumber,...(r?[r.segments[0].flightNumber]:[])]};
  if(t.back)offers.push({...common,label:codes[0]===codes[1]?'Kiwi.com 직항 왕복':'Kiwi.com 다른 항공사 왕복 조합',kind:'roundtrip',from:t.from,to:t.to,depart:o.departureTime.slice(0,10),back:r.departureTime.slice(0,10),outTime:o.departureTime.slice(11,16),returnTime:r.departureTime.slice(11,16),outStops:0,returnStops:0,outAirlineCode:codes[0],returnAirlineCode:codes[1],airlineCodes:[...new Set(codes)],airfareKRW:amount,priceConfirmed:true,transferKRW:null,legs:[],notes:'Kiwi.com에서 예약 · 최종 금액과 수하물·변경 조건 확인'});
  else oneWayFares.push({...common,stops:0,airlineCode:codes[0],from:t.from,to:t.to,date:o.departureTime.slice(0,10),time:o.departureTime.slice(11,16),amountKRW:amount});
  sources.push({url:sourceUrl,title:`Kiwi.com ${t.from}→${t.to} ${o.departureTime.slice(0,10)}`,provider:'Kiwi.com MCP'});
 }
 return {offers,oneWayFares,sources,checkedAt,received:data.itineraries.length,accepted:offers.length+oneWayFares.length};
}
export async function collectKiwiFares(t:KiwiTask,p:any){return parseKiwiFares(await kiwiSearch(kiwiArguments(t,p)),t,p);}
