import { platformIdentity } from './identity';
import {env} from 'cloudflare:workers';
export function db():D1Database {if(!env.DB)throw new Error('저장소에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');return env.DB;}
export function setting(k:string){return (env as unknown as Record<string,string>)[k]||'';}
export const enc=new TextEncoder();
export async function sha(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function passwordHash(s:string,salt:string){const k=await crypto.subtle.importKey('raw',enc.encode(s),'PBKDF2',false,['deriveBits']);return Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},k,256))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export function response(data:unknown,status=200,headers:Record<string,string>={}){return Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});}
export const identity = platformIdentity;
export function sameOrigin(r:Request){const o=r.headers.get('origin');if(o&&o!==new URL(r.url).origin)throw new Error('ORIGIN');}
export function sessionToken(r:Request){const header=r.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1];const token=header??(r.headers.get('cookie')||'').match(/(?:^|;\s*)hi_session=([^;]+)/)?.[1];return token&&token.length<=256?token:null;}
export async function authorized(r:Request){const owner=await identity(r);const token=sessionToken(r);if(!token)throw new Error('AUTH');const found=await db().prepare('SELECT owner FROM sessions WHERE token=? AND owner=? AND expires>?').bind(await sha(token),owner,Date.now()).first();if(!found)throw new Error('AUTH');return owner;}

async function key(){const s=setting('OFFICE_ENCRYPTION_KEY');if(!s)throw new Error('연결 설정 암호화 준비가 필요합니다.');return crypto.subtle.importKey('raw',Uint8Array.from(atob(s),x=>x.charCodeAt(0)),'AES-GCM',false,['encrypt','decrypt']);}
export async function encrypt(v:unknown){const iv=crypto.getRandomValues(new Uint8Array(12));const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(),enc.encode(JSON.stringify(v)));return btoa(String.fromCharCode(...iv))+'.'+btoa(String.fromCharCode(...new Uint8Array(data)));}
export async function decrypt(v:string){const [iv,d]=v.split('.');return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:Uint8Array.from(atob(iv),x=>x.charCodeAt(0))},await key(),Uint8Array.from(atob(d),x=>x.charCodeAt(0)))));}
export async function credentials(owner:string){const r=await db().prepare('SELECT data FROM secrets WHERE owner=?').bind(owner).first<{data:string}>();return r?await decrypt(r.data):{};}
export async function saveCredentials(owner:string,c:unknown){await db().prepare('INSERT INTO secrets(owner,data) VALUES(?,?) ON CONFLICT(owner) DO UPDATE SET data=excluded.data').bind(owner,await encrypt(c)).run();}
export async function records(owner:string,kind?:string){const r=kind?await db().prepare('SELECT * FROM records WHERE owner=? AND kind=? ORDER BY updated DESC').bind(owner,kind).all():await db().prepare('SELECT * FROM records WHERE owner=? ORDER BY updated DESC').bind(owner).all();return r.results.map((v:any)=>({...JSON.parse(v.data),id:v.id,kind:v.kind,version:v.version,updated:v.updated}));}
export async function cache(owner:string,kind:string,data:unknown){const id=owner+':'+kind;await db().prepare('INSERT INTO records(id,owner,kind,data,updated) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated=excluded.updated,version=records.version+1').bind(id,owner,kind,JSON.stringify(data),new Date().toISOString()).run();}
