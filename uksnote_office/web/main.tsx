import React from 'react';
import {createRoot} from 'react-dom/client';
import Office from '../source/app/office';
import '../source/app/globals.css';
class ErrorBoundary extends React.Component<React.PropsWithChildren,{error:boolean}>{
 state={error:false};static getDerivedStateFromError(){return {error:true};}
 render(){return this.state.error?<main style={{padding:40,fontFamily:'sans-serif'}}><h1>화면을 다시 열어 주세요</h1><p>저장한 데이터는 유지됩니다.</p><button onClick={()=>location.reload()}>새로고침</button></main>:this.props.children;}
}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><Office/></ErrorBoundary>);
