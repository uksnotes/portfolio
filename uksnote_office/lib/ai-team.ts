export const TEAM_MODEL='gpt-5.6-sol';
export const TEAM_MODELS=[
 {id:TEAM_MODEL,provider:'openai',label:'OpenAI · Sol',providerLabel:'OpenAI',note:'리서치 담당자는 필요할 때 웹 검색을 사용합니다.'},
 {id:'gemini-2.5-flash',provider:'google',label:'Gemini · 2.5 Flash',providerLabel:'Google',note:'팀 업무에서는 입력 자료·저장된 뉴스를 분석합니다. 여행·부동산 리서치는 Google 검색을 사용합니다.'},
 {id:'claude-sonnet-5',provider:'anthropic',label:'Claude · Sonnet 5',providerLabel:'Anthropic',note:'입력 자료·저장된 뉴스 분석. 별도 웹 검색은 사용하지 않습니다.'},
 {id:'claude-opus-5',provider:'anthropic',label:'Claude · Opus 5',providerLabel:'Anthropic',note:'입력 자료·저장된 뉴스 분석. 별도 웹 검색은 사용하지 않습니다.'},
 {id:'claude-haiku-4-5-20251001',provider:'anthropic',label:'Claude · Haiku 4.5',providerLabel:'Anthropic',note:'입력 자료·저장된 뉴스 분석. 별도 웹 검색은 사용하지 않습니다.'},
] as const;
export function teamModel(id:string){return TEAM_MODELS.find(m=>m.id===id);}
export function modelLabel(id:string){return teamModel(id)?.label||id;}

export const AI_TEAM=[
 {id:'chief',name:'비서실장',short:'업무 설계',description:'지시를 구체적인 작업과 완료 기준으로 정리합니다.',color:'#4f638e'},
 {id:'research',name:'리서치 분석가',short:'자료 조사',description:'관련 뉴스와 공개 자료를 조사하고 출처를 남깁니다.',color:'#357faa'},
 {id:'analyst',name:'데이터 분석가',short:'수치 분석',description:'제공된 수치와 계산 결과를 해석합니다.',color:'#338977'},
 {id:'reviewer',name:'검증 담당자',short:'근거 검토',description:'원자료·수치·누락·불확실성을 점검합니다.',color:'#aa7740'},
 {id:'writer',name:'보고서 담당자',short:'최종 보고',description:'결론·근거·선택지를 결정 카드로 정리합니다.',color:'#806ba6'},
] as const;
// 비서실장이 업무를 설계하기 전에 대표가 직접 결정할 5가지를 묻는 단계. 새 업무의 steps 맨 앞에 들어간다.
export const INTAKE_STEP={id:'intake',name:'사전 질문',short:'대표 결정',description:'업무를 설계하기 전에 대표가 결정할 5가지를 묻습니다.',color:'#5d6b82'} as const;
export const SEARCH_ROLES:readonly string[]=['research','reviewer'];
export const DONE_STEPS:readonly string[]=['complete','skipped'];
export function teamRole(id:string){return id===INTAKE_STEP.id?INTAKE_STEP:AI_TEAM.find(a=>a.id===id);}
export const JOB_LABELS:Record<string,string>={running:'팀 작업 중',awaiting_answers:'대표 답변 대기',awaiting_decision:'결정 대기',approved:'승인됨',held:'보류',cancelled:'중단됨',error:'확인 필요'};
export const STEP_LABELS:Record<string,string>={queued:'대기',skipped:'건너뜀',starting:'요청 중',running:'분석 중',complete:'완료',error:'확인 필요'};
export type TeamResult={title:string;summary:string;findings:{point:string;evidence:string;source_ids:string[]}[];uncertainties:string[];recommendation:string;options:{label:string;benefit:string;tradeoff:string}[];next_tasks:string[];table?:{title:string;columns:string[];rows:string[][]}};
export type IntakeQuestion={question:string;why:string;options:string[]};
export type IntakeResult={investment:boolean;investment_reason:string;questions:IntakeQuestion[]};
