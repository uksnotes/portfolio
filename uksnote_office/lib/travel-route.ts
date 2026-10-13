import {dateRange,walkingLink} from './travel-data';
export function distance(a:any,b:any){const rad=Math.PI/180,dLat=(b.lat-a.lat)*rad,dLon=(b.lon-a.lon)*rad,v=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2;return 6371*2*Math.atan2(Math.sqrt(v),Math.sqrt(Math.max(0,1-v)));}
const minute=(s:string)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(s)?Number(s.slice(0,2))*60+Number(s.slice(3)):null;
const clock=(n:number)=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(Math.round(n%60)).padStart(2,'0');
// Exact subset/day optimization on a coordinate-distance proxy, never a claim about actual streets.
export function optimizeRoute(input:any,locations:any[]){
 const dates=dateRange(input.start,input.end),unresolved:any[]=[],ps:any[]=[];
 for(const p of input.places){const l=locations.find(x=>x.index===p.index);if(!l||typeof l.lat!=='number'||typeof l.lon!=='number'||!Number.isFinite(l.lat)||!Number.isFinite(l.lon)||Math.abs(l.lat)>90||Math.abs(l.lon)>180||!l.sourceUrl){unresolved.push(p);continue;}ps.push({...l,...p,address:l.address||p.address,lat:l.lat,lon:l.lon,windows:l.windows||[]});}
 const n=ps.length;if(!n)return {days:[],unresolved:input.places,unassigned:[],method:'좌표 확인 후 계산 가능',distanceKM:0};
 const matrix=ps.map(a=>ps.map(b=>distance(a,b))),dayPlans:any[]=[];
 for(const date of dates){const plans=new Map<number,any>();plans.set(0,{order:[],stops:[],distanceKM:0,finish:540});
 function visit(mask:number,last:number,time:number,km:number,order:number[],stops:any[]){
 const previous=plans.get(mask);if(!previous||km<previous.distanceKM-1e-8||Math.abs(km-previous.distanceKM)<1e-8&&time<previous.finish)plans.set(mask,{order:[...order],stops:[...stops],distanceKM:km,finish:time});
 for(let j=0;j<n;j++){if(mask&(1<<j)||ps[j].day&&ps[j].day!==date)continue;const w=ps[j].windows.find((x:any)=>x.date===date),closed=w?.status==='closed';if(closed)continue;
 const known=w?.status==='open'&&minute(w.open)!==null&&minute(w.close)!==null,open=known?minute(w.open)!:540,close=known?minute(w.close)!:1080;if(close<=open)continue;
 const leg=last<0?0:matrix[last][j];const walkingMinutes=Math.ceil(leg*1.3/4*60);const arrival=Math.max(time+walkingMinutes,open),leave=arrival+ps[j].stay;if(leave>Math.min(close,1200))continue;
 visit(mask|1<<j,j,leave,km+leg,[...order,j],[...stops,{...ps[j],arrival:clock(arrival),leave:clock(leave),legKM:Number(leg.toFixed(2)),walkingMinutes,openingConfirmed:!!known}]);}
 }
 visit(0,-1,540,0,[],[]);dayPlans.push(plans);
 }
 // Balance the load across dates first, then minimize within-day distance among feasible schedules.
 let dp=new Map<number,any>([[0,{cost:0,days:[],km:0}]]);
 for(let d=0;d<dates.length;d++){const next=new Map<number,any>();for(const [mask,old]of dp)for(const [subset,plan]of dayPlans[d]){if(mask&subset)continue;const combined=mask|subset,k=plan.order.length,cost=old.cost+plan.distanceKM+Math.max(0,k-1)**2*2;const prev=next.get(combined);if(!prev||cost<prev.cost)next.set(combined,{cost,km:old.km+plan.distanceKM,days:[...old.days,{date:dates[d],...plan}]});}dp=next;}
 const bits=(m:number)=>m.toString(2).replace(/0/g,'').length;const best=[...dp].sort((a,b)=>bits(b[0])-bits(a[0])||a[1].cost-b[1].cost)[0];
 const result=best?.[1]||{days:[],km:0};return {days:result.days.map((d:any)=>({...d,distanceKM:Number(d.distanceKM.toFixed(2)),mapUrl:walkingLink(d.stops.map((p:any)=>p.name+' '+p.address)),walkingMinutes:d.stops.reduce((s:number,p:any)=>s+p.walkingMinutes,0)})),unresolved,unassigned:ps.filter((_,i)=>!(best[0]&(1<<i))),distanceKM:Number(result.km.toFixed(2)),method:'방문일·영업시간 제약을 반영한 날짜별 분산 + 좌표 거리 최소화. 도보 시간은 직선거리 × 1.3 / 시속 4km 추정. 실제 보행 경로는 지도에서 확인.'};
}
