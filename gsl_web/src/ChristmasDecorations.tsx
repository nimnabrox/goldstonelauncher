import { useEffect, useRef } from 'react';
import snow from './assets/website-snow.svg';
import { BokehSnow } from './ChristmasScene';

const TRAIL_TONES = ['gold', 'red', 'green', 'ice'] as const;

const SWAG_TUFTS = [
  { x: 10, y: 6, scale: 1.05, rot: -6 },
  { x: 34, y: 10, scale: 0.98, rot: 4 },
  { x: 60, y: 14, scale: 0.92, rot: 8 },
  { x: 88, y: 18, scale: 0.85, rot: 11 },
  { x: 118, y: 20, scale: 0.78, rot: 10 },
  { x: 150, y: 22, scale: 0.72, rot: 7 },
  { x: 184, y: 22, scale: 0.65, rot: 3 },
  { x: 220, y: 21, scale: 0.58, rot: -1 },
  { x: 256, y: 19, scale: 0.52, rot: -5 },
];

export function ChristmasDecorations({ snowActive }: { snowActive: boolean }) {
  const sparkLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = sparkLayerRef.current;
    const root = document.querySelector('.winter-website');
    if (!layer || !root || typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    root.setAttribute('data-cursor-frame', '0');

    const timers = new Set<number>();
    let lastTrailAt = 0;
    let colorIndex = 0;
    let frame = 0;

    // Keep the app-matched tree cursor twinkling continuously all the time (no idle stop).
    const frameInterval = window.setInterval(() => {
      if (document.hidden) return;
      frame = (frame + 1) % 3;
      root.setAttribute('data-cursor-frame', String(frame));
    }, 550);

    const spawnNode = (node: HTMLSpanElement, ttlMs: number, maxNodes: number, selector: string) => {
      const existing = layer.querySelectorAll(selector);
      if (existing.length >= maxNodes) existing[0]?.remove();
      layer.appendChild(node);
      const timer = window.setTimeout(() => {
        node.remove();
        timers.delete(timer);
      }, ttlMs);
      timers.add(timer);
    };

    const clearTransient = () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      layer.replaceChildren();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const now = performance.now();
      if (now - lastTrailAt < 80) return;
      lastTrailAt = now;

      const glint = document.createElement('span');
      const tone = TRAIL_TONES[colorIndex++ % TRAIL_TONES.length];
      glint.className = `christmas-cursor-glint christmas-cursor-glint-${tone} is-star`;
      glint.style.left = `${event.clientX + 8}px`;
      glint.style.top = `${event.clientY + 18}px`;
      glint.style.setProperty('--glint-dx', `${((colorIndex % 5) - 2) * 3}px`);
      spawnNode(glint, 360, 4, '.christmas-cursor-glint');
    };

    const onPointerDown = (event: PointerEvent) => {
      const target =
        event.target instanceof Element ? event.target.closest('a, button, summary, [role="button"]') : null;
      if (!target || target.matches(':disabled, [aria-disabled="true"]')) return;
      const x = event.clientX || target.getBoundingClientRect().left + target.getBoundingClientRect().width / 2;
      const y = event.clientY || target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2;
      const burst = document.createElement('span');
      burst.className = 'christmas-touch-spark';
      burst.style.left = `${x}px`;
      burst.style.top = `${y}px`;
      spawnNode(burst, 420, 2, '.christmas-touch-spark');
    };

    document.addEventListener('pointermove', onPointerMove, { capture: true, passive: true });
    document.addEventListener('pointerleave', clearTransient, { passive: true });
    document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
    window.addEventListener('blur', clearTransient);

    return () => {
      window.clearInterval(frameInterval);
      root.removeAttribute('data-cursor-frame');
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerleave', clearTransient);
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('blur', clearTransient);
      clearTransient();
    };
  }, []);

  return (
    <>
      <div className={`winter-celebration ${snowActive ? 'is-animated' : ''}`} aria-hidden="true">
        <svg className="winter-light-cord" viewBox="0 0 800 52" preserveAspectRatio="none">
          <defs>
            <linearGradient id="webCordGoldRed" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#26633e" stopOpacity="0.95" />
              <stop offset="0.24" stopColor="#b88c42" stopOpacity="0.88" />
              <stop offset="0.5" stopColor="#e9c472" stopOpacity="0.72" />
              <stop offset="0.76" stopColor="#b88c42" stopOpacity="0.88" />
              <stop offset="1" stopColor="#26633e" stopOpacity="0.95" />
            </linearGradient>
          </defs>
          <path d="M-8 6Q200 44 400 16Q600 44 808 6" fill="none" stroke="url(#webCordGoldRed)" strokeWidth="2.1" />
          <path d="M-8 8Q200 46 400 18Q600 46 808 8" fill="none" stroke="#ffe29a" strokeOpacity="0.38" strokeWidth="0.9" />
          {[0, 1].map((side) => (
            <g key={side} transform={side === 1 ? 'translate(800 0) scale(-1 1)' : undefined}>
              <path d="M-4 5 Q135 24 275 17" fill="none" stroke="#15472d" strokeWidth="4" strokeLinecap="round" />
              <path d="M-4 5 Q135 24 275 17" fill="none" stroke="#2c7a50" strokeWidth="1.8" strokeLinecap="round" />
              {SWAG_TUFTS.map((t, idx) => (
                <g key={t.x} transform={`translate(${t.x} ${t.y}) scale(${t.scale}) rotate(${t.rot})`}>
                  <path
                    d="M0 0 l-8 -9 M0 0 l-3 -11 M0 0 l4 -11 M0 0 l10 -7 M0 0 l11 -2 M0 0 l8 6 M0 0 l2 9 M0 0 l-7 5"
                    fill="none"
                    stroke={idx % 2 === 0 ? '#185938' : '#25704a'}
                    strokeWidth="2.1"
                    strokeLinecap="round"
                  />
                  <path
                    d="M0 0 l-5 -7 M0 0 l5 -8 M0 0 l9 -4 M0 0 l5 5"
                    fill="none"
                    stroke={idx % 2 === 0 ? '#4ca372' : '#3a8b5f'}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  {idx % 2 === 0 && (
                    <path
                      d="M0 0 l2 -8 M0 0 l9 -3"
                      fill="none"
                      stroke="#ebf8f2"
                      strokeOpacity="0.58"
                      strokeWidth="0.85"
                      strokeLinecap="round"
                    />
                  )}
                </g>
              ))}
            </g>
          ))}
        </svg>
        {[
          { left: 8, top: 14, tone: 'red', delay: 0 },
          { left: 18, top: 20, tone: 'gold', delay: -0.7 },
          { left: 28, top: 23, tone: 'green', delay: -1.4 },
          { left: 39, top: 20, tone: 'warm', delay: -2.1 },
          { left: 50, top: 15, tone: 'red', delay: -2.8 },
          { left: 61, top: 20, tone: 'gold', delay: -0.4 },
          { left: 72, top: 23, tone: 'green', delay: -1.1 },
          { left: 82, top: 20, tone: 'warm', delay: -1.8 },
          { left: 90, top: 14, tone: 'red', delay: -2.5 },
        ].map((bulb) => (
          <span
            className={`winter-fairy-light winter-fairy-light-${bulb.tone}`}
            key={bulb.left}
            style={{ left: `${bulb.left}%`, top: `${bulb.top}px`, animationDelay: `${bulb.delay}s` }}
          />
        ))}
        {[0, 1].map((i) => (
          <svg key={i} className={`winter-pine winter-pine-${i}`} viewBox="0 0 96 46">
            <path d="M16 12 c-9 -6 -13 3 -3 6 z" fill="#b81728" stroke="#ff7a84" strokeWidth="0.6" />
            <path d="M16 12 c9 -6 13 3 3 6 z" fill="#de2235" stroke="#ff9aa2" strokeWidth="0.6" />
            <path d="M14 14 l-4 9 l3 -1.5 l2 1.5 z" fill="#9c1220" />
            <path d="M18 14 l5 9 l-3 -1.5 l-2 1.5 z" fill="#c4192a" />
            <circle cx="16" cy="13" r="2.6" fill="#ee3142" stroke="#ffe0b5" strokeWidth="0.65" />
            <circle cx="34" cy="15" r="2.3" fill="#e02438" />
            <circle cx="48" cy="19" r="2" fill="#e02438" />
          </svg>
        ))}
        {[32, 68].map((left, i) => (
          <svg
            className="winter-hanging-ornament"
            key={left}
            style={{ left: `${left}%`, animationDelay: `${-i * 1.4}s` }}
            viewBox="0 0 26 40"
          >
            <defs>
              <radialGradient id={`webBauble_${i}`} cx="35%" cy="30%" r="68%">
                <stop offset="0%" stopColor="#ff6b7a" />
                <stop offset="55%" stopColor="#c9182b" />
                <stop offset="100%" stopColor="#6e0914" />
              </radialGradient>
              <linearGradient id={`webStar_${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fff4bd" />
                <stop offset="50%" stopColor="#f5c249" />
                <stop offset="100%" stopColor="#b07314" />
              </linearGradient>
            </defs>
            <path d="M13 0v14" stroke="#e5c16c" strokeWidth="1" />
            {i === 0 ? (
              <path
                d="m13 14 3.2 6.3 7 1-5 5 1.2 7-6.4-3.4-6.4 3.4 1.2-7-5-5 7-1Z"
                fill={`url(#webStar_${i})`}
                stroke="#fff4c4"
                strokeWidth=".7"
              />
            ) : (
              <>
                <rect x="10" y="14" width="6" height="3.5" rx="1" fill="#f0c264" />
                <circle cx="13" cy="27" r="9.5" fill={`url(#webBauble_${i})`} stroke="#ff9aa4" strokeWidth=".65" />
                <path d="M5.5 25q7.5-4.5 15 0m-15 4.5q7.5-4.5 15 0" fill="none" stroke="#ffd87d" strokeWidth=".85" strokeOpacity=".8" />
                <circle cx="10" cy="23.5" r="2" fill="#ffffff" fillOpacity=".35" />
              </>
            )}
          </svg>
        ))}
      </div>
      {snowActive && (
        <div className="christmas-snow" aria-hidden="true">
          <div className="christmas-snow-sheet christmas-snow-far" style={{ backgroundImage: `url("${snow}")` }} />
          <div className="christmas-snow-sheet christmas-snow-near" style={{ backgroundImage: `url("${snow}")` }} />
          <BokehSnow />
        </div>
      )}
      <div ref={sparkLayerRef} className="christmas-touch-layer" aria-hidden="true" />
    </>
  );
}
