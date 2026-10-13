import {object,trim,safeURL,weekday} from './travel-data';
import {distance} from './travel-route';
const str={type:'string'},num={type:['number','null']},list=(items:any)=>({type:'array',items});
const venue=object({name:str,address:str,category:{type:'string',enum:['famous','local','sight','rest']},why:str,dish:str,specialty:str,bestTime:str,opening:str,open:str,close:str,openingStatus:{type:'string',enum:['open','closed','unknown']},hoursSourceUrl:str,lat:num,lon:num,coordinateSourceUrl:str,sourceUrl:str,evidence:str});
export const ITINERARY_SCHEMA=object({summary:str,days:list(object({date:str,neighborhood:str,guideNote:str,morning:list(venue),afternoon:list(venue),cafe:list(venue),lunch:list(venue),dinner:list(venue),dessert:list(venue)})),notes:list(str)});
export const ITINERARY_INSTRUCTIONS=`현지 여행 가이드로서 관광 명소를 중심으로 맛집과 이동 동선을 하나의 날짜별 여행 일정으로 조사한다. input.dates의 모든 날짜마다 days 1개를 반환한다. 사용자가 places를 입력했다면 장소·지점·선호일을 존중해 중복 없이 우선 배치하고, 불가능한 항목은 notes에 이유를 쓴다. 입력한 관광지가 없으면 목적지를 대표하는 필수 명소와 숨은 명소를 가까운 동네끼리 묶어서 추천한다. 자동 추천은 오전 morning에 관광 명소 1~2곳, 오후 afternoon에 휴식과 함께 가볍게 들를 명소 0~2곳을 넣는다. 사용자가 5~8곳을 입력하면 이동과 체류시간이 허용하는 범위에서 오전/오후 각각 최대 4곳까지 배치해 요청 장소를 우선 반영한다. 너무 빽빽하면 일정을 분산하고 미배치 이유를 명시한다. 관광지 없는 식당 전용 일정으로 만들지 않는다. 가이드 관점에서 특별한 이유와 좋은 방문시간, 동네 배치 이유를 간단히 적는다.
각 날짜에 관광 명소 근처 아침카페 cafe 1곳, 점심 lunch 3곳, 저녁 dinner 3곳, 디저트 dessert 1곳을 조사한다. 점심·저녁은 각각 택1 후보이며 모두 방문하는 일정이 아니다. 가능하면 점심과 저녁마다 유명 맛집 category=famous와 현지인이 선호하는 근거가 있는 category=local을 구분해 각 1곳 이상 포함해 총 3곳을 제공한다. 유명하지 않다는 이유만으로 local이라고 추측하지 않는다. 가게 이름 name은 지점까지 명확히 적고, 각 가게의 대표·유명 메뉴 dish와 현지 특선 specialty, 해당 날짜 영업 여부와 휴무를 확인한다. 추천 식당은 관광지에서 가급적 2km 이내, 사용자의 도보 목표 안에 배치하되 미확인 근접성을 단정하지 않는다. 숙소 area가 있으면 첫날 시작 동네 선정에 참고한다.
실존 장소의 정확한 주소와 개별 sourceUrl 및 짧은 evidence 필요. 공개 지도/공식 안내에서 실제 좌표를 확인한 경우만 lat/lon과 coordinateSourceUrl을 반환한다. 좌표를 지명으로 추정하거나 정밀한 숫자를 생성하지 말고 확인 불가면 null 및 빈 coordinateSourceUrl. 해당 날짜 영업시간 open/close는 HH:mm이고 hoursSourceUrl로 확인되었을 때만 openingStatus=open 또는 closed를 쓴다. 불명은 unknown, 빈 open/close로 반환한다. 장소 sourceUrl, coordinateSourceUrl, hoursSourceUrl 모두 실제 조회된 URL만 사용. 한 날짜에 같은 지점을 중복하지 않는다. 문장은 한두 문장으로 간결하게. 확인된 장소가 부족하면 개수를 억지로 채우지 말고 빈 배열/notes로 설명한다. 실제 경로 거리나 시간을 임의 생성하지 않는다. 서버가 검증된 좌표로 추정 이동거리와 추천 순서를 계산한다.`;
const kinds=['cafe','morning','lunch','dessert','afternoon','dinner'] as const;
const cap:Record<string,number>={cafe:1,morning:2,lunch:3,dessert:1,afternoon:2,dinner:3};
const minute=(s:any)=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s)?Number(s.slice(0,2))*60+Number(s.slice(3)):null;
const clock=(m:number|null)=>m===null?'':`${m>=1440?'다음날 ':''}${Math.floor(m/60)%24<10?'0':''}${Math.floor(m/60)%24}:${Math.round(m%60).toString().padStart(2,'0')}`;
const coords=(p:any)=>p&&typeof p.lat==='number'&&typeof p.lon==='number'&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180&&!!p.coordinateSourceUrl;
export function estimateLeg(a:any,b:any,input:any){
 const url=(mode:string)=>'https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',origin:a.name+' '+a.address,destination:b.name+' '+b.address,travelmode:mode}).toString();
 const links={walkUrl:url('walking'),driveUrl:url('driving')};
 if(!coords(a)||!coords(b))return {...links,known:false,mode:input.travelMode==='driving'?'driving':'walking',straightKM:null,walkingKM:null,drivingKM:null,walkingMinutes:null,drivingMinutes:null,minutes:null};
 const km=distance(a,b),walkingKM=Math.round(km*1.3*10)/10,drivingKM=Math.round(km*1.4*10)/10,walkingMinutes=Math.ceil(km*1.3/4*60),drivingMinutes=Math.ceil(km*1.4/25*60),mode=input.travelMode==='walking'?'walking':input.travelMode==='driving'?'driving':walkingMinutes<=input.walkingLimit?'walking':'driving';
 return {...links,known:true,mode,straightKM:Math.round(km*100)/100,walkingKM,drivingKM,walkingMinutes,drivingMinutes,minutes:mode==='walking'?walkingMinutes:drivingMinutes};
}
const permutations=(xs:any[]):any[][]=>xs.length<2?[xs]:xs.flatMap((x,i)=>permutations(xs.filter((_,j)=>j!==i)).map(t=>[x,...t]));
export function planDay(day:any,input:any,choices:any={}){
 const choose=(key:string)=>{const rows=day[key]||[];if(choices[key])return rows.filter((x:any)=>x.id===choices[key]);return rows.length?rows:[null];};
 let best:any=null;
 for(const morning of permutations(day.morning))for(const afternoon of permutations(day.afternoon))for(const lunch of choose('lunch'))for(const dinner of choose('dinner')){
  const order=[...day.cafe,...morning,...(lunch?[lunch]:[]),...day.dessert,...afternoon,...(dinner?[dinner]:[])];let time:number|null=510,score=0,km=0,unknown=0,minutes=0;const stops:any[]=[];
  for(let i=0;i<order.length;i++){const p=order[i],leg=i?estimateLeg(order[i-1],p,input):null;if(leg){if(!leg.known){unknown++;time=null;score+=100000;}else{km+=leg.mode==='walking'?leg.walkingKM!:leg.drivingKM!;minutes+=leg.minutes!;score+=leg.minutes!;if(time!==null)time+=leg.minutes!;}}
   const earliest=({cafe:510,morning:540,lunch:720,dessert:810,afternoon:870,dinner:1080} as any)[p.slot];if(time!==null)time=Math.max(time,earliest);
   const open=minute(p.open),close=minute(p.close);if(time!==null&&p.openingStatus==='open'&&open!==null)time=Math.max(time,open);
   const stay=({cafe:40,morning:input.places?.find((x:any)=>x.name===p.name)?.stay||75,lunch:60,dessert:40,afternoon:input.places?.find((x:any)=>x.name===p.name)?.stay||60,dinner:75} as any)[p.slot];
   const leave:number|null=time===null?null:time+stay;const openingConflict=p.openingStatus==='open'&&close!==null&&leave!==null&&leave>close,late=leave!==null&&leave>1320;if(openingConflict)score+=1000000;if(late)score+=1000000;
   stops.push({...p,arrival:clock(time),leave:clock(leave),leg,openingConflict,late});time=leave;
  }
  const fixedDays=(input.places||[]).filter((x:any)=>x.day&&x.day!==day.date);if(order.some(p=>fixedDays.some((x:any)=>x.name===p.name)))score+=10000000;
  if(!best||score<best.score)best={score,stops,distanceKM:Math.round(km*10)/10,travelMinutes:minutes,unknownLegs:unknown,choiceIds:{lunch:lunch?.id||'',dinner:dinner?.id||''}};
 }
 return best||{stops:[],distanceKM:0,travelMinutes:0,unknownLegs:0,choiceIds:{lunch:'',dinner:''}};
}
export function normalizeItinerary(result:any,input:any,sources:Set<string>){
 const seenSights=new Set<string>();const verified=(u:any)=>sources.has(safeURL(u))?safeURL(u):'';const days=input.dates.map((date:string)=>{
  const raw=(result.days||[]).find((x:any)=>x.date===date)||{},seen=new Set<string>(),unavailable:any[]=[];
  const day:any={date,weekday:weekday(date),neighborhood:trim(raw.neighborhood,100),guideNote:trim(raw.guideNote,450),unavailable};
  for(const kind of kinds){day[kind]=[];for(const p of (Array.isArray(raw[kind])?raw[kind]:[]).slice(0,10)){
   const sourceUrl=verified(p.sourceUrl),name=trim(p.name,150),address=trim(p.address,250),key=(name+'|'+address).toLowerCase();if(!sourceUrl||!name||!address||seen.has(key)||['morning','afternoon'].includes(kind)&&seenSights.has(key))continue;
   const selectedDay=(input.places||[]).find((x:any)=>x.name===name)?.day;if(selectedDay&&selectedDay!==date)continue;
   const coordinateSourceUrl=verified(p.coordinateSourceUrl),hoursSourceUrl=verified(p.hoursSourceUrl),position={lat:p.lat,lon:p.lon,coordinateSourceUrl},geo=coords(position),open=minute(p.open),close=minute(p.close),openingStatus=hoursSourceUrl&&p.openingStatus==='closed'?'closed':hoursSourceUrl&&p.openingStatus==='open'&&open!==null&&close!==null&&close>open?'open':'unknown';
   if(openingStatus==='closed'){unavailable.push({name,reason:'해당 날짜 휴무',sourceUrl:hoursSourceUrl});continue;}
   const limit=['morning','afternoon'].includes(kind)&&input.places?.length>4?4:cap[kind];if(day[kind].length>=limit)break;seen.add(key);if(['morning','afternoon'].includes(kind))seenSights.add(key);day[kind].push({id:`${date}-${kind}-${day[kind].length}`,slot:kind,name,address,category:['morning','afternoon'].includes(kind)?'sight':['famous','local','rest'].includes(p.category)?p.category:'rest',why:trim(p.why,300),dish:trim(p.dish,160),specialty:trim(p.specialty,160),bestTime:trim(p.bestTime,100),opening:trim(p.opening,180),open:openingStatus==='open'?p.open:'',close:openingStatus==='open'?p.close:'',openingStatus,hoursSourceUrl,lat:geo?p.lat:null,lon:geo?p.lon:null,coordinateSourceUrl:geo?coordinateSourceUrl:'',sourceUrl,evidence:trim(p.evidence,180)});
  }}
  const sights=[...day.morning,...day.afternoon];for(const kind of ['cafe','lunch','dinner','dessert'])for(const p of day[kind]){const near=sights.filter(s=>coords(p)&&coords(s)).map(s=>({name:s.name,straightKM:Math.round(distance(p,s)*100)/100})).sort((a,b)=>a.straightKM-b.straightKM)[0];p.nearSight=near||null;}
  day.plan=planDay(day,input);return day;
 });
 const planned=new Set(days.flatMap((d:any)=>[...d.morning,...d.afternoon].map((p:any)=>p.name)));
 return {summary:trim(result.summary,500),days,notes:(result.notes||[]).filter((x:any)=>typeof x==='string').slice(0,12),unmatched:(input.places||[]).filter((p:any)=>!planned.has(p.name)).map((p:any)=>p.name),method:'관광·식사 시간대를 유지하며 오전/오후 명소 순서와 식당 후보의 이동시간 추정 합계를 최소화합니다. 도보는 직선거리×1.3·시속 4km, 차량은 ×1.4·시속 25km로 계산한 대략값입니다. 실제 도로·보행 연결, 교통·주차·대기시간은 반영하지 않습니다. 숙소 왕복은 제외됩니다.'};
}
export function withItineraryChoice(result:any,input:any,date:string,kind:string,id:string,selections:any={}){
 const day=result.days?.find((d:any)=>d.date===date);if(!day||!['lunch','dinner'].includes(kind)||!day[kind].some((p:any)=>p.id===id))throw Error('저장된 일정의 식당 후보를 선택하세요.');
 const next={...selections,[date]:{...(selections[date]||day.plan.choiceIds),[kind]:id}};
 return {selections:next,result:{...result,days:result.days.map((d:any)=>d.date===date?{...d,plan:planDay(d,input,next[date])}:d)}};
}

export function refreshItineraryDay(day:any,input:any,choices:any){const sights=[...day.morning,...day.afternoon];const next={...day};for(const kind of ['cafe','lunch','dinner','dessert'])next[kind]=day[kind].map((p:any)=>{const near=sights.filter(s=>coords(p)&&coords(s)).map(s=>({name:s.name,straightKM:Math.round(distance(p,s)*100)/100})).sort((a,b)=>a.straightKM-b.straightKM)[0];return {...p,nearSight:near||null};});next.plan=planDay(next,input,choices);return next;}
