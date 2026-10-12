/** Loopback-only HTTP server. Original API and business modules run unchanged. */
import http from 'node:http';
import path from 'node:path';
import {readFile,stat} from 'node:fs/promises';
import {root,closeDatabase} from './environment';
import {GET,POST,DELETE} from '../source/app/api/[action]/route';
const port=Number(process.env.HI_OFFICE_PORT||8000);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Port must be 1024–65535');
const publicDir=path.join(root,'static');
const allowedHosts=new Set([`127.0.0.1:${port}`,`localhost:${port}`]);
const types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
 const send=(status:number,message:string)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:message}));};
 try{
  const host=req.headers.host||'';
  // Block DNS rebinding and requests from other browser origins.
  if(!allowedHosts.has(host))return send(403,'허용되지 않은 로컬 호스트입니다.');
  const origin=`http://${host}`;
  if(req.headers.origin&&req.headers.origin!==origin)return send(403,'요청 출처를 확인할 수 없습니다.');
  if(req.headers['sec-fetch-site']==='cross-site')return send(403,'외부 사이트의 요청은 허용되지 않습니다.');
  const url=new URL(req.url||'/',origin);
  if(url.pathname==='/health'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({ok:true,app:'HI OFFICE',runtime:'local',instance:process.env.HI_OFFICE_INSTANCE}));return;}
  if(url.pathname.startsWith('/api/')){
   const handler=({GET,POST,DELETE} as any)[req.method||'GET'];
   if(!handler)return send(405,'지원하지 않는 요청입니다.');
   const chunks:Buffer[]=[];let size=0;
   for await(const chunk of req){size+=chunk.length;if(size>1024*1024)return send(413,'요청은 1MB 이하여야 합니다.');chunks.push(chunk);}
   const headers=new Headers();
   for(const [key,value] of Object.entries(req.headers))if(value&&!key.startsWith('oai-')&&!['host','connection','content-length','transfer-encoding'].includes(key))headers.set(key,Array.isArray(value)?value.join(','):value);
   // Local edition has one fixed owner; caller-provided identity is discarded.
   headers.set('oai-authenticated-user-id','hi-office-local-owner');
   const request=new Request(url,{method:req.method,headers,body:['GET','HEAD'].includes(req.method||'GET')?undefined:Buffer.concat(chunks)});
   const response=await handler(request);const outHeaders:Record<string,string>={};
   response.headers.forEach((value:string,key:string)=>{outHeaders[key]=key==='set-cookie'?value.replace(/; Secure/g,''):value;});
   outHeaders['X-Content-Type-Options']='nosniff';res.writeHead(response.status,outHeaders);res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  if(!['GET','HEAD'].includes(req.method||''))return send(405,'지원하지 않는 요청입니다.');
  const pathname=decodeURIComponent(url.pathname);
  const rel=['/','/login','/login/'].includes(pathname)?'index.html':pathname.slice(1);
  const file=path.resolve(publicDir,rel);
  if(!file.startsWith(publicDir+path.sep)||rel.includes('\\'))return send(404,'파일을 찾을 수 없습니다.');
  const info=await stat(file);if(!info.isFile())return send(404,'파일을 찾을 수 없습니다.');
  const body=await readFile(file);
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:body);
 }catch(e:any){if(e?.code==='ENOENT')return send(404,'파일을 찾을 수 없습니다.');console.error('Local request failed:',e?.name||'Error');if(!res.headersSent)send(500,'로컬 서버 오류가 발생했습니다. 터미널을 확인해 주세요.');else res.end();}
});
server.requestTimeout=120000;server.headersTimeout=30000;
server.on('error',(e:any)=>{console.error(e.code==='EADDRINUSE'?'이미 사용 중인 포트입니다. python app.py --port 8001로 실행하세요.':'서버 시작 실패: '+e.code);closeDatabase();process.exit(1);});
server.listen(port,'127.0.0.1',()=>console.log(`HI OFFICE ready: http://127.0.0.1:${port}`));
let stopping=false;function stop(){if(stopping)return;stopping=true;server.close(()=>{closeDatabase();process.exit(0);});setTimeout(()=>{process.exit(0);},3000).unref();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
