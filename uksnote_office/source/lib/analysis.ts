export const DEFAULT_WEIGHTS={trend:35,momentum:25,volume:20,risk:10,news:10};
export const FACTORS=[{key:'trend',name:'초단기 추세',detail:'최근 종가와 3·5거래일 평균 가격',weight:35},{key:'momentum',name:'단기 수익률',detail:'최근 3거래일 수익률 · 급등 과열 감점',weight:25},{key:'volume',name:'거래량',detail:'직전 3거래일 평균 대비 확정 거래량과 가격 방향',weight:20},{key:'risk',name:'단기 변동폭',detail:'최근 5개 종가의 최대 일간 등락폭과 낙폭',weight:10},{key:'news',name:'뉴스 신호',detail:'7일 내 종목명 일치 기사 · 제목 키워드',weight:10}];
export function validWeights(w:any){return !!w&&Object.keys(w).length===FACTORS.length&&FACTORS.every(f=>Number.isFinite(w[f.key])&&w[f.key]>=0&&w[f.key]<=100)&&Math.abs(FACTORS.reduce((s,f)=>s+w[f.key],0)-100)<.001;}
export function normalizedWeights(w:any){return validWeights(w)?w:{...DEFAULT_WEIGHTS};}
const clamp=(x:number)=>Math.max(0,Math.min(100,x));const mean=(a:number[])=>a.reduce((s,n)=>s+n,0)/a.length;
export function analyze(holding:any,quote:any,news:any[],weights:any=DEFAULT_WEIGHTS){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date()).replaceAll('-','');
 const h=(quote?.history||[]).filter((x:any)=>/^\d{8}$/.test(x.date)&&x.date<today&&Number.isFinite(x.close)&&x.close>0).sort((a:any,b:any)=>a.date.localeCompare(b.date)).slice(-5);const c=h.map((x:any)=>x.close),last=c.at(-1),data:any={};
 if(c.length===5){const ma3=mean(c.slice(-3)),ma5=mean(c);const r3=100*(last/c[1]-1);data.trend={score:clamp(50+800*(last/ma3-1)+800*(ma3/ma5-1)),value:`MA3 ${Math.round(ma3).toLocaleString()} / MA5 ${Math.round(ma5).toLocaleString()}`,reason:last>ma3&&ma3>ma5?'3·5일 평균 위에서 상승 흐름':'단기 평균 가격 대비 위치 확인',ma3,ma5};data.momentum={score:clamp(50+r3*5-(r3>10?10:0)),value:`3거래일 ${r3>=0?'+':''}${r3.toFixed(2)}%`,reason:r3>10?'3거래일 10% 초과 급등 · 과열 10점 감점':'3거래일 수익률이 높을수록 가점'};
 const volumes=h.slice(-4).map((x:any)=>x.volume);if(volumes.every((v:any)=>Number.isFinite(v)&&v>=0)&&mean(volumes.slice(0,3))>0){const ratio=volumes[3]/mean(volumes.slice(0,3)),direction=Math.sign(last-c[3]);data.volume={score:clamp(50+direction*Math.min(ratio,3)*15),value:`직전 3일 평균의 ${ratio.toFixed(2)}배`,reason:'가장 최근 확정 거래일의 거래량과 등락 방향'};}
 const returns=c.slice(1).map((v:number,i:number)=>100*(v/c[i]-1));let peak=c[0],dd=0;for(const v of c){peak=Math.max(peak,v);dd=Math.min(dd,100*(v/peak-1));}const swing=Math.max(...returns.map(Math.abs));data.risk={score:clamp(100-swing*8-Math.abs(dd)*5),value:`최대 일간 등락 ${swing.toFixed(2)}% · 낙폭 ${dd.toFixed(2)}%`,reason:'5개 종가 내 변동폭이 작을수록 가점 · 장기 위험 추정 아님'};
 }
 const related=(news||[]).filter(n=>holding.name&&(n.title+' '+n.summary).includes(holding.name)&&n.publishedAt&&Date.now()-Date.parse(n.publishedAt)>=0&&Date.now()-Date.parse(n.publishedAt)<7*86400000);
 if(related.length){let positive=0,negative=0;for(const n of related){positive+=(n.title.match(/실적 개선|흑자전환|수주|사상 최대|배당 확대|목표가 상향/g)||[]).length;negative+=(n.title.match(/적자|실적 부진|소송|목표가 하향|리콜|횡령/g)||[]).length;}data.news={score:clamp(50+(positive-negative)*10),value:`관련 ${related.length}건 · 긍정 ${positive} / 부정 ${negative}`,reason:'제목 키워드 규칙 · 문맥을 오판할 수 있음'};}
 const valid=validWeights(weights),coverage=FACTORS.reduce((s,f)=>s+(data[f.key]?weights[f.key]||0:0),0);const age=Date.now()-Date.parse(quote?.historyFetchedAt);const date=h.at(-1)?.date;const barAge=date?Date.now()-Date.parse(date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6)+'T15:30:00+09:00'):Infinity;
 const old=!!quote?.historyError||!Number.isFinite(age)||age>86400000||age<0||barAge>7*86400000;
 const total=valid&&!old&&h.length===5&&coverage>=80?FACTORS.reduce((s,f)=>s+(data[f.key]?data[f.key].score*weights[f.key]:0),0)/coverage:null;
 return {data,coverage,total,old,related,lastDate:date,barCount:h.length,label:!valid?'가중치 확인':old?'시세 갱신 필요':total===null?'데이터 부족':total>=65?'단기 우호':total>=40?'중립 · 관망':'단기 주의'};
}
