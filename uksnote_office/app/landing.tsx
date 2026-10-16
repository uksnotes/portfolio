'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowRight,Users,Plane,ChartNoAxesCombined,House,Check} from 'lucide-react';
import {Button} from '@/components/ui/button';

// 로그인 전 첫 화면. 처음 온 사람이 "나한테 뭘 해 주는지"를 예시로 바로 이해하게 한다.
const EXAMPLES=[
 {id:'team',icon:Users,label:'AI 팀',badge:'AI 연결 필요',askLabel:'이렇게 맡기면',ask:'카페 2호점, 성수와 판교 중 어디에 내는 게 나을지 분석해 줘',title:'AI 전문가 5명이 나눠서 일해요',roles:[['비','비서실장','예산·주 고객층·오픈 시기를 먼저 물어봐요'],['리','리서치 분석가','두 상권의 임대료·유동 인구 자료를 찾아요'],['데','데이터 분석가','예상 매출과 비용을 같은 기준으로 비교해요'],['검','검증 담당자','오래된 자료나 계산 실수를 바로잡아요'],['보','보고서 담당자','추천 지역과 근거·위험 요인을 정리해요']],items:[],note:'결론과 출처를 확인하고 확정하거나 다시 요청하면 돼요.'},
 {id:'travel',icon:Plane,label:'여행',badge:'AI 연결 필요',askLabel:'이렇게 입력하면',ask:'오사카 · 3박 4일 · 도보 위주, 한 구간 20분 이내',title:'날짜별 일정표와 지도',items:['관광 명소 중심의 오전·오후 일정','점심·저녁 맛집 후보 2곳씩과 추천 메뉴','구간마다 걷는 시간과 항공편 비교'],note:'가고 싶은 명소를 넣으면 그 주변으로 동선을 짜요.'},
 {id:'stock',icon:ChartNoAxesCombined,label:'투자',badge:'무료',free:true,askLabel:'이렇게 입력하면',ask:'보유 종목을 6자리 종목코드로 등록',title:'내 주식을 한눈에',items:['현재가와 평가손익을 버튼 한 번으로 조회','1년·5년 차트를 확대하며 흐름 확인','코스피200 종목 단기 점수 랭킹'],note:'사라·팔라는 추천이 아니라 판단에 필요한 정보를 보여 드려요.'},
 {id:'home',icon:House,label:'부동산',badge:'실거래·매물 무료',free:true,askLabel:'이렇게 입력하면',ask:'관심 아파트 단지 검색 · 전용 59㎡ / 84㎡',title:'동별 비교 정리',items:['59㎡·84㎡ 실거래 가격대','중개사에 등록된 매물 비교','로얄동·층 후보와 동별 장단점'],note:'로얄동 후보 분석은 AI 연결 후 쓸 수 있어요.'},
];
export default function Landing({onStart}:{onStart:(mode:'login'|'signup')=>void}){
 const [tab,setTab]=useState(EXAMPLES[0].id),ex=EXAMPLES.find(e=>e.id===tab)!;
 return <div className="landing">
  <header className="landing-nav"><Link className="brand" href="/"><span className="brand-icon">BC</span><strong>BrainCrews</strong></Link><Button variant="ghost" onClick={()=>onStart('login')}>로그인</Button></header>
  <main>
   <section className="landing-hero">
    <div className="landing-copy"><span className="landing-badge">나에게 맞춘 AI 오피스</span><h1>하고 싶은 일을 말하면<br/><em>AI가 찾아서 정리해 드려요</em></h1><p>조사와 비교는 AI 팀에게. 여행·주식·집 알아보기도 한 곳에서.</p><div className="landing-cta"><Button className="primary" onClick={()=>onStart('signup')}>무료로 시작하기 <ArrowRight size={17}/></Button></div><ul className="landing-points"><li><Check size={15}/>이메일로 1분 가입</li><li><Check size={15}/>일정·뉴스·시세는 무료</li><li><Check size={15}/>AI 기능은 ChatGPT·Claude·Gemini 중 하나 연결</li></ul></div>
    <div className="landing-demo">
     <div className="landing-tabs" role="tablist" aria-label="사용 예시">{EXAMPLES.map(e=><button key={e.id} role="tab" aria-selected={tab===e.id} className={tab===e.id?'active':''} onClick={()=>setTab(e.id)}><e.icon size={16}/>{e.label}</button>)}</div>
     <div className="landing-chat" role="tabpanel" aria-live="polite">
      <p className="landing-ask"><small>{ex.askLabel}</small>{ex.ask}</p>
      <div className="landing-answer"><small>이렇게 받아요</small><strong>{ex.title}</strong>{ex.roles?<ol className="landing-roles">{ex.roles.map(([n,name,job])=><li key={name}><span>{n}</span><div><strong>{name}</strong>{job}</div></li>)}</ol>:<ul>{ex.items.map(i=><li key={i}><Check size={15}/>{i}</li>)}</ul>}<p>{ex.note}</p></div>
     </div>
     <span className={'landing-demo-tag'+(ex.free?' landing-tag-free':'')}>{ex.badge}</span>
    </div>
   </section>
  </main>
  <footer className="landing-foot"><span>crafted by <a href="https://github.com/uksnotes" target="_blank" rel="noreferrer">uksnote</a></span></footer>
 </div>;
}
