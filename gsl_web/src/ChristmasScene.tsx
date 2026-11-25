import { useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   Christmas scene pieces for the Goldstone winter website.
   Everything here is decorative (aria-hidden), click-through, and stops when
   scenery is paused, the tab is hidden, or reduced motion is requested.
   --------------------------------------------------------------------------- */

const STARS = Array.from({ length: 46 }, (_, i) => {
  // Deterministic pseudo-random spread so the sky is identical on every load.
  const r = (n: number) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return { left: r(1) * 100, top: r(2) * 46, size: 1 + r(3) * 2.2, delay: -r(4) * 6, dur: 2.6 + r(5) * 3.4 };
});

/** Moon, stars, aurora and an occasional sleigh, painted over the cabin video. */
export function ChristmasSky({ active }: { active: boolean }) {
  return (
    <div className={`xmas-sky ${active ? 'is-animated' : ''}`} aria-hidden="true">
      <div className="xmas-aurora xmas-aurora-a" />
      <div className="xmas-aurora xmas-aurora-b" />
      <div className="xmas-stars">
        {STARS.map((s, i) => (
          <span
            key={i}
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.dur}s`,
            }}
          />
        ))}
      </div>
      <div className="xmas-moon">
        <span className="xmas-moon-halo" />
        <span className="xmas-moon-disc" />
      </div>
    </div>
  );
}

type Flake = { x: number; y: number; r: number; vy: number; vx: number; phase: number; sway: number; alpha: number };

/** Large soft foreground flakes drawn on a canvas — adds depth in front of the texture snow. */
export function BokehSnow() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let w = 0, h = 0, raf = 0, last = performance.now(), wind = 0, targetWind = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const flakes: Flake[] = [];
    const make = (top: boolean): Flake => {
      const depth = Math.random();
      return {
        x: Math.random() * w,
        y: top ? -20 - Math.random() * 60 : Math.random() * h,
        r: 1.6 + depth * depth * 4.6,
        vy: 22 + depth * 48,
        vx: -6 + Math.random() * 12,
        phase: Math.random() * Math.PI * 2,
        sway: 0.6 + Math.random() * 1.2,
        alpha: 0.28 + depth * 0.5,
      };
    };
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round(Math.min(70, Math.max(22, (w * h) / 26000)));
      while (flakes.length < target) flakes.push(make(false));
      flakes.length = target;
    };
    const onMove = (e: PointerEvent) => { if (e.pointerType !== 'touch') targetWind = ((e.clientX / Math.max(w, 1)) - 0.5) * 36; };
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      wind += (targetWind - wind) * 0.02;
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.phase += dt * f.sway;
        f.y += f.vy * dt;
        f.x += (f.vx + wind + Math.sin(f.phase) * 14) * dt;
        if (f.y - f.r > h) Object.assign(f, make(true));
        if (f.x < -10) f.x = w + 10; else if (f.x > w + 10) f.x = -10;
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 2.2);
        g.addColorStop(0, `rgba(255,255,255,${f.alpha})`);
        g.addColorStop(0.45, `rgba(240,248,255,${f.alpha * 0.55})`);
        g.addColorStop(1, 'rgba(240,248,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 2.2, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);
  return <canvas ref={ref} className="xmas-bokeh" aria-hidden="true" />;
}

/** Soft snow ridge that sits on the top edge of a card or button. */
export function SnowCap({ variant = 0 }: { variant?: number }) {
  const paths = [
    'M0 10C18 2 34 14 58 7s40 6 66 0 44 9 70 3 38 5 60 0 30 6 46 2v-12H0z',
    'M0 8c22 6 38-4 62 2s36 8 60 1 46 5 72 0 34 7 58 1 32 4 48 0v-12H0z',
    'M0 6c14 7 36 4 56-1s44 8 68 3 40-6 64 1 42 6 66-2 28 5 46 1v-8H0z',
  ];
  return (
    <svg className="xmas-snowcap" viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden="true">
      <path d={paths[variant % paths.length]} fill="url(#xmasSnowFill)" transform="translate(0 4) scale(1 1.25)" />
      <path d={paths[variant % paths.length]} fill="none" stroke="#ffffff" strokeOpacity=".9" strokeWidth="1" transform="translate(0 4) scale(1 1.25)" />
    </svg>
  );
}

/** Shared SVG gradients referenced by snow caps (rendered once). */
export function ChristmasSvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="xmasSnowFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3f8ff" stopOpacity="0" />
          <stop offset=".3" stopColor="#f3f8ff" stopOpacity=".55" />
          <stop offset=".55" stopColor="#ffffff" stopOpacity=".97" />
          <stop offset="1" stopColor="#dce9f7" stopOpacity=".95" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Velvet Santa hat with fur brim; sized in em so it fits the title at every width. */
export function SantaHat() {
  const fur = [10, 18, 26, 34, 42, 50, 58, 66, 72];
  return (
    <svg className="xmas-santa-hat" viewBox="0 0 100 84" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="xmasHatVelvet" cx="38%" cy="30%" r="75%">
          <stop offset="0" stopColor="#ff6b78" />
          <stop offset=".45" stopColor="#c8152e" />
          <stop offset="1" stopColor="#5e0612" />
        </radialGradient>
        <linearGradient id="xmasHatFur" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".6" stopColor="#eef3f9" />
          <stop offset="1" stopColor="#c9d5e3" />
        </linearGradient>
        <radialGradient id="xmasHatPom" cx="35%" cy="30%" r="70%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".7" stopColor="#e9eff7" />
          <stop offset="1" stopColor="#b9c7d8" />
        </radialGradient>
      </defs>
      <path d="M12 62C14 36 32 16 56 14c16-1 28 8 32 24 1 6 0 12-2 16-4-12-10-18-18-18-4 8-4 18 0 26z" fill="url(#xmasHatVelvet)" />
      <path d="M30 56c2-14 10-28 24-34" fill="none" stroke="#ffffff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" />
      <path d="M68 36c-6 2-10 10-10 22" fill="none" stroke="#3d030b" strokeOpacity=".45" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="4" y="56" width="72" height="18" rx="9" fill="url(#xmasHatFur)" />
      {fur.map((x, i) => (
        <circle key={x} cx={x} cy={i % 2 ? 58.5 : 72} r={i % 2 ? 3.2 : 2.8} fill="#ffffff" />
      ))}
      <path d="M8 66q32 5 64 0" fill="none" stroke="#b7c5d6" strokeOpacity=".6" strokeWidth="1.2" />
      <circle cx="86" cy="58" r="10" fill="url(#xmasHatPom)" />
      <circle cx="82" cy="54" r="3" fill="#ffffff" />
    </svg>
  );
}

/** Icicles hanging under the ticker ribbon. */
export function Icicles() {
  return <div className="xmas-icicles" aria-hidden="true" />;
}

/** Layered snowy hills and pines along the bottom of the hero. */
export function SnowDrift() {
  return (
    <svg className="xmas-drift" viewBox="0 0 1440 150" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="xmasDriftBack" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b9cde2" stopOpacity=".22" />
          <stop offset="1" stopColor="#0b1018" stopOpacity=".9" />
        </linearGradient>
        <linearGradient id="xmasDriftFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9f2fc" stopOpacity=".34" />
          <stop offset=".35" stopColor="#5b6f86" stopOpacity=".38" />
          <stop offset="1" stopColor="#07090e" stopOpacity="1" />
        </linearGradient>
      </defs>
      <g fill="#0d1620" opacity=".85">
        {[90, 160, 236, 1180, 1250, 1330, 1392].map((x, i) => {
          const s = 0.7 + ((i * 37) % 5) / 10;
          return (
            <path
              key={x}
              transform={`translate(${x} ${62 - s * 18}) scale(${s})`}
              d="M0 0l-14 22h7l-12 18h8l-14 20h50l-14-20h8l-12-18h7z"
            />
          );
        })}
      </g>
      <path d="M0 78C180 50 320 92 520 70s360-34 560-6 260 20 360-8V150H0z" fill="url(#xmasDriftBack)" />
      <path d="M0 104c160-26 330 10 520-8s380-30 560 0 250 14 360-10V150H0z" fill="url(#xmasDriftFront)" />
      <path d="M0 104c160-26 330 10 520-8s380-30 560 0 250 14 360-10" fill="none" stroke="#ffffff" strokeOpacity=".42" strokeWidth="1.2" />
    </svg>
  );
}

function nextChristmas(now: Date) {
  const year = now.getMonth() === 11 && now.getDate() > 26 ? now.getFullYear() + 1 : now.getFullYear();
  return new Date(year, 11, 25, 0, 0, 0);
}

/** Live countdown to Christmas morning, in the visitor's local time. */
export function ChristmasCountdown() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const target = nextChristmas(now);
  const isDay = now.getMonth() === 11 && now.getDate() >= 25 && now.getDate() <= 26;
  const ms = Math.max(0, target.getTime() - now.getTime());
  const parts = [
    { label: 'Days', value: Math.floor(ms / 86400000) },
    { label: 'Hours', value: Math.floor(ms / 3600000) % 24 },
    { label: 'Minutes', value: Math.floor(ms / 60000) % 60 },
    { label: 'Seconds', value: Math.floor(ms / 1000) % 60 },
  ];
  return (
    <section id="countdown" className="xmas-countdown relative z-10 px-4 sm:px-6" aria-labelledby="xmas-countdown-title">
      <div className="xmas-countdown-card">
        <SnowCap variant={1} />
        <p className="xmas-countdown-kicker">Christmas in the County</p>
        <h2 id="xmas-countdown-title" className="xmas-countdown-title">
          {isDay ? 'Merry Christmas, Goldstone!' : 'Counting down to Christmas morning'}
        </h2>
        {!isDay && (
          <div className="xmas-countdown-grid" role="timer" aria-live="off">
            {parts.map((p) => (
              <div className="xmas-countdown-cell" key={p.label}>
                <span className="xmas-countdown-value">{String(p.value).padStart(2, '0')}</span>
                <span className="xmas-countdown-label">{p.label}</span>
              </div>
            ))}
          </div>
        )}
        <p className="xmas-countdown-note">Warm up by the fire, grab the winter launcher, and ride into the snow.</p>
      </div>
    </section>
  );
}

/** Holly divider used under section headings. */
export function HollyDivider() {
  return (
    <div className="xmas-holly-divider" aria-hidden="true">
      <span className="xmas-holly-line" />
      <svg viewBox="0 0 56 28" width="56" height="28">
        <path d="M27 14c-6-10-18-10-24-6 6 0 8 4 6 7 4-2 8 0 8 3 2-3 6-4 10-4z" fill="#1f7a4a" stroke="#7fe0a7" strokeWidth=".6" />
        <path d="M29 14c6-10 18-10 24-6-6 0-8 4-6 7-4-2-8 0-8 3-2-3-6-4-10-4z" fill="#26905a" stroke="#7fe0a7" strokeWidth=".6" />
        <circle cx="24" cy="17" r="3.4" fill="#d8233a" />
        <circle cx="31" cy="18" r="3.4" fill="#e8344a" />
        <circle cx="28" cy="12.5" r="3.4" fill="#c41d32" />
        <circle cx="27" cy="11.5" r="1" fill="#fff" fillOpacity=".7" />
      </svg>
      <span className="xmas-holly-line" />
    </div>
  );
}

/** Ribbon and bow that wrap the security card like a gift. */
export function GiftRibbon() {
  return (
    <div className="xmas-gift" aria-hidden="true">
      <span className="xmas-gift-band xmas-gift-band-a" />
      <span className="xmas-gift-band xmas-gift-band-b" />
      <svg className="xmas-gift-bow" viewBox="0 0 90 60">
        <defs>
          <linearGradient id="xmasBow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff6a77" />
            <stop offset=".5" stopColor="#c8162b" />
            <stop offset="1" stopColor="#7a0a17" />
          </linearGradient>
        </defs>
        <path d="M45 26C30 4 6 6 8 22c2 12 22 10 37 4z" fill="url(#xmasBow)" stroke="#ffb0b8" strokeWidth=".8" />
        <path d="M45 26C60 4 84 6 82 22c-2 12-22 10-37 4z" fill="url(#xmasBow)" stroke="#ffb0b8" strokeWidth=".8" />
        <path d="M42 28l-14 30 9-4 5 6 4-30zM48 28l14 30-9-4-5 6-4-30z" fill="#a8132a" />
        <ellipse cx="45" cy="26" rx="7" ry="6" fill="#e02a3e" stroke="#ffd0d4" strokeWidth=".8" />
        <path d="M20 16q8-4 16 4M70 16q-8-4-16 4" fill="none" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

/** Thin candy-cane bar that tracks scroll progress. */
export function CandyScrollBar() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      ref.current?.style.setProperty('--progress', String(p));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return <div ref={ref} className="xmas-scrollbar" aria-hidden="true" />;
}
