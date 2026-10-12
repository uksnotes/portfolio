/** Public PNG chart documents from Naver, not an API or synthetic series.
 * Both period paths have been checked against actual returned chart images.
 */
export function naverChartUrl(code:string,years:number){if(!/^\d{6}$/.test(code)||![1,5].includes(years))throw new Error('종목코드 또는 조회 기간을 확인하세요.');const period=years===1?'year':'year5';return `https://financial-vn.pstatic.net/chart/mobile/area/${period}/${code}_end.png`;}
