'use client';
import {useState} from 'react';
export const CUSTOM='__custom__';
/** 선택지 또는 직접 입력으로 고른 답변 목록. 하나라도 비었거나 300자를 넘으면 null. */
export function intakeAnswers(count:number,choices:string[],custom:string[]){const answers=Array.from({length:count},(_,i)=>choices[i]===CUSTOM?(custom[i]||'').trim():(choices[i]||''));return answers.every(a=>a&&a.length<=300)?answers:null;}
// 비서실장이 업무를 설계하기 전에 대표가 5가지를 결정한다. 제출 후에는 결정 내용을 읽기 전용으로 보여준다.
export default function TeamIntake({job,busy,onSubmit}:{job:any;busy:boolean;onSubmit:(answers:string[],investment:boolean)=>void}){
 const intake=job.steps.find((s:any)=>s.role==='intake')?.result,[choices,setChoices]=useState<string[]>([]),[custom,setCustom]=useState<string[]>([]),[investment,setInvestment]=useState<boolean|null>(null);
 if(!intake)return null;
 if(job.brief)return <div className="team-intake"><h3>대표 결정</h3><p className="team-help">투자 관련 업무 · {job.brief.investment?'예 · 데이터 분석가 실행':'아니오 · 데이터 분석가 건너뜀'}</p><ol>{job.brief.answers.map((a:any,i:number)=><li key={i}><strong>{a.question}</strong><p>{a.answer}</p></li>)}</ol></div>;
 const invest=investment??intake.investment,answers=intakeAnswers(intake.questions.length,choices,custom),open=job.status==='awaiting_answers';
 const pick=(list:string[],i:number,v:string)=>{const next=[...list];next[i]=v;return next;},chip=(on:boolean)=>'team-chip'+(on?' selected':'');
 return <form className="team-intake" onSubmit={e=>{e.preventDefault();if(answers)onSubmit(answers,invest);}}>
  <p className="team-help">업무를 설계하기 전에 대표님이 결정할 5가지입니다. 답변은 이후 모든 담당자에게 확정 조건으로 전달됩니다.</p>
  <div className="team-intake-invest"><strong>투자 관련 업무로 판단했습니다</strong>{intake.investment_reason&&<p>{intake.investment_reason}</p>}<div className="team-chips"><button type="button" className={chip(invest)} aria-pressed={invest} disabled={!open} onClick={()=>setInvestment(true)}>예 · 수치 분석 포함</button><button type="button" className={chip(!invest)} aria-pressed={!invest} disabled={!open} onClick={()=>setInvestment(false)}>아니오 · 분석 건너뜀</button></div>{!invest&&<small>데이터 분석가 단계를 건너뜁니다.</small>}</div>
  {intake.questions.map((q:any,i:number)=><fieldset key={i} disabled={!open}><legend>{i+1}. {q.question}{q.why&&<small>{q.why}</small>}</legend><div className="team-chips">{[...q.options,CUSTOM].map((o:string,j:number)=><button type="button" key={j} className={chip(choices[i]===o)} aria-pressed={choices[i]===o} onClick={()=>setChoices(c=>pick(c,i,o))}>{o===CUSTOM?'직접 입력':o}</button>)}</div>{choices[i]===CUSTOM&&<input type="text" maxLength={300} value={custom[i]||''} placeholder="직접 입력 (300자 이내)" aria-label={`${i+1}번 질문 직접 입력`} onChange={e=>{const v=e.target.value;setCustom(c=>pick(c,i,v));}}/>}</fieldset>)}
  {open&&<button className="primary" type="submit" disabled={busy||!answers}>답변 제출하고 업무 시작</button>}
 </form>;
}
