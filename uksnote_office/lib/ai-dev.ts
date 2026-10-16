// 로컬 개발 전용 AI 경로. production에서는 항상 실제 API로 보낸다.
// AI_DEV=claude-code: Claude 요청을 로컬 Claude Code CLI(claude -p, claude.ai 구독 로그인)로 실행한다. API 크레딧 없이 실제 응답 품질을 확인할 때 쓴다.
// AI_DEV=mock: OpenAI·Claude·Gemini 요청을 요청에 담긴 JSON 스키마대로 만든 가짜 결과로 대체한다. 화면 흐름만 확인할 때 쓴다.
const HOSTS=['api.openai.com','api.anthropic.com','generativelanguage.googleapis.com'];
const SOURCE={url:'https://example.com/mock-source',title:'[모의] 검색 출처'};
const DELAY=Number(process.env.AI_DEV_MOCK_DELAY_MS??800);
const today=()=>new Date().toISOString().slice(0,10);
const wait=()=>new Promise(r=>setTimeout(r,DELAY));

// label은 화면에서 어느 칸인지 알아보도록 경로(q2.options 3 등)를 그대로 쓴다.
function fake(schema:any,key='',root:any=schema,urls:string[]=[SOURCE.url],i=0,label=''):any{
 if(!schema||typeof schema!=='object')return null;
 if(schema.$ref){const name=String(schema.$ref).split('/').pop()!;return fake((root.$defs||root.definitions||{})[name],key,root,urls,i,label);}
 if(schema.const!==undefined)return schema.const;
 if(Array.isArray(schema.enum))return schema.enum.find((v:any)=>v!==null)??schema.enum[0];
 const alt=schema.anyOf||schema.oneOf;if(alt)return fake(alt.find((s:any)=>s.type!=='null')||alt[0],key,root,urls,i,label);
 const type=Array.isArray(schema.type)?schema.type.find((t:string)=>t!=='null'):schema.type;
 if(type==='object'||schema.properties)return Object.fromEntries(Object.entries(schema.properties||{}).map(([k,s])=>[k,fake(s,k,root,urls,i,label?label+'.'+k:k)]));
 if(type==='array'){const n=Math.min(schema.maxItems??3,Math.max(schema.minItems??0,3));return Array.from({length:n},(_,j)=>fake(schema.items,key,root,urls,j,`${label} ${j+1}`));}
 if(type==='boolean')return true;
 if(type==='integer'||type==='number'){const min=schema.minimum??schema.exclusiveMinimum??1,max=schema.maximum??Math.max(min,100);return type==='integer'?Math.round((min+max)/2):(min+max)/2;}
 if(type==='string'){
  if(schema.format==='date'||/date|depart|back/i.test(key))return today();
  if(schema.format==='uri'||/url|link|href/i.test(key))return urls[i%urls.length];
  if(/time/i.test(key))return '10:00';
  return `[모의] ${label||'내용'}`;
 }
 return null;
}

// 2단계 정리 요청은 입력에 sources를 담아 보낸다. 그 URL을 써야 출처 검사에서 빠지지 않는다.
function knownUrls(input:string){try{const urls=(JSON.parse(input).sources||[]).map((s:any)=>s.url).filter(Boolean);return urls.length?urls:[SOURCE.url];}catch{return [SOURCE.url];}}
const usage={input_tokens:0,output_tokens:0,total_tokens:0};
const openAIOutput=(body:any)=>[{type:'web_search_call',action:{sources:[SOURCE]}},{type:'message',content:[{type:'output_text',text:body?.text?.format?.schema?JSON.stringify(fake(body.text.format.schema)):'OK',annotations:[{type:'url_citation',...SOURCE}]}]}];

// next dev가 모듈을 다시 불러와도 접수된 background 요청을 이어서 조회할 수 있게 전역에 둔다.
const responses:Map<string,any>=(globalThis as any).__aiDevMockResponses??=new Map();
function openAI(url:URL,init:RequestInit){
 const path=url.pathname.replace('/v1/responses','');
 if(path.endsWith('/cancel'))return Response.json({status:'cancelled'});
 if(init.method==='GET'||!init.body){const body=responses.get(path.slice(1));return body?Response.json({id:path.slice(1),status:'completed',model:body.model,output:openAIOutput(body),usage}):Response.json({error:{message:'mock response not found'}},{status:404});}
 const body=JSON.parse(String(init.body)),id='resp_mock_'+crypto.randomUUID();
 if(body.background){responses.set(id,body);return Response.json({id,status:'queued',model:body.model});}
 return Response.json({id,status:'completed',model:body.model,output:openAIOutput(body),usage});
}
function claude(init:RequestInit){
 const body=JSON.parse(String(init.body)),schema=body.output_config?.format?.schema,input=String(body.messages?.[0]?.content||'');
 const content=body.tools?[{type:'text',text:'[모의] 웹 검색 메모',citations:[SOURCE]}]:[{type:'text',text:schema?JSON.stringify(fake(schema,'',schema,knownUrls(input))):'OK'}];
 return Response.json({id:'msg_mock_'+crypto.randomUUID(),model:body.model,stop_reason:'end_turn',content,usage});
}
function gemini(init:RequestInit){
 const body=JSON.parse(String(init.body)),schema=body.generationConfig?.responseJsonSchema,input=String(body.contents?.[0]?.parts?.[0]?.text||'');
 const text=body.tools?'[모의] 웹 검색 메모':schema?JSON.stringify(fake(schema,'',schema,knownUrls(input))):'OK';
 return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text}]},...(body.tools?{groundingMetadata:{groundingChunks:[{web:{uri:SOURCE.url,title:SOURCE.title}}]}}:{})}],usageMetadata:{promptTokenCount:0,candidatesTokenCount:0}});
}

// Messages API 요청을 claude -p 한 번으로 실행하고 같은 응답 형식으로 돌려준다.
// 웹 검색은 CLI의 WebSearch 도구를 쓰고, 출처는 도구 결과의 Links 목록에서만 가져온다(모델이 쓴 링크는 쓰지 않음).
// pause_turn 없이 CLI가 검색을 끝까지 이어 가므로 첫 user 메시지만 보낸다.
const CLI_MODEL=(model:string)=>/opus/.test(model)?'opus':/haiku/.test(model)?'haiku':'sonnet';
function cliLinks(event:any){return (Array.isArray(event?.message?.content)?event.message.content:[]).filter((c:any)=>c.type==='tool_result').flatMap((c:any)=>{const text=typeof c.content==='string'?c.content:(c.content||[]).map((x:any)=>x.text||'').join('\n');const m=text.match(/Links: (\[.*\])/);try{return m?JSON.parse(m[1]):[];}catch{return [];}});}
async function claudeCode(init:RequestInit){
 const body=JSON.parse(String(init.body)),schema=body.output_config?.format?.schema,search=!!body.tools?.length,input=body.messages?.[0]?.content;
 const args=['-p','--output-format','stream-json','--verbose','--no-session-persistence','--strict-mcp-config','--disable-slash-commands','--setting-sources','','--system-prompt',String(body.system||''),'--model',process.env.AI_DEV_MODEL||CLI_MODEL(String(body.model)),'--tools',search?'WebSearch':'',...(search?['--allowedTools','WebSearch']:[]),...(schema?['--json-schema',JSON.stringify(schema)]:[]),...(process.env.AI_DEV_EFFORT?['--effort',process.env.AI_DEV_EFFORT]:[])];
 // .env.local의 API 키가 넘어가면 CLI가 구독 대신 그 키(잔액 없음)를 쓴다.
 const env={...process.env};for(const k of ['ANTHROPIC_API_KEY','ANTHROPIC_AUTH_TOKEN','OPENAI_API_KEY','GEMINI_API_KEY'])delete env[k];
 // 개발 모드에서만 불러온다. 정적 import는 배포 번들 추적이 프로젝트 전체로 번진다.
 const [{spawn},{tmpdir}]=await Promise.all([import(/* turbopackIgnore: true */ 'node:child_process'),import(/* turbopackIgnore: true */ 'node:os')]);
 const started=Date.now();
 const out=await new Promise<string>((resolve,reject)=>{
  const child=spawn(process.env.CLAUDE_BIN||'claude',args,{cwd:tmpdir(),env,signal:init.signal||undefined});let stdout='',stderr='';
  child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);
  child.on('error',e=>reject(init.signal?.aborted?init.signal.reason:e));
  child.on('close',code=>code===0||stdout.includes('"type":"result"')?resolve(stdout):reject(Error(`claude -p 종료 코드 ${code}: ${stderr.slice(0,300)}`)));
  child.stdin.end(typeof input==='string'?input:JSON.stringify(input));
 });
 const events=out.split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l);}catch{return null;}}).filter(Boolean),result=events.find((e:any)=>e.type==='result');
 console.info(`[ai-dev] claude -p ${CLI_MODEL(String(body.model))}${search?' +WebSearch':''}${schema?' +schema':''} ${Math.round((Date.now()-started)/1000)}초${result?.is_error?' 실패: '+String(result.result).slice(0,200):''}`);
 if(!result||result.is_error)return Response.json({error:{message:String(result?.result||'claude -p 응답 없음')}},{status:/limit/i.test(String(result?.result))?429:500});
 if(schema&&!result.structured_output)return Response.json({error:{message:'claude -p 구조화 응답 없음'}},{status:500});
 const links=search?[...new Map(events.flatMap(cliLinks).filter((l:any)=>l?.url).map((l:any)=>[l.url,l])).values()]:[];
 return Response.json({id:'msg_cli_'+crypto.randomUUID(),model:body.model,stop_reason:'end_turn',content:[{type:'text',text:schema?JSON.stringify(result.structured_output):String(result.result||'')},...(links.length?[{type:'web_search_tool_result',content:links.map((l:any)=>({type:'web_search_result',url:l.url,title:l.title}))}]:[])],usage:{input_tokens:result.usage?.input_tokens||0,output_tokens:result.usage?.output_tokens||0}});
}

// AI API 호출은 모두 이 함수를 거친다. 개발 모드가 아니면 그대로 fetch한다.
// 전역 fetch를 바꾸지 않는 이유: next dev는 코드가 바뀔 때마다 fetch를 원래대로 되돌린다.
let warned=false;
export async function aiFetch(input:string,init:RequestInit={}){
 const mode=process.env.NODE_ENV==='production'?'':process.env.AI_DEV,url=new URL(input);
 if(mode==='claude-code'&&url.hostname==='api.anthropic.com'){if(!warned){warned=true;console.warn('[ai-dev] AI_DEV=claude-code: Claude 요청을 로컬 claude -p(구독 로그인)로 실행합니다. 구독 사용량에 포함됩니다.');}return claudeCode(init);}
 if(mode!=='mock'||!HOSTS.includes(url.hostname))return fetch(input,init);
 if(!warned){warned=true;console.warn('[ai-dev] AI_DEV=mock: OpenAI·Claude·Gemini 요청을 모의 응답으로 대체합니다. 실제 API를 호출하지 않습니다.');}
 await wait();
 if(url.hostname==='api.openai.com')return openAI(url,init);
 return url.hostname==='api.anthropic.com'?claude(init):gemini(init);
}
