import {useEffect,useRef} from 'react';
import {attachBackgroundPlayback} from './background-playback';
import mp4 from './assets/winter/background/winter-background.mp4';
import webm from './assets/winter/background/winter-background.webm';
import poster from './assets/winter/background/winter-background-poster.jpg';

export function WinterBackground({active}:{active:boolean}) {
  const ref=useRef<HTMLVideoElement>(null);
  useEffect(()=>{
    if(!ref.current)return;
    return attachBackgroundPlayback(ref.current,active);
  },[active]);
  return <div className="ambient-bg-winter-image" style={{backgroundImage:`url(${poster})`}}>
    <video ref={ref} className="winter-background-video" muted loop playsInline preload="metadata"
      poster={poster} aria-hidden="true" tabIndex={-1}>
      <source src={mp4} type="video/mp4" />
      <source src={webm} type="video/webm" />
    </video>
  </div>;
}
