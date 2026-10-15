'use client';
import {useState} from 'react';
import {ArrowRight,Building2,ChartNoAxesCombined,Check,ChevronLeft,ExternalLink,KeyRound,Newspaper,Plane,Users} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
// 첫 접속 사용법. 1단계는 API 키 등록, 이후는 주요 공간 소개. go는 'api'(키 등록 창) 또는 이동할 공간 id.
const STEPS=[
 {icon:KeyRound,eyebrow:'1단계 · 먼저 해 주세요',title:'AI API 키 등록',body:'AI 팀·여행·부동산 리서치의 AI 기능은 내 API 키로 동작합니다. Claude·Gemini·ChatGPT 중 하나만 등록해도 됩니다.',points:['키는 계정별로 암호화해 저장하고, 내 키는 나만 씁니다','등록한 서비스만 호출하며 요금은 해당 서비스에서 청구됩니다','나중에 화면 위의 + API 키 추가에서 바꿀 수 있습니다'],links:[['Claude 키 발급','https://console.anthropic.com/settings/keys'],['Gemini 키 발급','https://aistudio.google.com/apikey'],['ChatGPT 키 발급','https://platform.openai.com/api-keys']],go:'api',goLabel:'지금 등록하기'},
 {icon:Users,eyebrow:'AI 팀 오피스',title:'목표를 맡기면 팀이 보고서로',body:'업무를 지시하면 비서실장이 먼저 대표 결정 질문을 드립니다.',points:['질문에 답하면 리서치·분석·검증 담당이 차례로 작업합니다','최종 보고서는 표 위주이고 Word·PDF로 내려받을 수 있습니다','승인·보류·수정 요청은 대표님이 직접 결정합니다'],go:'team'},
 {icon:Building2,eyebrow:'부동산 리서치',title:'아파트 단지 비교를 한곳에서',body:'단지를 찾아 59·84㎡ 매매 기준으로 비교합니다.',points:['실거래가와 중개사 매물을 함께 확인합니다','로얄동 후보와 그 근거를 보여 줍니다'],go:'apartments'},
 {icon:Plane,eyebrow:'여행',title:'일정표·맛집·지도와 항공권',body:'목적지와 날짜를 입력하면 여행 계획을 만들어 드립니다.',points:['전체 일정표, 맛집 리스트, 날짜별 지도를 제공합니다','식당을 바꾸면 일정과 지도에 함께 반영됩니다','왕복·직항·최저가 항공권을 실시간으로 조회합니다'],go:'travel'},
 {icon:ChartNoAxesCombined,eyebrow:'투자실 · 분석실',title:'보유 종목과 시장 흐름',body:'6자리 종목코드로 보유 종목과 관심종목을 등록합니다. 시세는 별도 키 없이 가져옵니다.',points:['현재가와 평가손익을 한눈에 확인합니다','최근 5거래일 시세와 뉴스로 단기 점수를 계산합니다','1년·5년 차트를 확대·이동하며 날짜별 가격을 봅니다'],go:'portfolio'},
 {icon:Newspaper,eyebrow:'일정 · 뉴스 · 메일',title:'하루를 정리하는 도구',body:'오피스 홈에서 오늘의 할 일을 바로 확인할 수 있습니다.',points:['일정 보드: 월간 달력과 오늘의 할 일','뉴스룸: 분야별 주요 기사의 핵심 요약','메일 데스크: 초안 저장 후 Gmail·Outlook으로 보내기'],go:'planner'},
];
export default function OfficeGuide({name,onClose,onGo}:{name:string;onClose:()=>void;onGo:(target:string)=>void}){
 const [step,setStep]=useState(0),s=STEPS[step],last=step===STEPS.length-1,Icon=s.icon;
 return <Dialog open onOpenChange={v=>{if(!v)onClose();}}><DialogContent className="office-guide">
  <div className="guide-top"><div className="guide-steps" role="group" aria-label="사용법 단계">{STEPS.map((x,i)=><button type="button" key={x.title} className={'guide-step'+(i===step?' current':i<step?' done':'')} aria-label={`${i+1}. ${x.eyebrow}`} aria-current={i===step?'step':undefined} onClick={()=>setStep(i)}/>)}</div><span className="guide-count">{step+1} / {STEPS.length}</span></div>
  {step===0&&<p className="guide-welcome">{name}님, 오피스에 오신 것을 환영합니다! 시작 전에 사용법을 짧게 안내해 드릴게요.</p>}
  <div className="guide-body" key={step}><span className="guide-icon" aria-hidden><Icon size={22}/></span><span className="guide-eyebrow">{s.eyebrow}</span><DialogTitle className="guide-title">{s.title}</DialogTitle><DialogDescription className="guide-desc">{s.body}</DialogDescription>
   <ul className="guide-points">{s.points.map(p=><li key={p}><Check size={15} aria-hidden/>{p}</li>)}</ul>
   {s.links&&<div className="guide-links">{s.links.map(([label,url])=><a key={url} href={url} target="_blank" rel="noreferrer">{label} <ExternalLink size={13} aria-hidden/></a>)}</div>}
   <Button type="button" variant={step===0?'default':'outline'} className={'guide-go'+(step===0?' primary':'')} onClick={()=>onGo(s.go)}>{s.goLabel||s.eyebrow+' 바로 가기'} <ArrowRight size={15}/></Button></div>
  <div className="guide-actions">{step>0?<Button type="button" variant="ghost" onClick={()=>setStep(step-1)}><ChevronLeft size={16}/> 이전</Button>:<Button type="button" variant="ghost" onClick={onClose}>건너뛰기</Button>}
   <Button type="button" className={step===0?'':'primary'} variant={step===0?'outline':'default'} onClick={()=>last?onClose():setStep(step+1)}>{last?'시작하기':step===0?'나중에 등록하고 다음':'다음'}{!last&&<ArrowRight size={15}/>}</Button></div>
 </DialogContent></Dialog>;
}
