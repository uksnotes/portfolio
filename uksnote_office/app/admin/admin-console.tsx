'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,Ban,RefreshCw,ShieldCheck,RotateCcw} from 'lucide-react';
import {api,OfficeRequestError} from '@/lib/client-session';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {Table,TableHeader,TableBody,TableRow,TableHead,TableCell} from '@/components/ui/table';
import {Toaster,toast} from 'sonner';

type Me={username:string,email:string,role:string};
type User={id:string,email:string,name:string,note:string,status:'approved'|'rejected',role:'user'|'admin',created_at:string,reviewed_at:string|null,last_login_at:string|null};
type Log={id:number,created_at:string,user_id:string|null,email:string|null,event:string,action:string|null,method:string|null,status:number|null,ip:string|null,user_agent:string|null,detail:Record<string,unknown>};

const STATUS_LABEL={approved:'이용 중',rejected:'차단'};
const EVENT_LABEL:Record<string,string>={signup:'가입',signup_duplicate:'중복 가입 시도',signup_blocked:'가입 제한',login_success:'로그인',login_failed:'로그인 실패',login_blocked:'로그인 차단',logout:'로그아웃',admin_review:'관리자 처리',api:'요청'};
const when=(v:string|null)=>v?new Date(v).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',year:'2-digit',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—';

export default function AdminConsole(){
 const [me,setMe]=useState<Me|null|undefined>(undefined),[error,setError]=useState(''),[users,setUsers]=useState<User[]>([]),[logs,setLogs]=useState<Log[]>([]),[busy,setBusy]=useState(''),[filter,setFilter]=useState({email:'',event:''}),[more,setMore]=useState(false);
 const loadUsers=useCallback(async()=>{setUsers((await api('admin-users')).users);},[]);
 const loadLogs=useCallback(async(before?:number)=>{const q=new URLSearchParams({limit:'100'});if(filter.email)q.set('email',filter.email);if(filter.event)q.set('event',filter.event);if(before)q.set('before',String(before));const d=(await api('admin-logs?'+q)).logs as Log[];setLogs(old=>before?[...old,...d]:d);setMore(d.length===100);},[filter]);
 useEffect(()=>{api('session').then(async(u:Me)=>{setMe(u);if(u.role!=='admin')return;await Promise.all([loadUsers(),loadLogs()]);}).catch(e=>{setMe(null);if(!(e instanceof OfficeRequestError&&e.status===401))setError((e as Error).message);});// eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 async function review(u:User,status:User['status'],role?:User['role']){setBusy(u.id);try{await api('admin-user',{id:u.id,status,role});toast.success(`${u.email}: ${role?(role==='admin'?'관리자 지정':'일반 사용자로 변경'):status==='rejected'?'차단':'차단 해제'}`);await Promise.all([loadUsers(),loadLogs()]);}catch(e){toast.error((e as Error).message);}finally{setBusy('');}}
 if(me===undefined)return <div className="loading-screen"><ShieldCheck/><p>관리자 화면을 여는 중입니다.</p></div>;
 if(!me||me.role!=='admin')return <div className="loading-screen"><ShieldCheck/><p>{error||(me?'관리자만 사용할 수 있습니다.':'로그인이 필요합니다.')}</p><a className="provider-link" href="/login"><ArrowLeft size={15}/> 오피스로 이동</a></div>;
 const userTable=(list:User[])=>list.length?<div className="admin-table-wrap"><Table><TableHeader><TableRow><TableHead>이름 / 이메일</TableHead><TableHead>상태</TableHead><TableHead>가입</TableHead><TableHead>최근 로그인</TableHead><TableHead>처리</TableHead></TableRow></TableHeader><TableBody>{list.map(u=><TableRow key={u.id}><TableCell><strong>{u.name||'—'}</strong>{u.role==='admin'&&<span className="count-tag">관리자</span>}<small>{u.email}</small></TableCell><TableCell><span className={'status-badge status-'+u.status}>{STATUS_LABEL[u.status]}</span></TableCell><TableCell>{when(u.created_at)}</TableCell><TableCell>{when(u.last_login_at)}</TableCell><TableCell>{u.email===me.email?<span className="muted">본인</span>:<div className="row-actions">
  {u.status==='approved'?<Button size="sm" variant="outline" disabled={busy===u.id} onClick={()=>{if(confirm(`${u.email} 계정을 차단할까요? 로그인이 즉시 끊깁니다.`))review(u,'rejected');}}><Ban size={14}/> 차단</Button>
   :<Button size="sm" variant="outline" disabled={busy===u.id} onClick={()=>review(u,'approved')}><RotateCcw size={14}/> 차단 해제</Button>}
  {u.status==='approved'&&<Button size="sm" variant="ghost" disabled={busy===u.id} onClick={()=>review(u,'approved',u.role==='admin'?'user':'admin')}>{u.role==='admin'?'관리자 해제':'관리자 지정'}</Button>}
 </div>}</TableCell></TableRow>)}</TableBody></Table></div>:<p className="quiet">해당하는 사용자가 없습니다.</p>;
 return <div className="admin-page"><header className="admin-top"><Link className="brand" href="/"><span className="brand-icon">Uks</span><strong>UK&apos;S OFFICE · 관리자</strong></Link><nav><span>{me.email}</span><Button variant="outline" size="sm" onClick={()=>{location.href='/';}}><ArrowLeft size={14}/> 오피스로</Button></nav></header>
 <main className="workspace"><div className="page-heading"><div><span className="eyebrow">ADMIN</span><h1>사용자 관리 · 로그<span className="heading-mark">.</span></h1><p>누구나 가입하면 바로 이용합니다. 문제가 있는 계정만 차단하세요. 차단하면 로그인이 즉시 끊깁니다.</p></div><div className="heading-actions"><Button variant="outline" disabled={!!busy} onClick={()=>{setBusy('reload');Promise.all([loadUsers(),loadLogs()]).catch(e=>toast.error((e as Error).message)).finally(()=>setBusy(''));}}><RefreshCw size={15} className={busy==='reload'?'spin':''}/> 새로고침</Button></div></div>
 <Tabs defaultValue="users"><TabsList><TabsTrigger value="users">사용자<span className="count-tag">{users.length}</span></TabsTrigger><TabsTrigger value="logs">사용자 로그</TabsTrigger></TabsList>
 <TabsContent value="users"><section className="panel">{userTable(users)}</section></TabsContent>
 <TabsContent value="logs"><section className="panel"><form className="admin-filters" onSubmit={e=>{e.preventDefault();loadLogs().catch(err=>toast.error((err as Error).message));}}><Input placeholder="이메일 검색" value={filter.email} onChange={e=>setFilter({...filter,email:e.target.value})}/><select className="admin-select" value={filter.event} onChange={e=>setFilter({...filter,event:e.target.value})} aria-label="이벤트"><option value="">모든 이벤트</option>{Object.entries(EVENT_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><Button variant="outline">조회</Button></form>
  {logs.length?<div className="admin-table-wrap"><Table><TableHeader><TableRow><TableHead>시각</TableHead><TableHead>사용자</TableHead><TableHead>이벤트</TableHead><TableHead>요청</TableHead><TableHead>IP</TableHead><TableHead>상세</TableHead></TableRow></TableHeader><TableBody>{logs.map(l=><TableRow key={l.id}><TableCell>{when(l.created_at)}</TableCell><TableCell>{l.email||'—'}</TableCell><TableCell>{EVENT_LABEL[l.event]||l.event}</TableCell><TableCell>{l.action?`${l.method} ${l.action} · ${l.status}`:'—'}</TableCell><TableCell>{l.ip||'—'}</TableCell><TableCell><div className="log-detail">{Object.keys(l.detail||{}).length?JSON.stringify(l.detail):''}</div></TableCell></TableRow>)}</TableBody></Table></div>:<p className="quiet">기록이 없습니다.</p>}
  {more&&<Button variant="outline" className="mt-4" onClick={()=>loadLogs(logs.at(-1)?.id).catch(e=>toast.error((e as Error).message))}>이전 기록 더 보기</Button>}
 </section></TabsContent></Tabs></main><Toaster richColors position="top-center"/></div>;
}
