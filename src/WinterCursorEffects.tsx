import { useEffect, useRef } from 'react';

const LIGHT_COLORS = ['gold', 'red', 'green', 'ice'] as const;

// Drives 3-frame cursor tree light twinkle + fast-fading crystal glints; stops cleanly while gaming or idle.
export function WinterCursorEffects({ active }: { active: boolean }) {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const shell = layer?.parentElement;
    if (!active || !layer || !shell) return;

    shell.setAttribute('data-cursor-frame', '0');

    const timers = new Set<number>();
    let lastTrailAt = 0;
    let lastMoveAt = performance.now();
    let colorIndex = 0;
    let frame = 0;

    const frameInterval = window.setInterval(() => {
      if (document.hidden || performance.now() - lastMoveAt > 4000) return;
      frame = (frame + 1) % 3;
      shell.setAttribute('data-cursor-frame', String(frame));
    }, 550);

    const toShellCoords = (clientX: number, clientY: number) => {
      const rect = layer.getBoundingClientRect();
      const scale = rect.width / 1024;
      if (!scale) return null;
      return {
        scale,
        x: Math.max(0, Math.min(1024, (clientX - rect.left) / scale)),
        y: Math.max(0, Math.min(576, (clientY - rect.top) / scale)),
      };
    };

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
      lastMoveAt = performance.now();
      if (lastMoveAt - lastTrailAt < 80) return;
      lastTrailAt = lastMoveAt;

      const pt = toShellCoords(event.clientX, event.clientY);
      if (!pt) return;

      const glint = document.createElement('span');
      const tone = LIGHT_COLORS[colorIndex++ % LIGHT_COLORS.length];
      glint.className = `winter-cursor-glint winter-cursor-glint-${tone} is-star`;
      glint.style.left = `${pt.x + 8 / pt.scale}px`;
      glint.style.top = `${pt.y + 18 / pt.scale}px`;
      glint.style.setProperty('--glint-dx', `${((colorIndex % 5) - 2) * 3}px`);
      spawnNode(glint, 360, 4, '.winter-cursor-glint');
    };

    const onPointerDown = (event: PointerEvent) => {
      lastMoveAt = performance.now();
      const target =
        event.target instanceof Element
          ? event.target.closest('button, a, select, summary, [role="button"], .hero-stuck-fix-card, .reshade-dash-pill, .fc-two-tier-card, .tool-btn, .playlist-dropdown-item')
          : null;
      if (!target || !shell.contains(target) || target.matches(':disabled, [aria-disabled="true"]')) return;
      const box = target.getBoundingClientRect();
      const pt = toShellCoords(
        event.clientX || box.left + box.width / 2,
        event.clientY || box.top + box.height / 2,
      );
      if (!pt) return;

      const spark = document.createElement('span');
      spark.className = 'winter-touch-spark';
      spark.style.left = `${pt.x}px`;
      spark.style.top = `${pt.y}px`;
      spawnNode(spark, 420, 2, '.winter-touch-spark');
    };

    shell.addEventListener('pointermove', onPointerMove, { capture: true, passive: true });
    shell.addEventListener('pointerleave', clearTransient, { passive: true });
    shell.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
    window.addEventListener('blur', clearTransient);

    return () => {
      window.clearInterval(frameInterval);
      shell.removeAttribute('data-cursor-frame');
      shell.removeEventListener('pointermove', onPointerMove, true);
      shell.removeEventListener('pointerleave', clearTransient);
      shell.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('blur', clearTransient);
      clearTransient();
    };
  }, [active]);

  if (!active) return null;
  return <div ref={layerRef} className="winter-cursor-layer" aria-hidden="true" />;
}
