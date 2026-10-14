import {ExternalLink} from 'lucide-react';
function Links({sources}:{sources:any[]}){return !!sources.length&&<div className="team-sources"><strong>참고 자료</strong>{sources.map((s,i)=>{let valid=false;try{valid=new URL(s.url).protocol==='https:';}catch{}return valid?<a key={s.url+i} href={s.url} target="_blank" rel="noreferrer">{s.id&&s.id+' · '}{s.title}<ExternalLink size={13}/></a>:null;})}</div>;}
function Table({title,columns,rows}:{title:string;columns:string[];rows:string[][]}){return <div className="team-table"><h4>{title}</h4><div className="team-table-scroll"><table><thead><tr>{columns.map((c,i)=><th key={i}>{c}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table></div></div>;}
// 보고용 순서: 결론 요약 → 비교표 → 핵심 근거 → 선택지 → 추천안 → 확인할 점 → 참고 자료
export default function Report({result,sources}:{result:any,sources:any[]}){if(!result)return null;const known=(ids:string[])=>ids.filter(id=>sources.some(s=>s.id===id)).join(', ')||'—';
 return <div className="team-report"><h3>{result.title}</h3><p className="team-summary">{result.summary}</p>
  {!!result.table?.rows?.length&&<Table {...result.table}/>}
  {!!result.findings?.length&&<Table title="핵심 근거" columns={['항목','근거','출처']} rows={result.findings.map((f:any)=>[f.point,f.evidence,known(f.source_ids||[])])}/>}
  {!!result.options?.length&&<Table title="선택지" columns={['선택지','장점','고려할 점']} rows={result.options.map((o:any)=>[o.label,o.benefit,o.tradeoff])}/>}
  {result.recommendation&&<div className="team-recommend"><strong>추천안</strong><p>{result.recommendation}</p></div>}
  {!!result.uncertainties?.length&&<div className="team-uncertain"><strong>확인할 점</strong><ul>{result.uncertainties.map((s:string,i:number)=><li key={i}>{s}</li>)}</ul></div>}
  {!!result.next_tasks?.length&&<details className="method-details"><summary>후속 작업</summary><ul>{result.next_tasks.map((s:string,i:number)=><li key={i}>{s}</li>)}</ul></details>}
  <Links sources={sources}/></div>;}
