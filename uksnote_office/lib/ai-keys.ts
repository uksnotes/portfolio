import {credentials,saveCredentials,setting,db} from './server';
export const AI_PROVIDERS=[{id:'openai',label:'ChatGPT',field:'openaiKey',env:'OPENAI_API_KEY'},{id:'anthropic',label:'Claude',field:'anthropicKey',env:'ANTHROPIC_API_KEY'},{id:'google',label:'Gemini',field:'geminiKey',env:'GEMINI_API_KEY'}] as const;
export type AIProvider=typeof AI_PROVIDERS[number]['id'];
// 누구나 가입할 수 있으므로 서버 환경변수의 AI 키는 관리자만 쓴다. 일반 사용자는 화면에서 개인 키를 등록한다.
async function serverKeysAllowed(owner:string){const u=await db().prepare('SELECT role FROM office_users WHERE id=?::uuid').bind(owner).first<{role:string}>();return u?.role==='admin';}
export async function availableKeys(owner:string){const c=await credentials(owner),personal=AI_PROVIDERS.some(p=>!!c[p.field]),server=!personal&&await serverKeysAllowed(owner);return Object.fromEntries(AI_PROVIDERS.map(p=>[p.id,c[p.field]||(server?setting(p.env):'')||''])) as Record<AIProvider,string>;}
export async function providerKey(owner:string,provider:AIProvider){const key=(await availableKeys(owner))[provider];if(!key)throw Error('+ API 키 추가에서 사용할 서비스의 키를 저장하세요.');return key;}
export async function storeAPIKey(owner:string,b:any){const p=AI_PROVIDERS.find(p=>p.id===b.provider);if(!p)throw Error('지원하는 AI 서비스를 선택하세요.');const value=typeof b.key==='string'?b.key.trim():'';if(value.length<20||value.length>512||!/^[A-Za-z0-9_-]+$/.test(value)||(p.id==='openai'&&!value.startsWith('sk-')))throw Error(p.label+' API 키 형식을 확인하세요.');const c=await credentials(owner);c[p.field]=value;await saveCredentials(owner,c);return {ok:true};}
