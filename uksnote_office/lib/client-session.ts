'use client';
// The embedded Site may not receive its app cookie. Keep a tab-scoped token
// and send it explicitly; the server still checks expiry and platform owner.
const STORAGE_KEY='hi-office-session-v1';
let memoryToken:string|null=null;
export function rememberSession(token:string|null){memoryToken=token;try{if(token)sessionStorage.setItem(STORAGE_KEY,token);else sessionStorage.removeItem(STORAGE_KEY);}catch{/* Memory transport still works when browser storage is unavailable. */}}
function currentToken(){if(memoryToken)return memoryToken;try{return sessionStorage.getItem(STORAGE_KEY);}catch{return null;}}
export class OfficeRequestError extends Error{constructor(message:string,public status:number){super(message);}}
export async function api(action:string,body?:any,method?:string,signal?:AbortSignal){
 const token=currentToken();const r=await fetch('/api/'+action,{method:method||(body?'POST':'GET'),signal,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
 let d:any;try{d=await r.json();}catch{throw new OfficeRequestError('서버 응답을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',r.status);}
 if(!r.ok){if(r.status===401&&!(action==='session'&&body)){rememberSession(null);if(action!=='session'&&typeof window!=='undefined')window.dispatchEvent(new Event('office-session-expired'));}throw new OfficeRequestError(d.error||'요청에 실패했습니다.',r.status);}
 if(action==='session'&&body){if(typeof d.sessionToken!=='string'||!d.sessionToken)throw new OfficeRequestError('로그인 상태를 전달받지 못했습니다. 다시 시도해 주세요.',500);rememberSession(d.sessionToken);}
 if(action==='logout')rememberSession(null);
 return d;
}
