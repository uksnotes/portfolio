'use client';
import {type ReactNode,useEffect,useRef,useState} from 'react';
import {Check,ChevronLeft,ChevronRight,PencilLine} from 'lucide-react';
import {AI_TEAM,OPTIONAL_ROLES,intakeRoles,skippedRoles} from '@/lib/ai-team';
export const CUSTOM='__custom__';
/** 선택지 또는 직접 입력으로 고른 답변 목록. 하나라도 비었거나 300자를 넘으면 null. */
export function intakeAnswers(count:number,choices:string[],custom:string[]){const answers=Array.from({length:count},(_,i)=>choices[i]===CUSTOM?(custom[i]||'').trim():(choices[i]||''));return answers.every(a=>a&&a.length<=300)?answers:null;}
const answered=(choice:string|undefined,custom:string|undefined)=>choice===CUSTOM?!!custom?.trim():!!choice;
const names=(ids:string[])=>AI_TEAM.filter(a=>ids.includes(a.id)).map(a=>a.name);
const teamRow=(skip:string[])=>({question:'참여 담당자',answer:names(AI_TEAM.map(a=>a.id).filter(id=>!skip.includes(id))).join(' · ')+(skip.length?` · 건너뜀: ${names(skip).join(', ')}`:'')});
// 선택지 버튼 하나: 동그라미(고르면 체크), 이름, 보조 설명.
function Choice({selected,onClick,children,desc}:{selected:boolean;onClick:()=>void;children:ReactNode;desc?:string}){return <button type="button" className={'team-choice'+(selected?' selected':'')} aria-pressed={selected} onClick={onClick}><span className="team-option-dot" aria-hidden>{selected&&<Check size={12}/>}</span><span><strong>{children}</strong>{desc&&<small>{desc}</small>}</span></button>;}
// "질문 → 고른 답" 요약. onEdit이 있으면 줄마다 수정 버튼(최종 확인), 없으면 읽기 전용(제출 후).
function Summary({rows,onEdit}:{rows:{question:string;answer:string}[];onEdit?:(i:number)=>void}){return <ol className="team-summary-list">{rows.map((r,i)=><li key={i}><span className="team-q-badge is-complete" aria-hidden><Check size={14}/></span><div><small>{r.question}</small><strong>{r.answer}</strong></div>{onEdit&&<button type="button" className="team-edit" onClick={()=>onEdit(i)}>수정</button>}</li>)}</ol>;}
// 비서실장이 업무를 설계하기 전에 대표가 참여 담당자와 질문 5개를 한 번에 하나씩 결정한다.
// 단계: 0 = 참여 담당자(AI 추천을 미리 골라 둠, 데이터 분석가·검증 담당자만 뺄 수 있음), 1~5 = 질문, 6 = 최종 확인 후 제출. 제출 후에는 요약만 읽기 전용으로 보여준다.
export default function TeamIntake({job,busy,onSubmit}:{job:any;busy:boolean;onSubmit:(answers:string[],skip:string[])=>void}){
 const intake=job.steps.find((s:any)=>s.role==='intake')?.result,[choices,setChoices]=useState<string[]>([]),[custom,setCustom]=useState<string[]>([]),[skipped,setSkipped]=useState<string[]|null>(null),[step,setStep]=useState(0),[reached,setReached]=useState(0),timer=useRef<ReturnType<typeof setTimeout>>(undefined),heading=useRef<HTMLHeadingElement>(null),moved=useRef(false);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 // 단계가 바뀌면 새 질문으로 포커스를 옮긴다(첫 화면에서는 옮기지 않음).
 useEffect(()=>{if(moved.current)heading.current?.focus({preventScroll:true});moved.current=true;},[step]);
 if(!intake)return null;
 if(job.brief)return <div className="team-intake"><div className="team-intake-top"><h3>대표 결정</h3><span className="team-intake-count is-complete">결정 완료</span></div><Summary rows={[teamRow(skippedRoles(job.brief)),...job.brief.answers]}/></div>;
 const roles=intakeRoles(intake),skip=skipped??OPTIONAL_ROLES.filter(r=>!roles[r as keyof typeof roles].use),questions=intake.questions,count=questions.length,total=count+1,answers=intakeAnswers(count,choices,custom),open=job.status==='awaiting_answers',final=step>count;
 const done=(s:number)=>s===0?reached>0:answered(choices[s-1],custom[s-1]);
 const go=(s:number)=>{clearTimeout(timer.current);setStep(s);setReached(r=>Math.max(r,s));};
 // 고르면 잠깐 체크를 보여준 뒤 넘어간다. 모두 답했으면(수정하러 돌아온 경우 포함) 다음·자동 이동 모두 최종 확인으로.
 const advance=(c:string[],t:string[])=>{clearTimeout(timer.current);timer.current=setTimeout(()=>go(intakeAnswers(count,c,t)?count+1:step+1),280);};
 const pick=(list:string[],i:number,v:string)=>{const next=[...list];next[i]=v;return next;};
 const q=questions[step-1],i=step-1;
 return <form className="team-intake" onSubmit={e=>{e.preventDefault();if(answers&&open&&final)onSubmit(answers,skip);}}>
  <div className="team-intake-top"><div><h3>대표 결정</h3><p className="team-help">고른 답은 모든 담당자에게 확정 조건으로 전달됩니다.</p></div><span className={'team-intake-count'+(final?' is-complete':'')}>{final?'최종 확인':`${step+1} / ${total}`}</span></div>
  <div className="team-steps" role="group" aria-label="결정 단계">{Array.from({length:total},(_,s)=><button type="button" key={s} className={'team-step'+(s===step?' current':done(s)?' done':'')} disabled={s>reached&&!done(s)} aria-current={s===step?'step':undefined} aria-label={`${s+1}단계${done(s)?' · 답함':''}`} onClick={()=>go(s)}/>)}</div>
  {final?<section className="team-step-card"><div className="team-step-head"><h4 ref={heading} tabIndex={-1}>이대로 업무를 시작할까요?</h4><small>바꾸고 싶은 항목은 수정을 눌러 다시 고르세요.</small></div><Summary rows={[teamRow(skip),...questions.map((x:any,k:number)=>({question:x.question,answer:answers?.[k]||(choices[k]===CUSTOM?(custom[k]||'').trim():choices[k])||'-'}))]} onEdit={open?go:undefined}/></section>
  :step===0?<fieldset className="team-step-card" disabled={!open}><div className="team-step-head"><h4 ref={heading} tabIndex={-1}>이번 업무에 참여할 담당자를 골라 주세요</h4><small>데이터 분석가와 검증 담당자는 빼도 됩니다. 업무에 맞게 AI 추천을 미리 골라 두었어요.</small></div>
   <div className="team-choice-list">{AI_TEAM.map(a=>{const r=roles[a.id as keyof typeof roles];return r?<Choice key={a.id} selected={!skip.includes(a.id)} desc={r.reason||a.description} onClick={()=>setSkipped(skip.includes(a.id)?skip.filter(x=>x!==a.id):[...skip,a.id])}>{a.name}{r.use&&<span className="team-role-badge">AI 추천</span>}</Choice>
    :<div key={a.id} className="team-role-fixed"><span className="team-option-dot" aria-hidden><Check size={12}/></span><span><strong>{a.name}</strong><small>{a.description}</small></span><em>필수</em></div>;})}</div></fieldset>
  :<fieldset className="team-step-card" disabled={!open}><div className="team-step-head"><h4 ref={heading} tabIndex={-1}>{q.question}</h4>{q.why&&<small>{q.why}</small>}</div>
   <div className="team-choice-list">{q.options.map((o:string)=><Choice key={o} selected={choices[i]===o} onClick={()=>{const c=pick(choices,i,o);setChoices(c);advance(c,custom);}}>{o}</Choice>)}
    <Choice selected={choices[i]===CUSTOM} onClick={()=>{clearTimeout(timer.current);setChoices(c=>pick(c,i,CUSTOM));}}><PencilLine size={14} aria-hidden/> 직접 입력</Choice></div>
   {choices[i]===CUSTOM&&<textarea rows={2} maxLength={300} value={custom[i]||''} placeholder="원하는 내용을 적고 Enter 또는 다음을 누르세요 (300자 이내)" aria-label={`${step}번 질문 직접 입력`} autoFocus onChange={e=>{const v=e.target.value;setCustom(c=>pick(c,i,v));}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(done(step))go(answers?count+1:step+1);}}}/>}</fieldset>}
  <div className="team-intake-nav">
   {step>0?<button type="button" className="team-nav-back" onClick={()=>go(step-1)}><ChevronLeft size={16} aria-hidden/>이전</button>:<span/>}
   {/* key를 달리해 '다음' 클릭이 같은 자리에 새로 생긴 제출 버튼으로 이어져 바로 제출되지 않게 한다. */}
   {final?open&&<button key="submit" className="primary" type="submit" disabled={busy||!answers}>답변 제출하고 업무 시작</button>
   :<button key="next" type="button" className="primary" disabled={!(step===0||done(step))} onClick={()=>go(answers?count+1:step+1)}>다음<ChevronRight size={16} aria-hidden/></button>}
  </div>
 </form>;
}
