
'use client';
import {Button} from '@/components/ui/button';
import {openAPISettings} from './api-key-settings';
export default function TravelAPIKey({configured}:{configured:boolean;onSaved:()=>Promise<void>}){return <div className="estate-dong-detail"><Button type="button" variant="outline" onClick={openAPISettings}>공통 API 키 설정 · {configured?'저장됨':'키 추가'}</Button></div>;}
