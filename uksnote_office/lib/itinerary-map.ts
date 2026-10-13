import {safeURL,trim} from './travel-data';
export const DAY_COLORS=['#2563eb','#c2410c','#7c3aed','#047857','#be185d','#0e7490','#a16207','#4338ca','#b91c1c','#3f6212','#a21caf','#0369a1','#92400e','#334155'];
export const dayColor=(index:number)=>DAY_COLORS[index%DAY_COLORS.length];
export function hasPin(p:any){return typeof p?.lat==='number'&&typeof p?.lon==='number'&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=85.051129&&Math.abs(p.lon)<=180&&!!safeURL(p.coordinateSourceUrl);}
export function itineraryMapData(days:any[]){
 const pins:any[]=[],missing:any[]=[],segments:any[]=[];
 days.forEach((d,dayIndex)=>{const stops=d.plan?.stops||[];stops.forEach((p:any,index:number)=>{const point={...p,date:d.date,dayIndex,day:dayIndex+1,order:index+1,color:dayColor(dayIndex),label:`${dayIndex+1}·${index+1}`};if(hasPin(p))pins.push(point);else missing.push(point);if(index&&hasPin(p)&&hasPin(stops[index-1]))segments.push({date:d.date,color:dayColor(dayIndex),from:[stops[index-1].lat,stops[index-1].lon],to:[p.lat,p.lon]});});});
 const groups=new Map<string,any[]>();for(const p of pins){const key=p.lat.toFixed(6)+','+p.lon.toFixed(6);groups.set(key,[...(groups.get(key)||[]),p]);}
 return {pins,missing,segments,groups:[...groups.values()]};
}
export function parseLocationCandidates(raw:any){const rows:any[]=[];for(const feature of (Array.isArray(raw?.features)?raw.features:[]).slice(0,8)){
 const p=feature?.properties||{},xy=feature?.geometry?.coordinates;if(feature?.geometry?.type!=='Point'||!Array.isArray(xy)||xy.length<2)continue;
 const type=({N:'node',W:'way',R:'relation'} as any)[p.osm_type],id=String(p.osm_id||'');if(!type||!/^\d+$/.test(id))continue;
 const sourceUrl=`https://www.openstreetmap.org/${type}/${id}`,lat=xy[1],lon=xy[0];if(!hasPin({lat,lon,coordinateSourceUrl:sourceUrl}))continue;
 const name=trim(p.name,180),address=[p.housenumber,p.street,p.district,p.city||p.town||p.village,p.state,p.country].filter((s:any)=>typeof s==='string'&&s.trim()).map((s:string)=>trim(s,100)).join(', ');if(!name&&!address)continue;
 rows.push({id:type+'-'+id,name:name||address,address,lat,lon,sourceUrl});
 }return [...new Map(rows.map(x=>[x.id,x])).values()].slice(0,4);
}
export async function findLocation(query:string,bias?:any){const params=new URLSearchParams({q:trim(query,240),limit:'4'});if(hasPin(bias)){params.set('lat',String(bias.lat));params.set('lon',String(bias.lon));params.set('zoom','12');}
 const response=await fetch('https://photon.komoot.io/api/?'+params,{headers:{Accept:'application/json','User-Agent':'UKS-OFFICE/1.0 (+https://hi-datascience-office.leeccuu.chatgpt.site)'},redirect:'error',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('주소 검색 서비스에 연결하지 못했습니다. 잠시 후 다시 시도하세요.');return parseLocationCandidates(await response.json());
}
