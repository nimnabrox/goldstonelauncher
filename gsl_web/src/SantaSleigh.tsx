import { useEffect, useRef } from 'react';

/* ---------------------------------------------------------------------------
   Santa's sleigh, drawn frame-by-frame on a canvas so it really flies:
   reindeer gallop with jointed legs, the team bobs on an arc, reins sway,
   Rudolph's nose pulses, and a trail of gold stardust falls behind.
   Runs only while scenery is active; nothing is drawn between flights.
   --------------------------------------------------------------------------- */

type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; warm: boolean; tw: number };

const FLIGHT_MS = 15000;
const SILHOUETTE = '#070b12';
const RIM = 'rgba(255, 226, 160, 0.55)';

// Reindeer positions along the team, lead deer last (furthest forward).
const TEAM = [
  { x: 52, y: -6, phase: 0.0 },
  { x: 80, y: -10, phase: 1.3 },
  { x: 108, y: -14, phase: 2.5 },
  { x: 138, y: -19, phase: 3.8, lead: true },
];

function leg(ctx: CanvasRenderingContext2D, hx: number, hy: number, upper: number, lower: number) {
  const kx = hx + Math.sin(upper) * 6;
  const ky = hy + Math.cos(upper) * 6;
  const fx = kx + Math.sin(lower) * 6.2;
  const fy = ky + Math.cos(lower) * 6.2;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(kx, ky);
  ctx.lineTo(fx, fy);
  ctx.stroke();
}

function reindeer(ctx: CanvasRenderingContext2D, g: number, lead: boolean, time: number) {
  // Legs (behind body). Flying gallop: front legs reach forward, hind legs kick back.
  ctx.lineWidth = 1.9;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const f1 = 0.95 + Math.sin(g) * 0.55;
  const f2 = 0.95 + Math.sin(g + 0.5) * 0.55;
  const b1 = -0.95 + Math.sin(g + Math.PI) * 0.55;
  const b2 = -0.95 + Math.sin(g + Math.PI + 0.5) * 0.55;
  leg(ctx, 8, 2.5, f1, f1 - 1.25);
  leg(ctx, 6.5, 3, f2, f2 - 1.25);
  leg(ctx, -8, 2.5, b1, b1 + 1.1);
  leg(ctx, -6.5, 3, b2, b2 + 1.1);

  // Body + chest + rump.
  ctx.beginPath();
  ctx.ellipse(0, 0, 11.5, 5.2, -0.05, 0, Math.PI * 2);
  ctx.fill();
  // Neck rising to the head.
  const nod = Math.sin(g) * 0.8;
  ctx.beginPath();
  ctx.moveTo(6, -3);
  ctx.quadraticCurveTo(10, -8, 13, -11 + nod);
  ctx.lineTo(16.5, -9.5 + nod);
  ctx.quadraticCurveTo(13, -4, 11, 1.5);
  ctx.closePath();
  ctx.fill();
  // Head and muzzle.
  ctx.beginPath();
  ctx.ellipse(16, -11.5 + nod, 4.3, 2.6, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(19.6, -9.6 + nod, 2.4, 1.6, 0.4, 0, Math.PI * 2);
  ctx.fill();
  // Ear + tail.
  ctx.beginPath();
  ctx.moveTo(13.6, -13.5 + nod); ctx.lineTo(11.2, -15.2 + nod); ctx.lineTo(13.2, -12 + nod); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-11, -2.5); ctx.lineTo(-14.5, -4.5 + Math.sin(g * 2) * 0.8); ctx.lineTo(-11.5, 0); ctx.fill();
  // Antlers.
  ctx.lineWidth = 1.05;
  ctx.beginPath();
  ctx.moveTo(14.5, -13.6 + nod); ctx.quadraticCurveTo(12.5, -19, 9.5, -21.5 + nod);
  ctx.moveTo(13.2, -17.4 + nod); ctx.lineTo(10, -17.6 + nod);
  ctx.moveTo(12, -19.8 + nod); ctx.lineTo(13.6, -22.6 + nod);
  ctx.moveTo(15.8, -13.4 + nod); ctx.quadraticCurveTo(15.8, -18.5, 14.4, -21 + nod);
  ctx.moveTo(15.6, -17 + nod); ctx.lineTo(18, -18.8 + nod);
  ctx.stroke();
  // Harness band.
  ctx.save();
  ctx.strokeStyle = 'rgba(214, 46, 64, 0.9)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(4, -4.5); ctx.lineTo(5.5, 4.5);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 220, 140, 0.95)';
  ctx.beginPath(); ctx.arc(5, 0.5, 0.9, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  if (lead) {
    const pulse = 0.65 + Math.sin(time / 180) * 0.35;
    ctx.save();
    ctx.shadowColor = 'rgba(255, 60, 70, 1)';
    ctx.shadowBlur = 10 * pulse;
    ctx.fillStyle = `rgba(255, ${70 + pulse * 40}, ${80 + pulse * 30}, 1)`;
    ctx.beginPath(); ctx.arc(21.8, -9.2 + nod, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function sleighAndSanta(ctx: CanvasRenderingContext2D, time: number) {
  // Runner with front curl.
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-34, 9);
  ctx.lineTo(18, 9);
  ctx.quadraticCurveTo(28, 9, 28, 2);
  ctx.quadraticCurveTo(28, -3, 23, -2);
  ctx.stroke();
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-24, 0); ctx.lineTo(-26, 9);
  ctx.moveTo(8, 0); ctx.lineTo(10, 9);
  ctx.stroke();
  // Sleigh body with scrolled back.
  ctx.beginPath();
  ctx.moveTo(-31, 1);
  ctx.quadraticCurveTo(-36, -14, -30, -24);
  ctx.quadraticCurveTo(-25, -28, -23, -22);
  ctx.quadraticCurveTo(-24, -16, -18, -12);
  ctx.lineTo(10, -12);
  ctx.quadraticCurveTo(20, -13, 21, -5);
  ctx.quadraticCurveTo(20, 1, 12, 1);
  ctx.closePath();
  ctx.fill();
  // Gold trim line along the side.
  ctx.save();
  ctx.strokeStyle = 'rgba(240, 194, 100, 0.75)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-28, -4); ctx.quadraticCurveTo(-6, -2, 17, -5);
  ctx.stroke();
  ctx.restore();
  // Gift sack behind Santa.
  ctx.beginPath();
  ctx.ellipse(-22, -17, 7.5, 7, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-24, -23); ctx.lineTo(-27, -28); ctx.lineTo(-21, -26); ctx.closePath(); ctx.fill();
  // Santa: body, head, beard line, hat with bobbing pom.
  const sway = Math.sin(time / 420) * 0.8;
  ctx.beginPath();
  ctx.ellipse(-8, -18, 8, 8.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-5 + sway * 0.3, -29, 4.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-9 + sway * 0.3, -31.5);
  ctx.quadraticCurveTo(-6, -38, -1 + sway * 0.3, -31.5);
  ctx.quadraticCurveTo(-10, -37 + sway, -15 + sway, -36 + sway);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-15.5 + sway, -35.6 + sway, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // Arm holding the reins.
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-4, -21); ctx.quadraticCurveTo(2, -19, 7, -17);
  ctx.stroke();
}

export function SantaSleigh({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !active) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, raf = 0, timer = 0, start = 0, lastEmit = 0;
    const sparks: Spark[] = [];

    const resize = () => {
      const host = canvas.parentElement?.getBoundingClientRect();
      w = Math.round(host?.width || window.innerWidth); h = Math.round(host?.height || window.innerHeight);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    };

    const path = (p: number, now: number) => {
      // Fly through the open sky band between the ticker and the title.
      const x = -260 + p * (w + 460);
      const y = 225 + 40 * (1 - p) - Math.sin(p * Math.PI) * 25 + Math.sin(now / 520) * 4;
      return { x, y };
    };

    const frame = (now: number) => {
      const p = (now - start) / FLIGHT_MS;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const scale = Math.min(1.6, Math.max(0.8, w / 1050));

      if (p < 1) {
        const a = path(p, now);
        const b = path(Math.min(1, p + 0.002), now + 16);
        const angle = Math.atan2(b.y - a.y, b.x - a.x) * 0.8;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const toWorld = (lx: number, ly: number) => ({ x: a.x + (lx * cos - ly * sin) * scale, y: a.y + (lx * sin + ly * cos) * scale });

        // Fade in/out at the screen edges for a soft entrance.
        const edge = Math.min(1, p * 8, (1 - p) * 8);

        ctx.save();
        ctx.globalAlpha = 0.95 * edge;
        ctx.translate(a.x, a.y);
        ctx.rotate(angle);
        ctx.scale(scale, scale);
        ctx.fillStyle = SILHOUETTE;
        ctx.strokeStyle = SILHOUETTE;
        ctx.shadowColor = RIM;
        ctx.shadowBlur = 6;

        // Reins from Santa's hands to each harness, swaying with the gallop.
        ctx.save();
        ctx.lineWidth = 0.7;
        ctx.strokeStyle = 'rgba(230, 200, 140, 0.7)';
        ctx.shadowBlur = 0;
        for (const deer of TEAM) {
          const bob = Math.sin(now / 160 + deer.phase) * 1.6;
          ctx.beginPath();
          ctx.moveTo(7, -17);
          ctx.quadraticCurveTo((7 + deer.x) / 2, (deer.y + bob - 17) / 2 + 5, deer.x + 4, deer.y + bob - 2);
          ctx.stroke();
        }
        ctx.restore();

        sleighAndSanta(ctx, now);
        for (const deer of TEAM) {
          const g = now / 115 + deer.phase;
          const bob = Math.sin(now / 160 + deer.phase) * 1.6;
          ctx.save();
          ctx.translate(deer.x, deer.y + bob);
          reindeer(ctx, g, !!deer.lead, now);
          ctx.restore();
        }
        ctx.restore();

        // Emit stardust from the runners and the team's hooves.
        if (now - lastEmit > 16) {
          lastEmit = now;
          const sources = [toWorld(-32, 9), toWorld(-10, 9), toWorld(52, 8), toWorld(108, 0)];
          for (let i = 0; i < 4; i++) {
            const s = sources[i % sources.length];
            const max = 1.1 + Math.random() * 1.4;
            sparks.push({
              x: s.x + (Math.random() - 0.5) * 6, y: s.y + (Math.random() - 0.5) * 4,
              vx: -18 + Math.random() * 22, vy: 8 + Math.random() * 26,
              life: max, max, size: 0.5 + Math.random() * 1.8, warm: Math.random() < 0.7, tw: Math.random() * 6,
            });
          }
          if (sparks.length > 420) sparks.splice(0, sparks.length - 420);
        }
      }

      // Stardust trail.
      ctx.globalCompositeOperation = 'lighter';
      const dt = 1 / 60;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 6 * dt; s.vx *= 0.99;
        const k = s.life / s.max;
        const twinkle = 0.6 + Math.sin(now / 90 + s.tw) * 0.4;
        const alpha = k * twinkle;
        const r = s.size * (0.6 + k * 0.8) * scale;
        ctx.fillStyle = s.warm ? `rgba(255, 214, 130, ${alpha})` : `rgba(235, 245, 255, ${alpha})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
        if (s.size > 1.7 && k > 0.5) {
          ctx.fillStyle = `rgba(255, 240, 200, ${alpha * 0.12})`;
          ctx.beginPath(); ctx.arc(s.x, s.y, r * 2.2, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';

      if (p < 1 || sparks.length) raf = requestAnimationFrame(frame);
      else { ctx.clearRect(0, 0, w, h); timer = window.setTimeout(launch, 20000 + Math.random() * 12000); }
    };

    const launch = () => { start = performance.now(); raf = requestAnimationFrame(frame); };

    resize();
    window.addEventListener('resize', resize);
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    timer = window.setTimeout(launch, 2500);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      observer.disconnect();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [active]);

  return <canvas ref={ref} className="xmas-sleigh-canvas" aria-hidden="true" />;
}
