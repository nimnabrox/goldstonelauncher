import {useEffect,useRef} from 'react';
import {createMusicRefreshLoop} from './music-resources';

export function useMusicRefresh(enabled:boolean,refresh:()=>Promise<unknown>) {
  const latest=useRef(refresh),lastCheck=useRef(Date.now());
  latest.current=refresh;
  useEffect(()=>{
    if(!enabled)return;
    const loop=createMusicRefreshLoop({refresh:()=>latest.current(),schedule:(fn,ms)=>window.setTimeout(fn,ms),
      cancel:id=>window.clearTimeout(id),now:()=>Date.now(),visible:()=>!document.hidden,lastCheck:lastCheck.current});
    const focus=()=>void loop.request(false);
    const online=()=>void loop.request(true);
    window.addEventListener('focus',focus);window.addEventListener('online',online);
    document.addEventListener('visibilitychange',focus);
    loop.start();
    return ()=>{lastCheck.current=loop.lastCheck;loop.dispose();window.removeEventListener('focus',focus);
      window.removeEventListener('online',online);document.removeEventListener('visibilitychange',focus);};
  },[enabled]);
}
