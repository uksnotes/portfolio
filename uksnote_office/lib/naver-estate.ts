import {targetArea} from './apartment-comparison';
import {type AptListing,koreanPrice} from './apartment-data';
// Fail closed: new provider response fields must be verified before displaying prices.
export function parseNaverListings(raw:string,complexId:string){
 const d=JSON.parse(raw);if(d.detailCode==='TOO_MANY_REQUESTS')throw Error('네이버 요청 제한 · 잠시 후 다시 조회하거나 원문 매물을 직접 추가하세요.');
 if(d.detailCode||d.error||d.success===false)throw Error('네이버 매물 응답을 확인할 수 없습니다.');
 const list=d.result?.articleList;
 if(!Array.isArray(list))throw Error('네이버 공개 매물 형식을 확인하지 못했습니다. 원문 매물을 직접 추가할 수 있습니다.');
 const items:AptListing[]=[];let unrecognized=0;
 for(const x of list){if(String(x.complexNumber)!==complexId){unrecognized++;continue;}if(x.tradeTypeCode!=='A1')continue;
 if(!targetArea(x.area2))continue;const price=koreanPrice(String(x.dealOrWarrantPrice||''));
 if(!price||!x.articleNo||!x.realtorName){unrecognized++;continue;}
 items.push({id:'naver:'+String(x.articleNo),price,area:Number(x.area2),publicArea:Number(x.area1)||null,building:String(x.buildingName||''),floor:String(x.floorInfo||'미공개'),description:String(x.articleFeatureDesc||'').slice(0,500),source:'네이버 부동산',sourceUrl:'https://fin.land.naver.com/articles/'+encodeURIComponent(x.articleNo),type:'',broker:String(x.realtorName),brokerVerified:true,updatedAt:String(x.articleConfirmYmd||'')});}
 if(unrecognized)throw Error('네이버 일부 매물의 단지·가격·중개사 정보를 확인하지 못했습니다. 원문을 확인하세요.');
 return {items,partial:d.result.hasNextPage===true,message:'네이버 공개 응답 중 전용 59·84㎡ 중개사 매매 매물'};
}
