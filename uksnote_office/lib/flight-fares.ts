import {normalizeFares} from './flight-search';
export type FareTask={from:string;to:string;depart:string;back?:string};
export function fareTasks(p:any):FareTask[]{
 const from=p.originAirport.code,to=p.destinationAirport.code,base={from,to,depart:p.start,back:p.end};
 const tasks:FareTask[]=[base,{from,to,depart:p.start},{from:to,to:from,depart:p.end}];
 if(p.flex)for(const pair of p.pairs){tasks.push({from,to,...pair});tasks.push({from,to,depart:pair.depart},{from:to,to:from,depart:pair.back});}
 if(p.alternates)for(const a of p.nearbyOrigins)tasks.push({...base,from:a.code});
 if(p.alternates)for(const a of p.nearbyDestinations)tasks.push({...base,to:a.code});
 return [...new Map(tasks.map(t=>[JSON.stringify(t),t])).values()];
}
export function fareURL(t:FareTask,p:any){const trip=`A.${t.from}.A.${t.to}.${t.depart}`+(t.back?`/A.${t.to}.A.${t.from}.${t.back}`:'');return 'https://air-web.myrealtrip.com/results?'+new URLSearchParams({trip,adult:String(p.adults),cabins:'ECONOMY',tripType:t.back?'ROUND_TRIP':'ONE_WAY',stopovers:'DIRECT',directOnly:'true',airlines:p.airlines.join(','),sort:'price_asc'}).toString();}
function rscObjects(html:string){let text='';for(const m of html.matchAll(/self\.__next_f\.push\(([\s\S]*?)\)<\/script>/g)){try{const v=JSON.parse(m[1]);if(v[0]===1&&typeof v[1]==='string')text+=v[1];}catch{}}
 const objects:any[]=[];for(const line of text.split('\n')){const m=line.match(/^[0-9a-f]+:([\[{].*)$/);if(m)try{objects.push(JSON.parse(m[1]));}catch{}}return objects;
}
export function parseFareHTML(html:string,t:FareTask,p:any,checkedAt=new Date().toISOString()){
 let data:any,request:any;const visit=(v:any)=>{if(!v||typeof v!=='object')return;if(v.initialData?.firstPage)data=v.initialData;if(Array.isArray(v.trips)&&v.params?.adult)request=v;for(const x of Object.values(v))visit(x);};for(const v of rscObjects(html))visit(v);
 if(!data)throw Error('판매처가 운임 데이터를 반환하지 않았습니다. 로그인·접근 제한 또는 응답 형식 변경 가능');
 const expected=[`A.${t.from}.A.${t.to}.${t.depart}`,...(t.back?[`A.${t.to}.A.${t.from}.${t.back}`]:[])];
 if(!request||JSON.stringify(request.trips)!==JSON.stringify(expected)||request.params.adult!==p.adults||data.tripType!==(t.back?'ROUND_TRIP':'ONE_WAY'))throw Error('응답의 공항·날짜·인원이 검색 조건과 다릅니다.');
 if(data.firstPage.status!=='COMPLETED')throw Error('판매처 운임 검색이 아직 완료되지 않았습니다.');
 if(typeof data.expiresAt!=='number'||data.expiresAt<=Date.parse(checkedAt))throw Error('판매처 운임의 유효시간이 지났습니다.');
 const contents=data.firstPage.contents,items=[...(contents?.items||[]),...(contents?.topPicks||[]).map((x:any)=>x.flightItem)].filter(Boolean),sourceUrl=fareURL(t,p),offers:any[]=[],oneWayFares:any[]=[];
 const bag=(s:any)=>s.freeBaggage?.allowance>0?'included':s.freeBaggage?.allowance===0?'excluded':'unknown';
 for(const item of items){
  const schedules=item.schedules;if(!Array.isArray(schedules)||schedules.length!==expected.length||!Number.isInteger(item.seatCount)||item.seatCount<p.adults)continue;
  const valid=schedules.every((s:any,i:number)=>s.stopCount===0&&s.stopAirports?.length===0&&s.legs?.length===1&&s.legs[0].isTechnicalStop===false&&s.cabin==='ECONOMY'&&p.airlines.includes(s.legs[0].operatingCarrier||s.legs[0].marketingCarrier)&&s.departure?.airport?.code===(i?t.to:t.from)&&s.arrival?.airport?.code===(i?t.from:t.to)&&s.departure?.at?.slice(0,10)===(i?t.back:t.depart));if(!valid)continue;
  const general=(item.fares||[]).filter((f:any)=>!f.promotionCardCode&&Number.isFinite(f.price)&&f.price>0).sort((a:any,b:any)=>a.price-b.price)[0];if(!general)continue;
  const unit=general.price,amount=unit*p.adults,codes=schedules.map((s:any)=>s.legs[0].operatingCarrier||s.legs[0].marketingCarrier),baggage=schedules.every((s:any)=>bag(s)==='included')?'included':schedules.some((s:any)=>bag(s)==='excluded')?'excluded':'unknown';
  const common={partySize:p.adults,taxesIncluded:false,displayPriceVerified:true,sourceUrl,evidence:`마이리얼트립 일반 결제 표시가 · 성인 1인 ${unit.toLocaleString('ko-KR')}원 × ${p.adults}명 · 잔여 ${item.seatCount}석`,seller:'마이리얼트립',unitPriceKRW:unit,checkedAt,expiresAt:new Date(data.expiresAt).toISOString(),seatCount:item.seatCount,baggage,cardPrices:(item.fares||[]).filter((f:any)=>f.promotionCardCode&&f.price<unit).map((f:any)=>({card:f.promotionCardCode,amountKRW:f.price*p.adults})),flightNumbers:schedules.map((s:any)=>s.legs[0].marketingCarrier+s.legs[0].flightNumber)};
  if(t.back)offers.push({...common,label:'직항 왕복 상품',kind:'roundtrip',from:t.from,to:t.to,depart:t.depart,back:t.back,outTime:schedules[0].departure.at.slice(11,16),returnTime:schedules[1].departure.at.slice(11,16),outStops:0,returnStops:0,outAirlineCode:codes[0],returnAirlineCode:codes[1],airlineCodes:[...new Set(codes)],airfareKRW:amount,priceConfirmed:true,transferKRW:null,legs:[],notes:'카드 전용 할인 제외 · 결제 전 세금·발권 수수료 포함 최종 금액 확인'});
  else oneWayFares.push({...common,stops:0,airlineCode:codes[0],from:t.from,to:t.to,date:t.depart,time:schedules[0].departure.at.slice(11,16),amountKRW:amount});
 }
 return {offers,oneWayFares,source:{url:sourceUrl,title:`마이리얼트립 ${t.from}→${t.to} ${t.depart}${t.back?' / '+t.back:''}`,provider:'직접 운임 조회'},checkedAt,received:contents?.items?.length||0,accepted:offers.length+oneWayFares.length,hasMore:contents?.cursor?.hasNext===true};
}
export async function collectFares(t:FareTask,p:any){const response=await fetch(fareURL(t,p),{headers:{Accept:'text/html'},redirect:'error',signal:AbortSignal.timeout(22000)});if(!response.ok)throw Error(`판매처 응답 HTTP ${response.status}`);const reader=response.body?.getReader();if(!reader)throw Error('판매처 응답이 비어 있습니다.');let total=0,html='';const decoder=new TextDecoder();try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>6000000)throw Error('판매처 응답 크기 제한 초과');html+=decoder.decode(value,{stream:true});}html+=decoder.decode();}finally{await reader.cancel().catch(()=>{});}return parseFareHTML(html,t,p);}
export function fareJobResult(j:any){
 const kiwi=j.engine==='kiwi-mcp',name=kiwi?'Kiwi.com':'마이리얼트립',batches=j.fareBatches||[],sources=batches.flatMap((x:any)=>x.sources||[x.source]);
 const count=batches.reduce((n:number,x:any)=>n+x.accepted,0),result=normalizeFares({offers:batches.flatMap((x:any)=>x.offers),oneWayFares:batches.flatMap((x:any)=>x.oneWayFares),notes:[kiwi?'Kiwi.com MCP가 반환한 후보에서 왕복 상품과 편도 2장 조합을 비교합니다. 전체 판매처의 최저가를 보장하지 않습니다.':'마이리얼트립이 반환한 첫 페이지와 추천 상품 범위에서 비교합니다. 전체 판매처의 최저가를 보장하지 않습니다.','판매처 표시가 기준이며 결제 시점에 가격이 바뀔 수 있습니다. 세금·발권 수수료와 수하물은 예약 화면에서 최종 확인하세요.']},j.input,new Set(sources.map((x:any)=>x.url)));
 return {...result,priceVersion:kiwi?5:4,searchMode:kiwi?'kiwi':'direct',providers:[{name,status:count?'운임 수집 완료':batches.length?'조건에 맞는 운임 없음':j.fareErrors?.length?'응답 확인 필요':'조회 중',count},{name:'Skyscanner',status:'동일 조건 외부 비교 · 자동 운임 조회 미연결',count:0}],progress:{done:j.fareCursor,total:j.fareTasks.length,failures:j.fareErrors||[]},checkedAt:new Date().toISOString()};
}
