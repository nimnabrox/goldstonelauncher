type PlaybackEnvironment={
  document:Pick<Document,'hidden'|'addEventListener'|'removeEventListener'>;
  window:Pick<Window,'addEventListener'|'removeEventListener'>;
};
const owners=new WeakMap<HTMLVideoElement,{active:boolean}>();

/** Event-driven playback: no frame loop, interval or stalled-play retry timer. */
export function attachBackgroundPlayback(video:HTMLVideoElement,active:boolean,environment:PlaybackEnvironment={document,window}) {
  const owner={active};owners.set(video,owner);
  video.muted=true;video.loop=true;
  let pending=false;
  const allowed=()=>owner.active&&owners.get(video)===owner&&!environment.document.hidden;
  const pause=()=>video.pause();
  const sync=()=>{
    if(!allowed()){pause();return;}
    if(pending||!video.paused)return;
    pending=true;
    try {
      void Promise.resolve(video.play()).then(()=>{
        if(!owners.get(video)?.active||environment.document.hidden)pause();
      }).catch(()=>{/* canplay/focus/restore can retry; the poster remains visible */}).finally(()=>{pending=false;});
    } catch {pending=false;}
  };
  const ended=()=>{if(allowed()){video.currentTime=0;sync();}};
  const cleanup=()=>{
    environment.document.removeEventListener('visibilitychange',sync);
    environment.window.removeEventListener('focus',sync);
    video.removeEventListener('canplay',sync);
    video.removeEventListener('ended',ended);
    if(owners.get(video)===owner){owner.active=false;pause();}
  };
  if(active){
    environment.document.addEventListener('visibilitychange',sync);
    environment.window.addEventListener('focus',sync);
    video.addEventListener('canplay',sync);
    video.addEventListener('ended',ended);
    sync();
  } else pause();
  return cleanup;
}
