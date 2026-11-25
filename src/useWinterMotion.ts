import {useEffect, useState} from 'react';

export type WinterMotionPreference = 'on' | 'system' | 'off';
const key = 'gsl_winter_motion';

export function useWinterMotion() {
  const [preference, setPreference] = useState<WinterMotionPreference>(() => {
    try {
      const value=localStorage.getItem(key);
      return value==='system'||value==='off' ? value : 'on';
    } catch { return 'on'; }
  });
  const [systemReduced, setSystemReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>setSystemReduced(media.matches);
    media.addEventListener('change',update);
    return ()=>media.removeEventListener('change',update);
  },[]);
  const change=(value:WinterMotionPreference)=>{
    setPreference(value);
    try {localStorage.setItem(key,value);} catch {}
  };
  return {preference, setPreference:change, enabled:preference==='on'||(preference==='system'&&!systemReduced)};
}
