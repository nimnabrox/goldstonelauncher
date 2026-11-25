import { useEffect, useRef } from 'react';

// Decorative capture listener: never changes propagation, defaults, or action handlers.
export function WinterButtonFeedback({enabled=true}:{enabled?:boolean}) {
  const layerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const layer = layerRef.current;
    const shell = layer?.parentElement;
    if (!enabled || !layer || !shell) return;
    const timers = new Set<number>();
    const snow = (event: MouseEvent) => {
      if (shell.classList.contains('winter-effects-paused')) return;
      const target = event.target instanceof Element ? event.target.closest(
        '.btn-hero-launch-mid, .btn-hero-sub, .hero-stuck-fix-card'
      ) : null;
      if (!target || !shell.contains(target) || target.matches(':disabled, [aria-disabled="true"]')) return;
      const bounds = layer.getBoundingClientRect();
      const button = target.getBoundingClientRect();
      const scale = bounds.width / 1024;
      if (!scale) return;
      const x = (Math.max(button.left + 4, Math.min(button.right - 4,
        event.detail ? event.clientX : button.left + button.width / 2)) - bounds.left) / scale;
      // Lift snow from the top edge rather than covering the button's label.
      const y = (button.top + 2 * scale - bounds.top) / scale;
      const burst = document.createElement('span');
      burst.className = 'winter-click-burst';
      burst.style.left = `${Math.max(5, Math.min(1019, x))}px`;
      burst.style.top = `${Math.max(5, Math.min(571, y))}px`;
      for (let i = 0; i < 10; i++) {
        const particle = document.createElement('i');
        const angle = Math.PI + i * Math.PI / 9;
        const radius = 17 + (i % 3) * 7;
        particle.className = i % 3 === 0 ? 'winter-click-crystal' : 'winter-click-powder';
        particle.style.setProperty('--snow-x', `${Math.cos(angle) * radius}px`);
        particle.style.setProperty('--snow-y', `${Math.sin(angle) * radius - 5}px`);
        particle.style.setProperty('--snow-turn', `${i % 2 ? 90 : -65}deg`);
        burst.appendChild(particle);
      }
      // Bounded effects even during rapid clicking. No animation frame loop or React state.
      while (layer.childElementCount >= 3) layer.firstElementChild?.remove();
      layer.appendChild(burst);
      const timer = window.setTimeout(() => { burst.remove(); timers.delete(timer); }, 720);
      timers.add(timer);
    };
    shell.addEventListener('click', snow, { capture: true, passive: true });
    return () => {
      shell.removeEventListener('click', snow, true);
      timers.forEach(timer => window.clearTimeout(timer));
      layer.replaceChildren();
    };
  }, [enabled]);
  return <div ref={layerRef} className="winter-click-effects" aria-hidden="true" />;
}
