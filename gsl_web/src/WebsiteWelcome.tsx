import { useEffect, useState } from 'react';
import { Snowflake } from 'lucide-react';

export function WebsiteWelcome({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    let disposed = false;
    let fade: ReturnType<typeof setTimeout>;
    let minimum: ReturnType<typeof setTimeout>;
    let maximum: ReturnType<typeof setTimeout>;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const ready = Promise.allSettled(['/goldstone-logo.png', '/winter/cabin-poster.jpg'].map(src => {
      const image = new Image(); image.src = src;
      return image.decode();
    }));
    const delay = new Promise<void>(resolve => { minimum = setTimeout(resolve, 900); });
    const limit = new Promise<void>(resolve => { maximum = setTimeout(resolve, 2200); });
    void Promise.all([delay, Promise.race([ready, limit])]).then(() => {
      if (disposed) return;
      setLeaving(true);
      fade = setTimeout(onDone, 180);
    });
    return () => {
      disposed = true;
      clearTimeout(minimum); clearTimeout(maximum); clearTimeout(fade);
      document.body.style.overflow = previousOverflow;
    };
  }, [onDone]);

  return <div className={`christmas-welcome ${leaving ? 'is-leaving' : ''}`} role="status" aria-live="polite" aria-label="Christmas welcome">
    <div className="welcome-snow-dust" aria-hidden="true">{[0,1,2,3,4,5].map(i => <span key={i} style={{left:`${12+i*15}%`,animationDelay:`${-i*.7}s`}} />)}</div>
    <div className="website-welcome-content">
      <div className="website-welcome-logo">
        <svg className="xmas-welcome-wreath" viewBox="0 0 126 126" aria-hidden="true">
          {Array.from({ length: 22 }, (_, i) => {
            const a = (i / 22) * Math.PI * 2;
            const x = 63 + Math.cos(a) * 52, y = 63 + Math.sin(a) * 52;
            return <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(a * 180 / Math.PI + 90).toFixed(0)})`}>
              <path d="M0 0c-6-4-8-10-4-14 2 4 6 6 4 14zM0 0c6-4 8-10 4-14-2 4-6 6-4 14z" fill={i % 2 ? '#1f7a4a' : '#2c9460'} />
              {i % 3 === 0 && <circle cx="0" cy="-3" r="2.6" fill={i % 6 === 0 ? '#e8344a' : '#f0c264'} />}
            </g>;
          })}
          <path d="M50 112l13-8 13 8-6 9-7-5-7 5z" fill="#d8233a" />
        </svg>
        <img src="/goldstone-logo.png" alt="Goldstone County" /><span aria-hidden="true" />
      </div>
      <p className="website-welcome-season"><Snowflake size={13} aria-hidden="true" /> Merry Christmas</p>
      <h1>Welcome to<br /><strong>Goldstone County</strong></h1>
      <p className="website-welcome-caption">A little winter. A new chapter.</p>
      <div className="website-welcome-progress" role="progressbar" aria-label="Loading Goldstone website"><span /></div>
    </div>
  </div>;
}
