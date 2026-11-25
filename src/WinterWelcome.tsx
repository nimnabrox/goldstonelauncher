import goldstoneLogo from './goldstone-logo.png';

const WELCOME_SNOW = Array.from({ length: 8 }, (_, i) => ({
  left: `${5 + (i * 39.3) % 90}%`,
  size: `${1.8 + (i % 4) * 0.75}px`,
  duration: `${6.2 + (i % 5) * 0.85}s`,
  delay: `${-i * 0.68}s`,
  opacity: 0.34 + (i % 5) * 0.12,
  wind: `${((i % 7) - 3) * 6}px`,
}));

export function WinterWelcome({ loading, onDismiss }: { loading: boolean; onDismiss: () => void }) {
  return (
    <div
      className={`welcome-overlay winter-welcome ${loading ? '' : 'fade-out'}`}
      onClick={onDismiss}
      aria-label="Goldstone County welcome"
      aria-busy={loading}
    >
      {loading && (
        <div className="winter-welcome-snow" aria-hidden="true">
          {WELCOME_SNOW.map((flake, i) => (
            <span
              key={i}
              style={{
                left: flake.left,
                width: flake.size,
                height: flake.size,
                opacity: flake.opacity,
                animationDuration: flake.duration,
                animationDelay: flake.delay,
                ['--welcome-wind' as string]: flake.wind,
              }}
            />
          ))}
        </div>
      )}
      <div className="welcome-content winter-welcome-content">
        <div className="welcome-logo-box">
          <div className="welcome-logo-halo" />
          {loading && (
            <svg className="winter-welcome-ring" viewBox="0 0 164 164" aria-hidden="true">
              <defs>
                <linearGradient id="welcomeRingGold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#fff3c9" />
                  <stop offset="0.55" stopColor="#f3be5a" />
                  <stop offset="1" stopColor="#d14242" />
                </linearGradient>
              </defs>
              <circle cx="82" cy="82" r="79" fill="none" stroke="#f2cf8824" strokeWidth="1" />
              <circle
                cx="82"
                cy="82"
                r="79"
                fill="none"
                stroke="url(#welcomeRingGold)"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeDasharray="82 415"
              />
            </svg>
          )}
          <img src={goldstoneLogo} alt="Goldstone County" className="welcome-logo-img" />
        </div>
        <div className="welcome-text-wrap">
          <h1 className="welcome-title">
            GOLDSTONE <span>COUNTY</span>
          </h1>
          <p className="welcome-subtitle">MERRY CHRISTMAS</p>
        </div>
        <div className="winter-welcome-loading">
          <div className="welcome-progress-wrap" role="progressbar" aria-label="Loading Goldstone County">
            <div className="welcome-progress-bar" />
          </div>
          <span>WELCOME TO GOLDSTONE COUNTY</span>
        </div>
      </div>
    </div>
  );
}
