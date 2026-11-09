import React, { useEffect, useRef, ReactNode } from 'react';

export type GlowColor = 'gold' | 'amber' | 'yellow' | 'blue' | 'purple' | 'green' | 'red' | 'orange';

interface GlowCardProps {
  children?: ReactNode;
  className?: string;
  glowColor?: GlowColor;
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
  height?: string | number;
  customSize?: boolean;
}

interface GlowColorConfig {
  hotspot: string;
  primary: string;
  secondary: string;
  ambient: string;
}

const colorMap: Record<GlowColor, GlowColorConfig> = {
  gold: {
    hotspot: '#ffffff',
    primary: '#fbbf24',
    secondary: '#f59e0b',
    ambient: 'rgba(245, 158, 11, 0.45)',
  },
  amber: {
    hotspot: '#ffffff',
    primary: '#fbbf24',
    secondary: '#d97706',
    ambient: 'rgba(217, 119, 6, 0.45)',
  },
  yellow: {
    hotspot: '#ffffff',
    primary: '#fef08a',
    secondary: '#eab308',
    ambient: 'rgba(234, 179, 8, 0.45)',
  },
  blue: {
    hotspot: '#ffffff',
    primary: '#93c5fd',
    secondary: '#3b82f6',
    ambient: 'rgba(59, 130, 246, 0.45)',
  },
  purple: {
    hotspot: '#ffffff',
    primary: '#f0abfc',
    secondary: '#c084fc',
    ambient: 'rgba(192, 132, 252, 0.45)',
  },
  green: {
    hotspot: '#ffffff',
    primary: '#86efac',
    secondary: '#22c55e',
    ambient: 'rgba(34, 197, 94, 0.45)',
  },
  red: {
    hotspot: '#ffffff',
    primary: '#fca5a5',
    secondary: '#ef4444',
    ambient: 'rgba(239, 68, 68, 0.45)',
  },
  orange: {
    hotspot: '#ffffff',
    primary: '#fed7aa',
    secondary: '#f97316',
    ambient: 'rgba(249, 115, 22, 0.45)',
  },
};

const sizeMap = {
  sm: 'w-48 h-64',
  md: 'w-64 h-80',
  lg: 'w-80 h-96',
};

const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = '',
  glowColor = 'gold',
  size = 'md',
  width,
  height,
  customSize = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowLayerRef = useRef<HTMLDivElement>(null);
  const bloomLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const card = cardRef.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;

      // Distance from cursor to nearest card edge
      const dx = Math.max(0, -localX, localX - rect.width);
      const dy = Math.max(0, -localY, localY - rect.height);
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Active glow proximity: within 180px of card (allows smooth gap lighting between adjacent cards)
      const maxProximity = 180;
      const opacity = dist < maxProximity ? Math.max(0, 1 - dist / maxProximity) : 0;

      // Direct hardware-accelerated CSS variable updates (0 React re-renders, 120 FPS)
      card.style.setProperty('--glow-x', `${localX.toFixed(1)}px`);
      card.style.setProperty('--glow-y', `${localY.toFixed(1)}px`);
      card.style.setProperty('--glow-opacity', opacity.toFixed(3));
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  const config = colorMap[glowColor] || colorMap.gold;

  const getSizeClasses = () => {
    if (customSize) return '';
    return sizeMap[size];
  };

  return (
    <div
      ref={cardRef}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      className={`
        ${getSizeClasses()}
        ${!customSize ? 'aspect-[3/4]' : ''}
        relative 
        rounded-2xl 
        border 
        border-white/[0.08]
        bg-[#090c14]/94 
        backdrop-blur-xl 
        shadow-[0_12px_36px_-10px_rgba(0,0,0,0.85)]
        transition-all 
        duration-300
        overflow-hidden
        ${className}
      `}
    >
      {/* 1. Ambient outer bloom along edges near the cursor (Soft neon halo) */}
      <div
        ref={bloomLayerRef}
        className="pointer-events-none absolute -inset-1 rounded-[inherit] transition-opacity duration-150"
        style={{
          opacity: 'calc(var(--glow-opacity, 0) * 0.65)',
          background: `radial-gradient(190px circle at var(--glow-x, -1000px) var(--glow-y, -1000px), ${config.ambient} 0%, transparent 70%)`,
          filter: 'blur(8px)',
          zIndex: 1,
        }}
      />

      {/* 2. Razor-sharp 1.5px Border Spotlight (White laser center + golden rim, masked strictly to border) */}
      <div
        ref={glowLayerRef}
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-100"
        style={{
          opacity: 'var(--glow-opacity, 0)',
          border: '1.5px solid transparent',
          background: `radial-gradient(150px circle at var(--glow-x, -1000px) var(--glow-y, -1000px), ${config.hotspot} 0%, ${config.primary} 30%, ${config.secondary} 60%, transparent 100%) border-box`,
          WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          mask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          zIndex: 2,
        }}
      />

      {/* 3. Card Content (Solid dark interior, 100% crystal-clear text, never covered by glow) */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between">
        {children}
      </div>
    </div>
  );
};

export { GlowCard };
