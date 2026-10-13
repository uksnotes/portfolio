export const NEWS_CATEGORIES=[
 {id:'economy',name:'경제',url:'https://news.naver.com/section/101'},
 {id:'society',name:'사회',url:'https://news.naver.com/section/102'},
 {id:'it',name:'IT',url:'https://news.naver.com/section/105'},
 {id:'world',name:'세계',url:'https://news.naver.com/section/104'},
 {id:'ranking',name:'랭킹',url:'https://news.naver.com/main/ranking/popularDay.naver'}
] as const;
export type NewsCategory=typeof NEWS_CATEGORIES[number]['id'];
export function newsCategory(id:string){return NEWS_CATEGORIES.find(c=>c.id===id);}
