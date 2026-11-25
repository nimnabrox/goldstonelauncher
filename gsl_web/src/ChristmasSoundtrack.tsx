import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import soundtrack from './config/christmas-music.json';

export function ChristmasSoundtrack({ ready = true }: { ready?: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const player = useRef<HTMLDivElement>(null);
  const volumeButton = useRef<HTMLButtonElement>(null);
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const wanted = useRef(true);
  const blocked = useRef(false);
  const attempt = useRef(0);
  const level = useRef(soundtrack.defaultVolume);
  const mutedRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(soundtrack.defaultVolume);
  const [muted, setMuted] = useState(false);
  const [message, setMessage] = useState('');
  const [controlsOpen, setControlsOpen] = useState(false);

  const start = useCallback(async () => {
    const el = audio.current;
    if (!el || !readyRef.current || !wanted.current || document.hidden) return;
    const generation = ++attempt.current;
    el.volume = level.current;
    el.muted = mutedRef.current;
    if (el.error) el.load();
    try {
      await el.play();
      if (generation !== attempt.current) return;
      blocked.current = false;
      setMessage('');
    } catch (error) {
      if (generation !== attempt.current || (error as DOMException).name === 'AbortError') return;
      blocked.current = (error as DOMException).name === 'NotAllowedError';
      setMessage(blocked.current ? 'Tap play to start Christmas music' : 'Music unavailable. Tap play to retry.');
    }
  }, []);

  useEffect(() => {
    const el = audio.current!;
    if (!ready) { el.pause(); return; }
    const gesture = (event: Event) => {
      if ((event.target as Element)?.closest?.('[data-soundtrack-controls]')) return;
      if (event instanceof KeyboardEvent && !['Enter', ' '].includes(event.key)) return;
      if (blocked.current && wanted.current) void start();
    };
    const visibility = () => {
      if (document.hidden) { ++attempt.current; el.pause(); }
      else if (wanted.current) void start();
    };
    document.addEventListener('click', gesture);
    document.addEventListener('keydown', gesture);
    document.addEventListener('visibilitychange', visibility);
    void start();
    return () => {
      ++attempt.current;
      document.removeEventListener('click', gesture);
      document.removeEventListener('keydown', gesture);
      document.removeEventListener('visibilitychange', visibility);
      el.pause();
    };
  }, [start, ready]);

  useEffect(() => {
    if (!controlsOpen) return;
    const outside = (event: PointerEvent) => { if (!player.current?.contains(event.target as Node)) setControlsOpen(false); };
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Escape') { volumeButton.current?.focus(); setControlsOpen(false); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', keyboard);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', keyboard); };
  }, [controlsOpen]);

  const toggle = () => {
    const el = audio.current!;
    if (!el.paused) { wanted.current = false; ++attempt.current; el.pause(); setMessage(''); }
    else { wanted.current = true; void start(); }
  };
  const changeVolume = (value: number) => {
    level.current = value; setVolume(value);
    if (audio.current) audio.current.volume = value;
  };
  const toggleMute = () => {
    mutedRef.current = !mutedRef.current; setMuted(mutedRef.current);
    if (audio.current) audio.current.muted = mutedRef.current;
  };

  return <div ref={player} className={`christmas-player ${playing ? 'is-playing' : ''} ${controlsOpen ? 'has-controls' : ''}`} data-soundtrack-controls onPointerEnter={event=>{if(event.pointerType==='mouse')setControlsOpen(true);}} onPointerLeave={()=>{if(!player.current?.contains(document.activeElement))setControlsOpen(false);}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setControlsOpen(false);}}>
      <button ref={volumeButton} type="button" className="christmas-player-toggle" onClick={toggle} onFocus={()=>setControlsOpen(true)} aria-label={playing ? 'Pause Christmas music' : 'Play Christmas music'} aria-pressed={playing} aria-expanded={controlsOpen} aria-controls="christmas-volume-panel" title={playing ? 'Pause Christmas music' : 'Play Christmas music'}>
        <svg className="christmas-jingle-bell" viewBox="0 0 32 36" width="29" height="32" aria-hidden="true">
          <defs><linearGradient id="jingle-gold" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff0b0"/><stop offset=".52" stopColor="#d7ad52"/><stop offset="1" stopColor="#9e7431"/></linearGradient></defs>
          <path d="M13 10V7a3 3 0 0 1 6 0v3" fill="none" stroke="#f3d486" strokeWidth="1.8"/>
          <circle cx="16" cy="22" r="10" fill="url(#jingle-gold)" stroke="#f2d88e" strokeWidth=".7"/>
          <path d="M9 17q7 5 14 0M16 21v8" fill="none" stroke="#634b28" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="16" cy="29" r="1.8" fill="#634b28"/>
          <path d="M16 9C5-1 4 12 14 11L11 16l5-4 5 4-3-5C28 12 27-1 16 9Z" fill="#a84443" stroke="#d7816b" strokeWidth=".6"/>
          <path className="jingle-ring" d="M3 17l-2-2m28 2 2-2M3 26l-2 2m28-2 2 2" fill="none" stroke="#f4db9a" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <span className={`christmas-mini-state ${playing ? 'is-playing' : ''}`} aria-hidden="true" />
      </button>
    {controlsOpen && <div className="christmas-audio-controls" id="christmas-volume-panel" role="group" aria-label="Christmas music player">
      <p className="christmas-mini-title">Christmas Remix <span>{playing ? 'Playing · click the bell to pause' : 'Click the bell to play'}</span></p>
      <div className="christmas-audio-row">
      <button type="button" className="christmas-mute" onClick={toggleMute} aria-label={muted ? 'Unmute Christmas music' : 'Mute Christmas music'} aria-pressed={muted}>
        {muted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
      </button>
      <output className="christmas-volume-value">{muted ? 'MUTED' : `${Math.round(volume * 100)}%`}</output>
      </div>
      <label className="christmas-volume"><span>Volume</span>
        <input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => changeVolume(Number(e.target.value))} aria-label="Music volume" aria-valuetext={`${Math.round(volume * 100)} percent`} style={{['--volume-level' as string]:`${volume*100}%`}} />
      </label>
    </div>}
    {message && <span className="christmas-audio-status sr-only" role="status">{message}</span>}
    <audio ref={audio} src={soundtrack.src} preload="metadata" loop
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
      onError={() => { setPlaying(false); setMessage('Music unavailable. Tap play to retry.'); }} />
  </div>;
}
