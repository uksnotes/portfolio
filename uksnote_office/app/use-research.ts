'use client';
import {useEffect,useRef,useState} from 'react';
import {api} from '@/lib/client-session';
export function useResearch(scope='travel',aptId=''){
 const [jobs,setJobs]=useState<any[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[configured,setConfigured]=useState(true),[polling,setPolling]=useState(true);const pending=useRef<any>(null);
 const put=(j:any)=>setJobs(prev=>[j,...prev.filter(x=>x.id!==j.id)].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,25));
 useEffect(()=>{let gone=false;setJobs([]);setError('');api('research-list',{scope,aptId}).then(r=>{if(!gone){setJobs(r.jobs);setConfigured(r.configured);setPolling(true);}}).catch(e=>!gone&&setError(e.message));return()=>{gone=true;};},[scope,aptId]);
 useEffect(()=>{const changed=()=>{api('research-list',{scope,aptId}).then(r=>setConfigured(r.configured)).catch(e=>setError(e.message));};window.addEventListener('office-ai-changed',changed);return()=>window.removeEventListener('office-ai-changed',changed);},[scope,aptId]);
 const active=jobs.find(j=>['starting','running'].includes(j.status));
 useEffect(()=>{if(!active||!polling)return;let gone=false;const t=setTimeout(()=>api('research-poll',{id:active.id}).then(j=>!gone&&put(j)).catch(e=>{if(!gone){setError(e.message);setPolling(false);}}),3000);return()=>{gone=true;clearTimeout(t);};},[active,polling]);
 async function start(payload:any){if(busy)return;setBusy(true);setError('');const signature=JSON.stringify(payload);if(!pending.current||pending.current.signature!==signature)pending.current={signature,body:{...payload,requestId:crypto.randomUUID()}};try{const j=await api('research-start',pending.current.body);put(j);pending.current=null;setPolling(true);return j;}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return {jobs,busy,error,configured,start,put,refreshConfig:async()=>{setConfigured((await api('research-list',{scope,aptId})).configured);},resume:()=>{setPolling(true);setError('');},polling};
}
