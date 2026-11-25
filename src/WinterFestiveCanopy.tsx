const LIGHTS = [
  { left: '8%', top: 8, delay: '0s', color: 'red' },
  { left: '17%', top: 13, delay: '-.7s', color: 'gold' },
  { left: '26%', top: 15, delay: '-1.4s', color: 'green' },
  { left: '36.5%', top: 10, delay: '-2.1s', color: 'warm' },
  { left: '63.5%', top: 10, delay: '-2.8s', color: 'red' },
  { left: '74%', top: 15, delay: '-1.1s', color: 'gold' },
  { left: '83%', top: 13, delay: '-1.9s', color: 'green' },
  { left: '92%', top: 8, delay: '-.4s', color: 'warm' },
];

const ORNAMENTS = [
  { left: '33.5%', top: 13, delay: '0s', kind: 'star' as const },
  { left: '66.5%', top: 13, delay: '-1.8s', kind: 'bauble' as const },
];

const SWAG_TUFTS = [
  { x: 10, y: 4, scale: 1.15, rot: -6 },
  { x: 30, y: 7, scale: 1.1, rot: 4 },
  { x: 54, y: 11, scale: 1.04, rot: 8 },
  { x: 80, y: 14, scale: 0.98, rot: 11 },
  { x: 108, y: 16, scale: 0.92, rot: 13 },
  { x: 138, y: 17, scale: 0.85, rot: 12 },
  { x: 168, y: 17, scale: 0.78, rot: 9 },
  { x: 200, y: 16, scale: 0.72, rot: 5 },
  { x: 232, y: 15, scale: 0.66, rot: 2 },
  { x: 266, y: 13, scale: 0.58, rot: -2 },
  { x: 302, y: 11, scale: 0.50, rot: -6 },
];

export function WinterFestiveCanopy({ animated }: { animated: boolean }) {
  return (
    <div className={`winter-festive-canopy ${animated ? 'is-animated' : ''}`} aria-hidden="true">
      <div className="winter-frost-sheen" />
      <svg className="winter-garland-cord" viewBox="0 0 1024 44" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cordGoldRed" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#26633e" stopOpacity="0.95" />
            <stop offset="0.22" stopColor="#b88c42" stopOpacity="0.88" />
            <stop offset="0.5" stopColor="#e9c472" stopOpacity="0.72" />
            <stop offset="0.78" stopColor="#b88c42" stopOpacity="0.88" />
            <stop offset="1" stopColor="#26633e" stopOpacity="0.95" />
          </linearGradient>
        </defs>
        <path
          d="M-6 3 Q190 28 430 9 Q512 4 594 9 Q834 28 1030 3"
          fill="none"
          stroke="url(#cordGoldRed)"
          strokeWidth="2.1"
        />
        <path
          d="M-6 5 Q190 30 430 10 Q512 5 594 10 Q834 30 1030 5"
          fill="none"
          stroke="#ffe29a"
          strokeOpacity="0.38"
          strokeWidth="0.9"
        />
        {[0, 1].map((side) => (
          <g key={side} transform={side === 1 ? 'translate(1024 0) scale(-1 1)' : undefined}>
            <path d="M-4 3 Q155 18 320 11" fill="none" stroke="#15472d" strokeWidth="4.2" strokeLinecap="round" />
            <path d="M-4 3 Q155 18 320 11" fill="none" stroke="#2c7a50" strokeWidth="1.9" strokeLinecap="round" />
            {SWAG_TUFTS.map((t, idx) => (
              <g key={t.x} transform={`translate(${t.x} ${t.y}) scale(${t.scale}) rotate(${t.rot})`}>
                <path
                  d="M0 0 l-9 -10 M0 0 l-4 -12 M0 0 l4 -12 M0 0 l11 -8 M0 0 l13 -2 M0 0 l9 7 M0 0 l2 10 M0 0 l-8 6"
                  fill="none"
                  stroke={idx % 2 === 0 ? '#185938' : '#25704a'}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <path
                  d="M0 0 l-6 -8 M0 0 l5 -9 M0 0 l10 -4 M0 0 l6 6"
                  fill="none"
                  stroke={idx % 2 === 0 ? '#4ca372' : '#3a8b5f'}
                  strokeWidth="1.25"
                  strokeLinecap="round"
                />
                {idx % 2 === 0 && (
                  <path
                    d="M0 0 l2 -9 M0 0 l10 -3"
                    fill="none"
                    stroke="#ebf8f2"
                    strokeOpacity="0.62"
                    strokeWidth="0.85"
                    strokeLinecap="round"
                  />
                )}
              </g>
            ))}
            <g transform="translate(18 11)">
              <path d="M0 1 c-11 -7 -16 4 -4 7 z" fill="#b81728" stroke="#ff7a84" strokeWidth="0.6" />
              <path d="M0 1 c11 -7 16 4 4 7 z" fill="#de2235" stroke="#ff9aa2" strokeWidth="0.6" />
              <path d="M-2 3 l-5 11 l4 -2 l2 2 z" fill="#9c1220" />
              <path d="M2 3 l6 11 l-4 -2 l-2 2 z" fill="#c4192a" />
              <circle cx="0" cy="2" r="3" fill="#ee3142" stroke="#ffe0b5" strokeWidth="0.65" />
            </g>
            <g>
              <circle cx="72" cy="14" r="3.1" fill="#d91e30" />
              <circle cx="71.2" cy="13" r="0.95" fill="#ffe2e5" />
              <circle cx="78" cy="15.5" r="2.6" fill="#ee3244" />
              <circle cx="77.2" cy="14.6" r="0.8" fill="#ffeaec" />
              <circle cx="74.5" cy="18.2" r="2.3" fill="#ad1524" />
            </g>
            <g>
              <circle cx="144" cy="17" r="2.7" fill="#e22336" />
              <circle cx="143.2" cy="16.1" r="0.85" fill="#ffe2e5" />
              <circle cx="149.2" cy="18.6" r="2.3" fill="#f3c45f" />
              <circle cx="148.5" cy="17.9" r="0.7" fill="#fff7da" />
            </g>
            <g>
              <circle cx="222" cy="15.5" r="2.5" fill="#dc2335" />
              <circle cx="221.3" cy="14.7" r="0.75" fill="#ffe0e2" />
              <circle cx="227" cy="17" r="2.1" fill="#f0c15a" />
            </g>
          </g>
        ))}
      </svg>

      {LIGHTS.map((light) => (
        <span
          key={light.left}
          className={`winter-fairy-bulb winter-fairy-bulb-${light.color}`}
          style={{ left: light.left, top: `${light.top}px`, animationDelay: light.delay }}
        />
      ))}

      {ORNAMENTS.map((item) => (
        <svg
          key={item.left}
          className="winter-canopy-ornament"
          style={{ left: item.left, top: `${item.top}px`, animationDelay: item.delay }}
          viewBox="0 0 28 42"
        >
          <defs>
            <linearGradient id={`starGold-${sideKey(item.left)}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff7cf" />
              <stop offset="0.48" stopColor="#f5be4c" />
              <stop offset="1" stopColor="#b57012" />
            </linearGradient>
            <radialGradient id={`baubleRed-${sideKey(item.left)}`} cx="36%" cy="32%" r="68%">
              <stop offset="0" stopColor="#ff9fa3" />
              <stop offset="0.28" stopColor="#e6283a" />
              <stop offset="0.75" stopColor="#9e1020" />
              <stop offset="1" stopColor="#4f060e" />
            </radialGradient>
          </defs>
          <path d="M14 0 v13" stroke="#f0d590" strokeOpacity="0.9" strokeWidth="1" />
          <circle cx="14" cy="13" r="1.5" fill="none" stroke="#f9df98" strokeWidth="0.95" />
          {item.kind === 'star' ? (
            <>
              <path
                d="m14 14 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.8-5.4 2.8 1-6.1-4.4-4.3 6.1-.9Z"
                fill={`url(#starGold-${sideKey(item.left)})`}
                stroke="#fff6d4"
                strokeWidth="0.7"
              />
              <path d="m14 15.8 0 11.4 m-4.5 -5.8 9 0" stroke="#fffbe4" strokeOpacity="0.52" strokeWidth="0.6" />
            </>
          ) : (
            <>
              <rect x="11.2" y="13.5" width="5.6" height="3.3" rx="0.9" fill="#f4d482" stroke="#8f6318" strokeWidth="0.4" />
              <circle cx="14" cy="25.5" r="8.8" fill={`url(#baubleRed-${sideKey(item.left)})`} stroke="#f8be8e" strokeOpacity="0.75" strokeWidth="0.75" />
              <path d="M6.8 23.6 q7.2-4 14.4 0 m-14.4 4.2 q7.2-4 14.4 0" fill="none" stroke="#f8d480" strokeOpacity="0.88" strokeWidth="0.85" />
              <ellipse cx="10.8" cy="21.6" rx="2.1" ry="1.3" transform="rotate(-28 10.8 21.6)" fill="#ffffff" fillOpacity="0.54" />
            </>
          )}
        </svg>
      ))}
    </div>
  );
}

function sideKey(left: string) {
  return left.replace(/[^a-z0-9]/gi, '');
}
