import type {TeamResult} from '@/lib/ai-team';
/** 최종 보고서 내보내기. 같은 보고서 데이터로 Word(.docx)와 A4 인쇄용 HTML(PDF로 저장)을 만든다. */
type Source={id?:string;title:string;url:string};
export type ReportDoc={title:string;instruction:string;model:string;date:string;ymd:string;result:TeamResult;sources:Source[]};
const FONT='맑은 고딕';
const https=(url:string)=>{try{return new URL(url).protocol==='https:';}catch{return false;}};
const kst=(value:string)=>new Date(new Date(value).getTime()+9*3600000).toISOString().slice(0,10);
export function reportDocument(job:any,model:string):ReportDoc|null{const writer=job.steps?.find((s:any)=>s.role==='writer'&&s.status==='complete'&&s.result);if(!writer)return null;
 const sources=[...new Map([...(job.contextInfo?.sources||[]),...job.steps.flatMap((s:any)=>s.sources||[])].filter((s:any)=>typeof s?.url==='string'&&https(s.url)).map((s:any)=>[s.url,{id:s.id,title:String(s.title||s.url),url:s.url}])).values()] as Source[];
 const day=kst(writer.completedAt||new Date().toISOString());return {title:writer.result.title||job.instruction.slice(0,40),instruction:job.instruction,model,date:day.replaceAll('-','. ').replace(/\. 0/g,'. ')+'.',ymd:day.replaceAll('-',''),result:writer.result,sources};}
export function reportFileName(doc:ReportDoc,ext:'docx'|'pdf'){const title=Array.from(doc.title.replace(/[\\/:*?"<>|\s]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')).slice(0,30).join('')||'AI팀';return `보고서-${title}-${doc.ymd}.${ext}`;}
// 표 세 개(비교표·핵심 근거·선택지)는 Word와 인쇄 화면이 같은 내용을 쓰도록 한곳에서 만든다.
function tables(doc:ReportDoc){const r=doc.result,list:{title:string;columns:string[];rows:string[][]}[]=[];if(r.table?.rows.length)list.push(r.table);
 if(r.findings.length)list.push({title:'핵심 근거',columns:['항목','근거','출처'],rows:r.findings.map(f=>[f.point,f.evidence,f.source_ids.join(', ')])});
 if(r.options.length)list.push({title:'선택지',columns:['선택지','장점','고려할 점'],rows:r.options.map(o=>[o.label,o.benefit,o.tradeoff])});return list;}
const esc=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
export function reportHTML(doc:ReportDoc){const r=doc.result;
 return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(reportFileName(doc,'pdf'))}</title><style>@page{size:A4;margin:16mm}body{font-family:'${FONT}','Malgun Gothic','Apple SD Gothic Neo',sans-serif;font-size:10.5pt;line-height:1.55;color:#1d2b38;margin:0}h1{font-size:16pt;margin:0 0 4pt}h2{font-size:11.5pt;margin:14pt 0 5pt;border-bottom:1px solid #b9c7d3;padding-bottom:2pt}.meta{color:#5b6f80;font-size:9pt;margin-bottom:10pt}.summary{background:#eef3f7;padding:8pt 10pt;border-radius:4pt}table{width:100%;border-collapse:collapse;font-size:9.5pt;margin:4pt 0 8pt}th,td{border:1px solid #b9c7d3;padding:4pt 6pt;text-align:left;vertical-align:top}th{background:#e3ebf2}tr{break-inside:avoid}ul{margin:4pt 0;padding-left:16pt}a{color:#2c5d86;word-break:break-all}</style></head><body>`+
 `<h1>${esc(doc.title)}</h1><div class="meta">${esc(doc.date)} · ${esc(doc.model)} · 지시: ${esc(doc.instruction)}</div><p class="summary">${esc(r.summary)}</p>`+
 tables(doc).map(t=>`<h2>${esc(t.title)}</h2><table><thead><tr>${t.columns.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${t.rows.map(row=>`<tr>${row.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`).join('')+
 (r.recommendation?`<h2>추천안</h2><p>${esc(r.recommendation)}</p>`:'')+(r.uncertainties.length?`<h2>확인할 점</h2><ul>${r.uncertainties.map(u=>`<li>${esc(u)}</li>`).join('')}</ul>`:'')+
 (doc.sources.length?`<h2>참고 자료</h2><ul>${doc.sources.map(s=>`<li>${s.id?esc(s.id)+' · ':''}${esc(s.title)} — <a href="${esc(s.url)}">${esc(s.url)}</a></li>`).join('')}</ul>`:'')+'</body></html>';}
export async function wordDocument(doc:ReportDoc){const d=await import('docx'),r=doc.result,border={style:d.BorderStyle.SINGLE,size:4,color:'B9C7D3'};
 const run=(text:string,o:{bold?:boolean;size?:number;color?:string}={})=>new d.TextRun({text,font:FONT,size:o.size??21,bold:o.bold,color:o.color});
 const para=(text:string,o:{bold?:boolean;size?:number;color?:string;after?:number}={})=>new d.Paragraph({children:[run(text,o)],spacing:{after:o.after??80}});
 const heading=(text:string)=>new d.Paragraph({children:[run(text,{bold:true,size:23})],spacing:{before:220,after:80},border:{bottom:border}});
 const cell=(text:string,head:boolean)=>new d.TableCell({children:[new d.Paragraph({children:[run(text,{size:19,bold:head})]})],shading:head?{type:d.ShadingType.CLEAR,color:'auto',fill:'E3EBF2'}:undefined,margins:{top:60,bottom:60,left:100,right:100}});
 const table=(columns:string[],rows:string[][])=>new d.Table({width:{size:100,type:d.WidthType.PERCENTAGE},borders:{top:border,bottom:border,left:border,right:border,insideHorizontal:border,insideVertical:border},rows:[new d.TableRow({tableHeader:true,children:columns.map(c=>cell(c,true))}),...rows.map(row=>new d.TableRow({cantSplit:true,children:row.map(c=>cell(c,false))}))]});
 const children:any[]=[para(doc.title,{bold:true,size:32,after:60}),para(`${doc.date} · ${doc.model} · 지시: ${doc.instruction}`,{size:18,color:'5B6F80',after:160}),para(r.summary,{after:120})];
 for(const t of tables(doc))children.push(heading(t.title),table(t.columns,t.rows));
 if(r.recommendation)children.push(heading('추천안'),para(r.recommendation));
 if(r.uncertainties.length)children.push(heading('확인할 점'),...r.uncertainties.map(u=>para('• '+u)));
 if(doc.sources.length)children.push(heading('참고 자료'),...doc.sources.map(s=>new d.Paragraph({spacing:{after:40},children:[run(`${s.id?s.id+' · ':''}${s.title} — `,{size:18}),new d.ExternalHyperlink({link:s.url,children:[new d.TextRun({text:s.url,font:FONT,size:18,style:'Hyperlink'})]})]})));
 // A4, 여백 18mm(약 1020 twip)
 return new d.Document({creator:"UK'S OFFICE",title:doc.title,sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1020,bottom:1020,left:1020,right:1020}}},children}]});}
export async function downloadWord(doc:ReportDoc){const {Packer}=await import('docx'),blob=await Packer.toBlob(await wordDocument(doc)),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=reportFileName(doc,'docx');document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
// 보고서만 담은 숨은 iframe을 인쇄한다. 사용자가 인쇄 창에서 'PDF로 저장'을 고른다.
export function printReport(doc:ReportDoc){const frame=document.createElement('iframe');frame.setAttribute('aria-hidden','true');frame.style.cssText='position:fixed;width:0;height:0;border:0;right:0;bottom:0';document.body.appendChild(frame);const w=frame.contentWindow!;w.document.open();w.document.write(reportHTML(doc));w.document.close();const done=()=>setTimeout(()=>frame.remove(),1000);w.addEventListener('afterprint',done);setTimeout(()=>{w.focus();w.print();},250);setTimeout(()=>frame.isConnected&&frame.remove(),120000);}
