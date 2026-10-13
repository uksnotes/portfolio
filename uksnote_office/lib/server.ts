import {db} from './db';
export {db};
export function setting(k:string){return process.env[k]||'';}
export const enc=new TextEncoder();
export async function sha(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export function response(data:unknown,status=200,headers:Record<string,string>={}){return Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});}
export function sameOrigin(r:Request){const o=r.headers.get('origin');if(o&&o!==new URL(r.url).origin)throw new Error('ORIGIN');}
export function sessionToken(r:Request){const header=r.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1];const token=header??(r.headers.get('cookie')||'').match(/(?:^|;\s*)hi_session=([^;]+)/)?.[1];return token&&token.length<=256?token:null;}
export type OfficeUser={id:string,email:string,name:string,role:'user'|'admin'};
/** 세션 토큰 → Supabase 사용자. 관리자가 차단한 계정은 기존 세션도 즉시 거부된다. */
export async function currentUser(r:Request):Promise<OfficeUser>{const token=sessionToken(r);if(!token)throw new Error('AUTH');const found=await db().prepare("SELECT u.id::text AS id,u.email,u.name,u.role FROM sessions s JOIN office_users u ON u.id::text=s.owner WHERE s.token=? AND s.expires>? AND u.status<>'rejected'").bind(await sha(token),Date.now()).first<OfficeUser>();if(!found)throw new Error('AUTH');return found;}
export async function authorized(r:Request){return (await currentUser(r)).id;}

async function key(){const s=setting('OFFICE_ENCRYPTION_KEY');if(!s)throw new Error('연결 설정 암호화 준비가 필요합니다.');return crypto.subtle.importKey('raw',Uint8Array.from(atob(s),x=>x.charCodeAt(0)),'AES-GCM',false,['encrypt','decrypt']);}
export async function encrypt(v:unknown){const iv=crypto.getRandomValues(new Uint8Array(12));const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(),enc.encode(JSON.stringify(v)));return btoa(String.fromCharCode(...iv))+'.'+btoa(String.fromCharCode(...new Uint8Array(data)));}
export async function decrypt(v:string){const [iv,d]=v.split('.');return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:Uint8Array.from(atob(iv),x=>x.charCodeAt(0))},await key(),Uint8Array.from(atob(d),x=>x.charCodeAt(0)))));}
export async function credentials(owner:string){const r=await db().prepare('SELECT data FROM secrets WHERE owner=?').bind(owner).first<{data:string}>();return r?await decrypt(r.data):{};}
export async function saveCredentials(owner:string,c:unknown){await db().prepare('INSERT INTO secrets(owner,data) VALUES(?,?) ON CONFLICT(owner) DO UPDATE SET data=excluded.data').bind(owner,await encrypt(c)).run();}
export async function records(owner:string,kind?:string){const r=kind?await db().prepare('SELECT * FROM records WHERE owner=? AND kind=? ORDER BY updated DESC').bind(owner,kind).all():await db().prepare('SELECT * FROM records WHERE owner=? ORDER BY updated DESC').bind(owner).all();return r.results.map((v:any)=>({...JSON.parse(v.data),id:v.id,kind:v.kind,version:v.version,updated:v.updated}));}
export async function cache(owner:string,kind:string,data:unknown){const id=owner+':'+kind;await db().prepare('INSERT INTO records(id,owner,kind,data,updated) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated=excluded.updated,version=records.version+1').bind(id,owner,kind,JSON.stringify(data),new Date().toISOString()).run();}
