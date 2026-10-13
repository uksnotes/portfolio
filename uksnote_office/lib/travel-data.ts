export const AIRLINES=[{id:'KE',name:'대한항공'},{id:'OZ',name:'아시아나항공'},{id:'LJ',name:'진에어'},{id:'ZE',name:'이스타항공'},{id:'7C',name:'제주항공'},{id:'TW',name:'티웨이항공'},{id:'BX',name:'에어부산'},{id:'RS',name:'에어서울'},{id:'YP',name:'에어프레미아'},{id:'RF',name:'에어로케이'}];
export const TIME_BANDS=[{id:'evening',label:'오후 6~9시 (18:00–21:00)'},{id:'morning',label:'오전 6~9시 (06:00–09:00)'},{id:'night',label:'야간 9~6시 (21:00–06:00)'},{id:'any',label:'시간대 제한 없음'}];
export const trim=(v:unknown,n=300)=>typeof v==='string'?v.trim().slice(0,n):'';
export function validDate(s:unknown):s is string{return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;}
export const todayKST=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
export const shiftDate=(s:string,n:number)=>new Date(Date.parse(s)+n*86400000).toISOString().slice(0,10);
export const dateRange=(a:string,b:string)=>Array.from({length:Math.floor((Date.parse(b)-Date.parse(a))/86400000)+1},(_,i)=>shiftDate(a,i));
export function datePairs(a:string,b:string,flex:boolean){const shifts=flex?[-1,0,1]:[0];return shifts.flatMap(x=>shifts.map(y=>({depart:shiftDate(a,x),back:shiftDate(b,y)}))).filter(x=>x.depart>=todayKST()&&x.back>=x.depart);}
export const weekday=(d:string)=>new Date(d+'T12:00:00Z').toLocaleDateString('ko-KR',{weekday:'short',timeZone:'UTC'});
export function inBand(time:string,band:string){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return false;const [h,m]=time.split(':').map(Number),v=h*60+m;return band==='any'||band==='morning'&&v>=360&&v<540||band==='evening'&&v>=1080&&v<1260||band==='night'&&(v>=1260||v<360);}
export function safeURL(v:unknown){try{const u=new URL(String(v));return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function mapLink(place:string){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(place);}
export function walkingLink(places:string[]){if(!places.length)return '';if(places.length===1)return mapLink(places[0]);return 'https://www.google.com/maps/dir/?api=1&travelmode=walking&origin='+encodeURIComponent(places[0])+'&destination='+encodeURIComponent(places[places.length-1])+(places.length>2?'&waypoints='+encodeURIComponent(places.slice(1,-1).join('|')):'');}
export function validateTravel(kind:string,b:any){
 if(!['flights','food','experiences','route','itinerary'].includes(kind))throw Error('여행 탭을 확인하세요.');
 const destination=trim(b.destination,100),start=b.start,end=b.end;
 if(!destination||!validDate(start)||!validDate(end)||end<start||start<todayKST()||dateRange(start,end).length>14)throw Error('목적지와 오늘 이후 여행 날짜를 확인하세요. 한 계획은 최대 14일입니다.');
 const base={destination,start,end,dates:dateRange(start,end),area:trim(b.area,100)};
 if(kind==='flights'){
 const origin=trim(b.origin,100),adults=Number(b.adults||1),outBand=String(b.outBand),returnBand=String(b.returnBand),airlines=[...new Set<string>((Array.isArray(b.airlines)?b.airlines:[]).filter((x:any)=>AIRLINES.some(a=>a.id===x)))];
 if(!origin||origin.toLowerCase()===destination.toLowerCase()||!Number.isInteger(adults)||adults<1||adults>9||!TIME_BANDS.some(x=>x.id===outBand)||!TIME_BANDS.some(x=>x.id===returnBand)||!airlines.length)throw Error('서로 다른 출발·도착 도시, 성인 1~9명, 시간대와 항공사를 선택하세요.');
 return {...base,flightSearchMode:b.flightSearchMode==='kiwi'?'kiwi':b.flightSearchMode==='api'?'api':'direct',origin,adults,outBand,returnBand,airlines,flex:b.flex===true,alternates:b.alternates!==false,pairs:datePairs(start,end,b.flex===true),baggage:b.baggage===true};
 }
 if(kind==='itinerary'){
 const places=(Array.isArray(b.places)?b.places:[]).filter((p:any)=>trim(p.name,150)).map((p:any)=>({name:trim(p.name,150),address:trim(p.address,200),stay:Number(p.stay||60),day:trim(p.day,10)}));
 if(places.length>8||places.some((p:any)=>!Number.isInteger(p.stay)||p.stay<15||p.stay>480||p.day&&!base.dates.includes(p.day)))throw Error('관광 명소는 최대 8곳, 체류 15~480분, 여행 기간 안의 방문일을 선택하세요.');
 if(new Set(places.map((p:any)=>p.name+'|'+p.address)).size!==places.length)throw Error('중복된 관광 명소를 합쳐 주세요.');
 return {...base,places,walkingLimit:[20,30,40].includes(Number(b.walkingLimit))?Number(b.walkingLimit):30,travelMode:['walking','driving'].includes(b.travelMode)?b.travelMode:'auto'};
 }
 if(kind==='route'){
 const places=(Array.isArray(b.places)?b.places:[]).map((x:any,i:number)=>({index:i,name:trim(x.name,150),address:trim(x.address,200),stay:Number(x.stay||60),day:trim(x.day,10)}));
 if(!places.length||places.length>8||places.some((x:any)=>!x.name||!Number.isInteger(x.stay)||x.stay<15||x.stay>480||x.day&&!base.dates.includes(x.day)))throw Error('장소 1~8곳, 체류 15~480분, 방문 가능 날짜를 확인하세요.');
 if(new Set(places.map((x:any)=>x.name+' '+x.address)).size!==places.length)throw Error('중복된 장소를 합쳐 주세요.');
 return {...base,places};
 }
 return {...base,foodMode:b.foodMode==='all'?'all':'choices',walkingLimit:Number(b.walkingLimit)===20?20:Number(b.walkingLimit)===40?40:30};
}
const str={type:'string'},num={type:['number','null']},bool={type:'boolean'};
export const object=(properties:Record<string,any>)=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const list=(items:any)=>({type:'array',items});
const sourceFields={sourceUrl:str,evidence:str};
const venue=object({name:str,address:str,category:{type:'string',enum:['famous','local','sight','rest']},why:str,dish:str,specialty:str,bestTime:str,opening:str,...sourceFields});
const slot=object({slot:{type:'string',enum:['morning','afternoon','dinner']},description:str,places:list(venue),walkingNote:str});
export const RESEARCH_SCHEMAS:Record<string,any>={
 flights:object({summary:str,options:list(object({label:str,route:str,outAirport:str,inAirport:str,airlineCodes:list(str),airlineNames:list(str),depart:str,back:str,outTime:str,returnTime:str,flightNumbers:str,totalKRW:num,airfareKRW:num,transferKRW:num,baggageKRW:num,taxesIncluded:bool,priceScope:{type:'string',enum:['entire_party_roundtrip','other','unknown']},exactDatesConfirmed:bool,priceConfirmed:bool,baggageIncluded:bool,notes:str,...sourceFields})),notes:list(str)}),
 food:object({summary:str,days:list(object({date:str,neighborhood:str,slots:list(slot)})),notes:list(str)}),
 experiences:object({summary:str,experiences:list(object({name:str,why:str,bestTime:str,address:str,...sourceFields})),foodDays:list(object({date:str,neighborhood:str,cafe:list(venue),lunch:list(venue),dinner:list(venue),dessert:list(venue),walkingNote:str})),notes:list(str)}),
 route:object({summary:str,places:list(object({index:{type:'integer'},name:str,address:str,lat:num,lon:num,...sourceFields,windows:list(object({date:str,open:str,close:str,status:{type:'string',enum:['open','closed','unknown']},sourceUrl:str}))})),notes:list(str)}),
 royal:object({summary:str,evidence:list(object({building:str,area:{type:'string',enum:['59','84','all']},reason:str,quote:str,sourceUrl:str,sourceTitle:str,publishedDate:str})),notes:list(str)})
};
export function normalizeFlightOptions(result:any,input:any,sourceSet:Set<string>){
 const usable=(Array.isArray(result.options)?result.options:[]).filter((o:any)=>o&&Array.isArray(o.airlineCodes)&&o.airlineCodes.length>0&&o.airlineCodes.every((x:string)=>input.airlines.includes(x)));
 const rows=usable.map((o:any)=>{
 const exact=input.pairs.some((p:any)=>p.depart===o.depart&&p.back===o.back),times=inBand(o.outTime,input.outBand)&&inBand(o.returnTime,input.returnBand),sourced=sourceSet.has(safeURL(o.sourceUrl));
 const components=[o.airfareKRW,o.transferKRW,o.baggageKRW],numbers=components.every(x=>typeof x==='number'&&Number.isFinite(x)&&x>=0)&&o.airfareKRW>0;
 const total=numbers?components.reduce((a,b)=>a+b,0):null;
 const comparable=sourced&&exact&&times&&o.priceConfirmed===true&&o.exactDatesConfirmed===true&&o.taxesIncluded===true&&o.priceScope==='entire_party_roundtrip'&&numbers&&typeof o.totalKRW==='number'&&Math.abs(o.totalKRW-total!)<=1&&(!input.baggage||o.baggageIncluded||o.baggageKRW>0);
 return {...o,sourceUrl:sourced?safeURL(o.sourceUrl):'',totalKRW:comparable?total:null,comparable,rank:null,reason:!sourced?'조회 출처 미확인':!exact?'날짜 불일치':!times?'출발 시간대 미확인/불일치':!comparable?'왕복 총액·세금·수하물/이동비 확인 필요':''};
 });
 const ranked=rows.filter((x:any)=>x.comparable).sort((a:any,b:any)=>a.totalKRW-b.totalKRW).slice(0,3).map((x:any,i:number)=>({...x,rank:i+1}));
 const candidates=rows.filter((x:any)=>!x.comparable).slice(0,3);
 return {...result,options:ranked,candidates,notes:[...(result.notes||[]),ranked.length<3?'조건과 왕복 총액이 확인된 결과가 3개 미만입니다. 미확인 가격은 순위에 넣지 않았습니다.':'조회한 결과 안에서 왕복 총액을 비교한 순위입니다.']};
}
