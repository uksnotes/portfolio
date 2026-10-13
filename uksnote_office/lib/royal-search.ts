import {load} from 'cheerio/slim';
import {dongKey,targetArea} from './apartment-comparison';
import {safeURL} from './travel-data';
export function royalSearchLinks(apt:any){const q=apt.name+' '+apt.address+' 로얄동 59 84';return {naver:'https://search.naver.com/search.naver?query='+encodeURIComponent(q),google:'https://www.google.com/search?q='+encodeURIComponent(q)};}
export function parseSearchEvidence(html:string,provider:string){const $=load(html);$('script,style,nav,header,footer').remove();const entries:any[]=[];
 $('a[href]').each((_,a)=>{let url=safeURL($(a).attr('href'));if(!url)return;const u=new URL(url);if(/(^|\.)(google\.com|naver\.com)$/.test(u.hostname)&&!['blog.naver.com','m.blog.naver.com','cafe.naver.com'].includes(u.hostname))return;
 const title=$(a).text().replace(/\s+/g,' ').trim(),snippet=$(a).parent().text().replace(/\s+/g,' ').trim();if(!/로[얄열]동/.test(title+' '+snippet))return;entries.push({url,title:title.slice(0,160)||u.hostname,snippet:snippet.slice(0,1000),provider});});
 const groups=new Map<string,any>();for(const e of entries){if(!groups.has(e.url)||groups.get(e.url).snippet.length<e.snippet.length)groups.set(e.url,e);}return [...groups.values()].slice(0,15);
}
export async function searchRoyalSeeds(apt:any){const links=royalSearchLinks(apt),sources:any[]=[],errors:string[]=[];
 const result=await Promise.allSettled(Object.entries(links).map(async([provider,url])=>{const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{Accept:'text/html'}});if(!r.ok)throw Error(provider+' 검색 접근 제한');const text=await r.text();if(text.length>2500000)throw Error(provider+' 검색 응답 용량 초과');if(/captcha-form|unusual traffic|자동입력 방지/.test(text))throw Error(provider+' 검색 접근 제한');return parseSearchEvidence(text,provider);}));
 for(const r of result)if(r.status==='fulfilled')sources.push(...r.value);else errors.push((r.reason as Error).message);return {links,sources,errors};
}
const author=(url:string)=>{const u=new URL(url);return /(?:blog|cafe)\.naver\.com$/.test(u.hostname)?u.hostname+'/'+u.pathname.split('/')[1]:u.hostname;};
export function rankRoyalEvidence(evidence:any[],apt:any,sourceSet:Set<string>){const groups=new Map<string,any>();
 for(const e of evidence){const name=dongKey(e.building),url=safeURL(e.sourceUrl);if(!name||!(apt.buildings||[]).some((b:any)=>dongKey(b.name)===name)||!sourceSet.has(url)||!e.reason||!e.quote||!['59','84','all'].includes(e.area))continue;
 const key=name+':'+e.area;if(!groups.has(key))groups.set(key,{building:name,area:e.area,evidence:[]});const group=groups.get(key);if(!group.evidence.some((x:any)=>author(x.sourceUrl)===author(url)))group.evidence.push({...e,sourceUrl:url,quote:String(e.quote).slice(0,100)});
 }
 return [...groups.values()].sort((a,b)=>b.evidence.length-a.evidence.length||a.building.localeCompare(b.building,'ko',{numeric:true})).map((x,i)=>({...x,rank:i+1,confidence:x.evidence.length>=2?'복수 출처':'단일 출처'}));
}
export function brokerFallback(items:any[],area:string){return ['59','84'].filter(a=>area==='all'||area===a).map(a=>({area:a,items:items.filter(x=>targetArea(x.area)===a&&x.brokerVerified&&x.price>0&&dongKey(x.building)).sort((x,y)=>x.price/x.area-y.price/y.area||String(y.updatedAt||'').localeCompare(String(x.updatedAt||''))).slice(0,3)}));}
