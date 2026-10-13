import {load} from 'cheerio/slim';

const clean=(text:string)=>text.replace(/\u00a0/g,' ').replace(/[\t\r ]+/g,' ').trim();
const stop=new Set(['기자','뉴스','사진','제공','자료','이번','지난','이날','대한','관련','통해','위해','있는','있다','했다','밝혔다','말했다','한다고','것으로','따르면','등','및','것','수','년','월','일']);
function terms(text:string){return [...new Set((text.toLowerCase().match(/[가-힣]{2,}|[a-z]{2,}/g)||[]).map(s=>s.replace(/(에서는|에게는|으로는|에서|으로|에게|까지|부터|보다|은|는|이|가|을|를|의|에|와|과|도)$/,'')).filter(s=>s.length>=2&&!stop.has(s)))];}

export function summarizeArticle(html:string,title:string){
 const $=load(html);const body=$('#dic_area').first().length?$('#dic_area').first():$('#newsct_article, #articleBodyContents').first();
 if(!body.length)return {summaryStatus:'unavailable',summaryPoints:[],keywords:[],summaryError:'기사 본문을 확인하지 못했습니다.'};
 body.find('script,style,noscript,iframe,video,audio,figure,figcaption,table,.end_photo_org,.img_desc,.vod_area,.copyright,.reporter_area,.byline,[class*="caption"],[class*="advert"]').remove();
 body.find('br').replaceWith('\n');body.find('p,div,li').append('\n');
 const lines=body.text().slice(0,60000).split('\n').map(clean).filter(Boolean);
 const segmenter=new Intl.Segmenter('ko',{granularity:'sentence'});
 const sentences=[...new Set(lines.flatMap(line=>[...segmenter.segment(line)].map(x=>clean(x.segment))).map(s=>s.replace(/^\[[^\]]{0,80}\]\s*/,'')))].filter(s=>s.length>=20&&s.length<=220&&!/무단\s*(전재|복제)|재배포\s*금지|구독\s*(하기|해주세요)|ⓒ|저작권자|@[a-z0-9.-]+\.[a-z]{2,}/i.test(s));
 if(!sentences.length)return {summaryStatus:'unavailable',summaryPoints:[],keywords:[],summaryError:'짧게 발췌할 본문 문장이 부족합니다. 원문을 확인해 주세요.'};
 const titleTerms=terms(title),freq=new Map<string,number>();for(const sentence of sentences)for(const word of terms(sentence))freq.set(word,(freq.get(word)||0)+1);
 const ranked=sentences.map((text,index)=>{const words=terms(text);return {text,index,words,score:5/(index+1)+titleTerms.filter(t=>text.toLowerCase().includes(t)).length*2+Math.min(2,words.reduce((n,w)=>n+(freq.get(w)||0),0)/Math.max(1,words.length))+( /\d[\d,.]*\s*(%|조|억|만|원|명|건|배|포인트)/.test(text)?1.5:0)+(/전망|예상|때문|영향|원인|우려|계획|발표|결정|밝혔다/.test(text)?1:0)};}).sort((a,b)=>b.score-a.score||a.index-b.index);
 const picked:typeof ranked=[];
 for(const sentence of ranked){if(picked.length===2)break;if(picked.reduce((n,s)=>n+s.text.length,0)+sentence.text.length>360)continue;
  if(picked.some(s=>s.text.includes(sentence.text)||sentence.text.includes(s.text)||sentence.words.filter(w=>s.words.includes(w)).length/Math.max(1,Math.min(s.words.length,sentence.words.length))>.75))continue;
  picked.push(sentence);
 }
 picked.sort((a,b)=>a.index-b.index);
 const summaryPoints=picked.map(s=>s.text);
 const selectedWords=new Set(picked.flatMap(s=>s.words));
 const keywords=[...freq.keys()].filter(w=>selectedWords.has(w)&&(!/[다요]$/.test(w))).sort((a,b)=>Number(titleTerms.includes(b))-Number(titleTerms.includes(a))+(freq.get(b)!-freq.get(a)!)/100).slice(0,3);
 return {summaryStatus:'ready',summaryMethod:'extractive-v1',summaryPoints,keywords,summaryGeneratedAt:new Date().toISOString()};
}
