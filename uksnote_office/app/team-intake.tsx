'use client';
import {useState} from 'react';
import {Check,PencilLine} from 'lucide-react';
export const CUSTOM='__custom__';
/** 선택지 또는 직접 입력으로 고른 답변 목록. 하나라도 비었거나 300자를 넘으면 null. */
export function intakeAnswers(count:number,choices:string[],custom:string[]){const answers=Array.from({length:count},(_,i)=>choices[i]===CUSTOM?(custom[i]||'').trim():(choices[i]||''));return answers.every(a=>a&&a.length<=300)?answers:null;}
const answered=(choice:string|undefined,custom:string|undefined)=>choice===CUSTOM?!!custom?.trim():!!choice;
// 질문 카드 머리: 번호 배지(답하면 체크), 질문, 묻는 이유.
function Head({n,done,question,why}:{n:number;done:boolean;question:string;why?:string}){return <div className="team-q-head"><span className={'team-q-badge'+(done?' is-complete':'')} aria-hidden>{done?<Check size={14}/>:n}</span><div><strong>{question}</strong>{why&&<small>{why}</small>}</div></div>;}
// 비서실장이 업무를 설계하기 전에 대표가 5가지를 결정한다. 제출 후에는 고른 답과 나머지 선택지를 읽기 전용으로 보여준다.
export default function TeamIntake({job,busy,onSubmit}:{job:any;busy:boolean;onSubmit:(answers:string[],investment:boolean)=>void}){
 const intake=job.steps.find((s:any)=>s.role==='intake')?.result,[choices,setChoices]=useState<string[]>([]),[custom,setCustom]=useState<string[]>([]),[investment,setInvestment]=useState<boolean|null>(null);
 if(!intake)return null;
 if(job.brief)return <div className="team-intake"><div className="team-intake-top"><h3>대표 결정</h3><span className="team-intake-count is-complete">{job.brief.answers.length}/{job.brief.answers.length} 결정 완료</span></div><p className="team-help">투자 관련 업무 · {job.brief.investment?'예 · 데이터 분석가 실행':'아니오 · 데이터 분석가 건너뜀'}</p>
  {job.brief.answers.map((a:any,i:number)=>{const options:string[]=intake.questions[i]?.options||[],custom=!options.includes(a.answer);return <section className="team-q" key={i}><Head n={i+1} done question={a.question}/><div className="team-options-grid">{options.map(o=><span key={o} className={'team-option'+(o===a.answer?' selected':' faded')}><span className="team-option-dot" aria-hidden>{o===a.answer&&<Check size={12}/>}</span>{o}</span>)}{custom&&<span className="team-option selected"><span className="team-option-dot" aria-hidden><Check size={12}/></span>{a.answer}</span>}</div></section>;})}</div>;
 const invest=investment??intake.investment,count=intake.questions.length,answers=intakeAnswers(count,choices,custom),open=job.status==='awaiting_answers',done=intake.questions.filter((_:any,i:number)=>answered(choices[i],custom[i])).length;
 const pick=(list:string[],i:number,v:string)=>{const next=[...list];next[i]=v;return next;};
 return <form className="team-intake" onSubmit={e=>{e.preventDefault();if(answers)onSubmit(answers,invest);}}>
  <div className="team-intake-top"><div><h3>대표님이 결정할 {count}가지</h3><p className="team-help">고른 답은 모든 담당자에게 확정 조건으로 전달됩니다.</p></div><span className={'team-intake-count'+(done===count?' is-complete':'')}>{done}/{count} 결정</span></div>
  <div className="team-intake-progress" aria-hidden><span style={{width:`${done/count*100}%`}}/></div>
  <section className="team-q team-q-invest"><Head n={0} done question="투자 관련 업무로 판단했습니다" why={intake.investment_reason}/><div className="team-invest-grid">{[[true,'예, 투자 업무예요','데이터 분석가가 수치 분석을 함께 합니다'],[false,'아니요','데이터 분석가 단계를 건너뜁니다']].map(([v,label,desc])=><button type="button" key={label as string} className={'team-invest-option'+(invest===v?' selected':'')} aria-pressed={invest===v} disabled={!open} onClick={()=>setInvestment(v as boolean)}><strong>{label}</strong><small>{desc}</small></button>)}</div></section>
  {intake.questions.map((q:any,i:number)=><fieldset className="team-q" key={i} disabled={!open}><legend className="sr-only">{i+1}. {q.question}</legend><Head n={i+1} done={answered(choices[i],custom[i])} question={q.question} why={q.why}/>
   <div className="team-options-grid">{[...q.options,CUSTOM].map((o:string,j:number)=><button type="button" key={j} className={'team-option'+(choices[i]===o?' selected':'')} aria-pressed={choices[i]===o} onClick={()=>setChoices(c=>pick(c,i,o))}><span className="team-option-dot" aria-hidden>{choices[i]===o&&<Check size={12}/>}</span>{o===CUSTOM?<><PencilLine size={14} aria-hidden/>직접 입력</>:o}</button>)}</div>
   {choices[i]===CUSTOM&&<textarea rows={2} maxLength={300} value={custom[i]||''} placeholder="원하는 내용을 적어 주세요 (300자 이내)" aria-label={`${i+1}번 질문 직접 입력`} autoFocus onChange={e=>{const v=e.target.value;setCustom(c=>pick(c,i,v));}}/>}</fieldset>)}
  {open&&<div className="team-intake-submit"><button className="primary" type="submit" disabled={busy||!answers}>답변 제출하고 업무 시작</button><small>{answers?'모두 결정했어요. 제출하면 업무 설계를 시작합니다.':`${count-done}개 남았어요`}</small></div>}
 </form>;
}
