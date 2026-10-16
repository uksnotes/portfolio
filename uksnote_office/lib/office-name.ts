// 로그인한 사용자에 맞춘 오피스 이름. 가입 이름을 쓰고, 이름이 없으면 이메일 @ 앞부분을 쓴다.
export function ownerName(me?:{username?:string;email?:string}|null){const name=(me?.username||'').trim();return (name&&!name.includes('@')?name:(me?.email||name).split('@')[0]).trim()||'My';}
export const officeName=(me?:{username?:string;email?:string}|null)=>ownerName(me)+"'s Office";
/** 레일 로고용 짧은 표시: 영문·숫자는 3글자, 한글 등은 2글자까지. */
export function officeInitials(me?:{username?:string;email?:string}|null){const chars=Array.from(ownerName(me).replace(/\s+/g,''));return chars.slice(0,chars.slice(0,3).every(c=>/[\x20-\x7e]/.test(c))?3:2).join('');}
