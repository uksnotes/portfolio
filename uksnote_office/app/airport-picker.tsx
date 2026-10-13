'use client';
import {useEffect,useState} from 'react';
import {api} from '@/lib/client-session';
import {Input} from '@/components/ui/input';
export default function AirportPicker({label,value,onChange,code,onCode}:{label:string,value:string,onChange:(v:string)=>void,code:string,onCode:(v:string)=>void}){
 const [items,setItems]=useState<any[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[total,setTotal]=useState(0);
 useEffect(()=>{let gone=false;setItems([]);setError('');setBusy(false);if(!value.trim())return;setBusy(true);const timer=setTimeout(()=>api('flight-airports',{query:value}).then(r=>{if(!gone){setItems(r.items);setTotal(r.total);if(!code||!r.items.some((a:any)=>a.code===code))onCode(r.recommendedCode||r.items[0]?.code||'');}}).catch(e=>!gone&&setError(e.message)).finally(()=>!gone&&setBusy(false)),250);return()=>{gone=true;clearTimeout(timer);};},[value]);
 return <div className="flight-airport-picker"><label>{label}<Input required value={value} maxLength={100} placeholder="국가·도시·공항코드 · 대만 / 타이베이 / TPE" onChange={e=>{onChange(e.target.value);onCode('');}}/></label><label>공항 · 주요 공항 자동 선택<select value={code} onChange={e=>onCode(e.target.value)} aria-label={label+' 공항'}><option value="">{busy?'공항 검색 중…':'자동 선택 · 검색 후 변경 가능'}</option>{items.map(a=><option key={a.code} value={a.code}>{a.code} · {a.label} · {a.countryName}</option>)}</select></label><small>국가만 입력해도 주요 공항을 자동 선택합니다. 다른 공항으로 변경할 수 있습니다.</small>{error&&<small className="error">{error}</small>}{!busy&&value&&items.length===0&&!error&&<small>검색된 공항 없음 · 국가명, 영문 도시명 또는 공항코드로 검색하세요</small>}{total>150&&<small>주요 공항 150곳 표시 · 도시명으로 좁혀보세요</small>}</div>;
}
