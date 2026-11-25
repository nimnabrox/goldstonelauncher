import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import soundtrack from './config/christmas-music.json';

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

const RING = 2 * Math.PI * 20;

export function ChristmasSoundtrack({ ready = true }: { ready?: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const player = useRef<HTMLDivElement>(null);
  const toggleButton = useRef<HTMLButtonElement>(null);
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
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

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
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Escape') { toggleButton.current?.focus(); setControlsOpen(false); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', keyboard);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', keyboard); };
  }, [controlsOpen]);

  const toggle = () => {
    const el = audio.current!;
    if (!el.paused) { wanted.current = false; ++attempt.current; el.pause(); setMessage(''); }
    else { wanted.current = true; void start(); }
  };
  const restart = () => {
    const el = audio.current!;
    el.currentTime = 0; setCurrent(0);
    if (el.paused) { wanted.current = true; void start(); }
  };
  const seek = (value: number) => {
    const el = audio.current;
    if (!el || !Number.isFinite(el.duration)) return;
    el.currentTime = value; setCurrent(value);
  };
  const changeVolume = (value: number) => {
    level.current = value; setVolume(value);
    if (audio.current) audio.current.volume = value;
  };
  const toggleMute = () => {
    mutedRef.current = !mutedRef.current; setMuted(mutedRef.current);
    if (audio.current) audio.current.muted = mutedRef.current;
  };

  const progress = duration > 0 ? Math.min(1, current / duration) : 0;
  const silent = muted || volume === 0;

  return <div
    ref={player}
    className={`christmas-player ${playing ? 'is-playing' : ''} ${controlsOpen ? 'has-controls' : ''}`}
    data-soundtrack-controls
    onPointerEnter={event => { if (event.pointerType === 'mouse') setControlsOpen(true); }}
    onPointerLeave={() => { if (!player.current?.contains(document.activeElement)) setControlsOpen(false); }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setControlsOpen(false); }}
  >
    <button
      ref={toggleButton}
      type="button"
      className="christmas-player-toggle"
      onClick={toggle}
      onFocus={() => setControlsOpen(true)}
      aria-label={playing ? 'Pause Christmas music' : 'Play Christmas music'}
      aria-pressed={playing}
      aria-expanded={controlsOpen}
      aria-controls="christmas-volume-panel"
      title={playing ? 'Pause Christmas music' : 'Play Christmas music'}
    >
      <svg className="christmas-ring" viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r="20" className="christmas-ring-track" />
        <circle cx="22" cy="22" r="20" className="christmas-ring-fill" strokeDasharray={RING} strokeDashoffset={RING * (1 - progress)} />
      </svg>
      <svg className="christmas-disc" viewBox="0 0 40 40" aria-hidden="true">
        <defs>
          <radialGradient id="discVinyl" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#1d2430" />
            <stop offset="1" stopColor="#07090d" />
          </radialGradient>
          <linearGradient id="discLabel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff1c2" />
            <stop offset=".5" stopColor="#e2b453" />
            <stop offset="1" stopColor="#9e6d22" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="17" fill="url(#discVinyl)" />
        {[14.5, 12.5, 10.5].map(r => <circle key={r} cx="20" cy="20" r={r} fill="none" stroke="#ffffff" strokeOpacity=".07" strokeWidth=".6" />)}
        <path d="M8 13a14 14 0 0 1 9-7" stroke="#ffffff" strokeOpacity=".22" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <circle cx="20" cy="20" r="7.5" fill="url(#discLabel)" />
        <circle cx="25" cy="17" r="1.1" fill="#7a1220" />
      </svg>
      <span className="christmas-toggle-icon" aria-hidden="true">
        {playing ? <Pause size={11} fill="currentColor" strokeWidth={0} /> : <Play size={11} fill="currentColor" strokeWidth={0} />}
      </span>
    </button>

    {controlsOpen && <div className="christmas-audio-controls" id="christmas-volume-panel" role="group" aria-label="Christmas music player">
      <div className="christmas-now">
        <div className="christmas-cover">
          <img src="/winter/cabin-poster.jpg" alt="" />
          <span className="christmas-eq" aria-hidden="true"><i /><i /><i /><i /></span>
        </div>
        <div className="christmas-meta">
          <p className="christmas-kicker">{playing ? 'Now playing' : 'Paused'}</p>
          <p className="christmas-title">Christmas Remix</p>
          <p className="christmas-artist">Goldstone County · Winter Soundtrack</p>
        </div>
      </div>

      <div className="christmas-seek">
        <input
          type="range" min="0" max={duration || 0} step="0.1" value={Math.min(current, duration || 0)}
          onChange={e => seek(Number(e.target.value))}
          aria-label="Seek track" aria-valuetext={`${formatTime(current)} of ${formatTime(duration)}`}
          disabled={!duration}
          style={{ ['--fill' as string]: `${progress * 100}%` }}
        />
        <div className="christmas-times"><span>{formatTime(current)}</span><span>{formatTime(duration)}</span></div>
      </div>

      <div className="christmas-transport">
        <button type="button" className="christmas-icon-btn" onClick={restart} aria-label="Restart track" title="Restart">
          <RotateCcw size={15} />
        </button>
        <button type="button" className="christmas-main-btn" onClick={toggle} aria-label={playing ? 'Pause track' : 'Play track'}>
          {playing ? <Pause size={18} fill="currentColor" strokeWidth={0} /> : <Play size={18} fill="currentColor" strokeWidth={0} style={{ marginLeft: 2 }} />}
        </button>
        <button type="button" className="christmas-icon-btn christmas-mute" onClick={toggleMute} aria-label={muted ? 'Unmute Christmas music' : 'Mute Christmas music'} aria-pressed={muted}>
          {silent ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      </div>

      <label className="christmas-volume">
        <span className="sr-only">Volume</span>
        <VolumeX size={12} aria-hidden="true" />
        <input
          type="range" min="0" max="1" step="0.01" value={volume}
          onChange={e => changeVolume(Number(e.target.value))}
          aria-label="Music volume" aria-valuetext={`${Math.round(volume * 100)} percent`}
          style={{ ['--fill' as string]: `${volume * 100}%` }}
        />
        <output className="christmas-volume-value">{muted ? 'MUTED' : `${Math.round(volume * 100)}%`}</output>
      </label>
    </div>}
    {message && <span className="christmas-audio-status sr-only" role="status">{message}</span>}
    <audio
      ref={audio} src={soundtrack.src} preload="metadata" loop
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
      onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
      onDurationChange={e => setDuration(e.currentTarget.duration)}
      onTimeUpdate={e => setCurrent(e.currentTarget.currentTime)}
      onError={() => { setPlaying(false); setMessage('Music unavailable. Tap play to retry.'); }}
    />
  </div>;
}
