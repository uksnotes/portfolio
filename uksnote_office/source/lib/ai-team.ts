export const TEAM_MODEL='gpt-5.6-sol';
export const TEAM_MODELS=[
 {id:TEAM_MODEL,provider:'openai',label:'OpenAI · Sol',providerLabel:'OpenAI',note:'리서치 담당자는 필요할 때 웹 검색을 사용합니다.'},
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
export const JOB_LABELS:Record<string,string>={running:'팀 작업 중',awaiting_decision:'결정 대기',approved:'승인됨',held:'보류',cancelled:'중단됨',error:'확인 필요'};
export const STEP_LABELS:Record<string,string>={queued:'대기',starting:'요청 중',running:'분석 중',complete:'완료',error:'확인 필요'};
export type TeamResult={title:string;summary:string;findings:{point:string;evidence:string;source_ids:string[]}[];uncertainties:string[];recommendation:string;options:{label:string;benefit:string;tradeoff:string}[];next_tasks:string[]};
