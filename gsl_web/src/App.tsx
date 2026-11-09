import React, { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Rocket,
  ExternalLink,
  Globe,
  ShieldCheck,
  ArrowUp,
  Zap,
  Headphones,
  Palette,
  Music,
  Trash2,
  HardDrive,
  Sparkles,
  Volume2,
  Check,
  Copy,
  Github,
} from "lucide-react";
import { GlowCard } from "./components/ui/spotlight-card";
import release from "../version.json";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const STYLES = `
html {
  scroll-behavior: smooth;
  scroll-padding-top: 2rem;
}

*, *::before, *::after {
  box-sizing: border-box;
}

.cinematic-wrapper {
  font-family: 'Plus Jakarta Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
  scroll-behavior: smooth;
}

.feature-card, .security-card, .footer-glass-pill, .btn-primary-download, .btn-secondary-site {
  transform: translateZ(0);
  backface-visibility: hidden;
}

@keyframes footer-breathe {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.35; }
  100% { transform: translate(-50%, -50%) scale(1.18); opacity: 0.75; }
}

@keyframes footer-scroll-marquee {
  0% { transform: translate3d(0, 0, 0); }
  100% { transform: translate3d(-50%, 0, 0); }
}

@keyframes footer-heartbeat {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(239, 68, 68, 0.5)); }
  15%, 45% { transform: scale(1.25); filter: drop-shadow(0 0 12px rgba(239, 68, 68, 0.8)); }
  30% { transform: scale(1); }
}

.animate-footer-breathe {
  animation: footer-breathe 8s ease-in-out infinite alternate;
}

.animate-footer-scroll-marquee {
  animation: footer-scroll-marquee 80s linear infinite;
  will-change: transform;
}

.animate-footer-heartbeat {
  animation: footer-heartbeat 2s cubic-bezier(0.25, 1, 0.5, 1) infinite;
}

/* Theme Grid Background */
.footer-bg-grid {
  background-size: 50px 50px;
  background-image: 
    linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
}

/* Aurora Glow (Goldstone Amber - Subtle Atmospheric Glow) */
.footer-aurora {
  background: radial-gradient(
    circle at 50% 50%, 
    rgba(245, 158, 11, 0.08) 0%, 
    rgba(217, 119, 6, 0.03) 45%, 
    transparent 70%
  );
}

/* High-Contrast Primary Download Button (Vibrant Golden Glow with Crisp Dark Font) */
.btn-primary-download {
  background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #d97706 100%) !important;
  color: #05070a !important;
  font-weight: 900 !important;
  border: 1px solid rgba(255, 255, 255, 0.45) !important;
  box-shadow: 0 0 35px rgba(245, 158, 11, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.5) !important;
  backdrop-filter: blur(16px);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  letter-spacing: 0.5px;
}

.btn-primary-download:hover {
  background: linear-gradient(135deg, #fbbf24 0%, #fef08a 50%, #f59e0b 100%) !important;
  color: #000000 !important;
  box-shadow: 0 0 50px rgba(245, 158, 11, 0.85), inset 0 1px 1px rgba(255, 255, 255, 0.7) !important;
  transform: scale(1.04);
}

/* High-Contrast Secondary Button (Frosted Glass with Amber Border) */
.btn-secondary-site {
  background: rgba(10, 14, 26, 0.45) !important;
  border: 1px solid rgba(245, 158, 11, 0.55) !important;
  color: #fbbf24 !important;
  font-weight: 800 !important;
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.15) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  letter-spacing: 0.5px;
}

.btn-secondary-site:hover {
  background: rgba(245, 158, 11, 0.22) !important;
  border-color: #fbbf24 !important;
  color: #ffffff !important;
  box-shadow: 0 0 30px rgba(245, 158, 11, 0.45) !important;
  transform: scale(1.04);
}

/* Glass Pill Theming (Transparent Frosted Glass) */
.footer-glass-pill {
  background: rgba(10, 14, 26, 0.42);
  box-shadow: 
      0 12px 36px -10px rgba(0, 0, 0, 0.7), 
      inset 0 1px 1px rgba(255, 255, 255, 0.15), 
      inset 0 -1px 2px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.footer-glass-pill:hover {
  background: rgba(18, 24, 40, 0.65);
  border-color: rgba(245, 158, 11, 0.5);
  box-shadow: 
      0 20px 45px -10px rgba(245, 158, 11, 0.25), 
      inset 0 1px 1px rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

/* Giant Background Text Masking (Full GOLDSTONE at top without overlapping headline or marquee) */
.footer-giant-bg-text {
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(2rem, 8vw, 8.5rem);
  line-height: 0.85;
  font-weight: 900;
  letter-spacing: 0.05em;
  padding-left: 0.05em;
  color: transparent;
  -webkit-text-stroke: 1.5px rgba(245, 158, 11, 0.35);
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.22) 0%, rgba(245, 158, 11, 0.04) 70%, transparent 100%);
  -webkit-background-clip: text;
  background-clip: text;
  filter: drop-shadow(0 0 25px rgba(245, 158, 11, 0.12));
}

/* Metallic Text Glow */
.footer-text-glow {
  background: linear-gradient(180deg, #ffffff 0%, rgba(255, 255, 255, 0.75) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0px 0px 28px rgba(245, 158, 11, 0.3));
}

/* Smooth Professional Light Sweep Animation (Elegant Looping with Rest Delay) */
@keyframes textLightSweep {
  0% {
    background-position: 200% 0;
  }
  32% {
    background-position: -200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.text-light-sweep {
  display: inline-block;
  background: linear-gradient(
    115deg,
    #ffffff 0%,
    #e2e8f0 26%,
    #ffffff 38%,
    #fef08a 47%,
    #ffffff 52%,
    #fbbf24 59%,
    #e2e8f0 72%,
    #ffffff 100%
  );
  background-size: 260% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: textLightSweep 7s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  filter: drop-shadow(0px 0px 28px rgba(245, 158, 11, 0.35));
}
`;

export type MagneticButtonProps =
  React.ButtonHTMLAttributes<HTMLButtonElement> &
    React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      as?: React.ElementType;
    };

export const MagneticButton = React.forwardRef<
  HTMLElement,
  MagneticButtonProps
>(
  (
    { className, children, as: Component = "button", ...props },
    forwardedRef,
  ) => {
    const localRef = useRef<HTMLElement>(null);

    useEffect(() => {
      if (typeof window === "undefined") return;

      // CRITICAL FIX FOR MOBILE: Disable magnetic physics on touch/coarse pointer devices
      // Touch events fire mousemove without mouseleave, causing buttons to get permanently displaced on mobile.
      const isTouch =
        window.matchMedia("(pointer: coarse)").matches ||
        !window.matchMedia("(hover: hover)").matches;
      if (
        isTouch ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;

      const el = localRef.current;
      if (!el) return;

      const ctx = gsap.context(() => {
        const handleMouseMove = (e: MouseEvent) => {
          const rect = el.getBoundingClientRect();
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const mouseX = e.clientX - rect.left - centerX;
          const mouseY = e.clientY - rect.top - centerY;

          gsap.to(el, {
            x: mouseX * 0.35,
            y: mouseY * 0.35,
            rotationX: -mouseY * 0.1,
            rotationY: mouseX * 0.1,
            scale: 1.04,
            ease: "power2.out",
            duration: 0.35,
          });
        };

        const handleMouseLeave = () => {
          gsap.to(el, {
            x: 0,
            y: 0,
            rotationX: 0,
            rotationY: 0,
            scale: 1,
            ease: "elastic.out(1, 0.3)",
            duration: 1.1,
          });
        };

        el.addEventListener("mousemove", handleMouseMove);
        el.addEventListener("mouseleave", handleMouseLeave);

        return () => {
          el.removeEventListener("mousemove", handleMouseMove);
          el.removeEventListener("mouseleave", handleMouseLeave);
        };
      }, el);

      return () => ctx.revert();
    }, []);

    return (
      <Component
        ref={(node: HTMLElement | null) => {
          (localRef as React.MutableRefObject<HTMLElement | null>).current =
            node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        className={`cursor-pointer ${className || ""}`}
        {...props}
      >
        {children}
      </Component>
    );
  },
);
MagneticButton.displayName = "MagneticButton";

const MarqueeDot = () => (
  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] mx-1" />
);

const MarqueeBlock = () => (
  <div className="flex shrink-0 items-center gap-8 pr-8 select-none">
    <span className="text-white font-extrabold">GOLDSTONE COUNTY ROLEPLAY</span>
    <MarqueeDot />
    <span className="text-white font-extrabold">1940s TIMELINE ERA</span>
    <MarqueeDot />
    <span className="text-white font-extrabold">OPEN SOURCE ON GITHUB</span>
    <MarqueeDot />
    <span className="text-white font-extrabold">ONE-CLICK CONNECT</span>
    <MarqueeDot />
    <span className="text-white font-extrabold">
      REDM & TEAMSPEAK DUAL-SYNC
    </span>
    <MarqueeDot />
    <span className="text-white font-extrabold">GRAPHICS & CACHE CLEANER</span>
    <MarqueeDot />
    <span className="text-white font-extrabold">
      VERIFY THE RELEASE ON VIRUSTOTAL
    </span>
    <MarqueeDot />
  </div>
);

export default function App() {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [track, setTrack] = useState(0);
  const [audioError, setAudioError] = useState("");
  const [scenePaused, setScenePaused] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const resumeTrack = useRef(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const giantTextRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  const SHA256_HASH = release.sha256.toUpperCase();
  const VT_URL = `https://www.virustotal.com/gui/file/${SHA256_HASH.toLowerCase()}`;
  const DOWNLOAD_URL = release.downloadUrl;
  const OFFICIAL_GOLDSTONE_SITE = "https://www.goldstonerp.com/";
  const GITHUB_URL = "https://github.com/nimnabrox/goldstonelauncher";
  const GITHUB_RELEASES_URL =
    "https://github.com/nimnabrox/goldstonelauncher/releases";

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setScenePaused(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => {
      preference.removeEventListener("change", update);
      clearTimeout(copyTimer.current);
    };
  }, []);

  useEffect(() => {
    if (scenePaused) videoRef.current?.pause();
    else videoRef.current?.play().catch(() => {});
  }, [scenePaused]);

  useEffect(() => {
    if (resumeTrack.current) {
      resumeTrack.current = false;
      void playMusic();
    }
  }, [track]);

  async function playMusic() {
    setAudioError("");
    try {
      await audioRef.current?.play();
    } catch {
      setAudioError("Music unavailable. Please try again.");
    }
  }

  function nextTrack() {
    resumeTrack.current = playing;
    setTrack((current) => (current + 1) % 2);
    setPlaying(false);
    setAudioError("");
  }

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        // 1. Giant background text parallax (Smooth subtle scroll)
        if (giantTextRef.current) {
          gsap.to(giantTextRef.current, {
            y: -25,
            ease: "none",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          });
        }

        // 2. Hero entrance
        gsap.fromTo(
          [headingRef.current, linksRef.current],
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.1,
            duration: 0.8,
            ease: "power2.out",
            clearProps: "all",
          },
        );

        // 3. Features Section Header Scroll Reveal
        gsap.fromTo(
          ".features-header",
          { y: 20, opacity: 0.3 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: "power2.out",
            clearProps: "all",
            scrollTrigger: {
              trigger: "#features",
              start: "top 95%",
              once: true,
            },
          },
        );

        // 4. Six Feature Cards Staggered Scroll Reveal
        gsap.fromTo(
          ".feature-card",
          { y: 20, opacity: 0.3 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.05,
            duration: 0.5,
            ease: "power2.out",
            clearProps: "all",
            scrollTrigger: {
              trigger: "#features",
              start: "top 90%",
              once: true,
            },
          },
        );

        // 5. Security Safe Card Scroll Reveal
        gsap.fromTo(
          ".security-card",
          { y: 20, opacity: 0.3 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: "power2.out",
            clearProps: "all",
            scrollTrigger: {
              trigger: "#security",
              start: "top 95%",
              once: true,
            },
          },
        );
      }, containerRef);

      return () => ctx.revert();
    });
    return () => media.revert();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };

  const copyToClipboard = async () => {
    clearTimeout(copyTimer.current);
    setCopiedHash(false);
    setCopyError("");
    try {
      await navigator.clipboard.writeText(SHA256_HASH);
      setCopiedHash(true);
    } catch {
      setCopyError(
        "Copy unavailable. Select the checksum to copy it manually.",
      );
    }
    copyTimer.current = setTimeout(() => {
      setCopiedHash(false);
      setCopyError("");
    }, 5000);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <div
        ref={containerRef}
        className="relative w-full min-h-screen flex flex-col justify-between overflow-x-hidden text-slate-100 cinematic-wrapper selection:bg-amber-500 selection:text-black bg-[#07090e]"
      >
        {/* =========================================================================
            --- LIVING FRONTIER VIDEO BACKGROUND (CLEARLY VISIBLE WITH 2PX BLUR) ---
            ========================================================================= */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <video
            ref={videoRef}
            poster="/bg.jpg"
            preload="metadata"
            aria-hidden="true"
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover scale-105 pointer-events-none"
            style={{
              filter: "blur(1px) brightness(0.82) saturate(1.1)",
            }}
          >
            <source src="/gdl_bv_v1_loop.webm" type="video/webm" />
          </video>
          {/* Dark vignette overlay: deep rich contrast so cards and text are crisp while living video remains clear */}
          <div className="scene-shade absolute inset-0 pointer-events-none" />
          {/* Theme Grid */}
          <div className="footer-bg-grid absolute inset-0 pointer-events-none opacity-25" />
          {/* Aurora Glow: Soft warm atmospheric accent restricted to mountain horizon, never blowing out cards */}
          <div className="footer-aurora absolute left-1/2 top-1/4 h-[45vh] w-[65vw] -translate-x-1/2 -translate-y-1/2 rounded-[50%] blur-[120px] pointer-events-none" />
        </div>

        {/* =========================================================================
            --- 1. STARTING HERO (ANGLED MARQUEE + GRAND SERVER NAME + MAIN CTA) ---
            ========================================================================= */}
        <section
          id="home"
          className="hero-shell relative z-10 w-full min-h-[100dvh] flex flex-col justify-between pt-2 pb-6 sm:pb-10 overflow-hidden"
        >
          {/* Top Marquee Bar (Angled Frosted Glass Ribbon with Infinite Animated Loop) */}
          <div className="relative top-2 sm:top-3 left-0 w-full overflow-hidden border-y border-white/10 bg-slate-950/40 backdrop-blur-xl py-2.5 sm:py-3 z-10 -rotate-1 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="flex w-max animate-footer-scroll-marquee text-[11px] sm:text-xs md:text-sm font-extrabold tracking-[0.25em] text-slate-200 uppercase">
              <MarqueeBlock />
              <MarqueeBlock />
              <MarqueeBlock />
              <MarqueeBlock />
              <MarqueeBlock />
              <MarqueeBlock />
              <MarqueeBlock />
              <MarqueeBlock />
            </div>
          </div>

          {/* Grand Server Name Watermark: Proudly Positioned in Mountain Sky (Zero Interference & Perfectly Centered) */}
          <div
            ref={giantTextRef}
            className="absolute top-24 sm:top-28 md:top-32 left-0 right-0 w-full flex justify-center items-center pointer-events-none select-none z-0 overflow-hidden"
          >
            <div className="footer-giant-bg-text text-center select-none whitespace-nowrap">
              GOLDSTONE
            </div>
          </div>

          {/* Hero Main Center Content: Perfectly Fitted for 100% Zoom and Fully Responsive on Mobile */}
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 sm:px-6 pt-36 sm:pt-44 md:pt-48 lg:pt-52 pb-6 sm:pb-8 w-full max-w-4xl lg:max-w-5xl mx-auto text-center my-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] sm:text-xs md:text-sm font-black uppercase tracking-widest mb-3 sm:mb-4 shadow-[0_0_25px_rgba(245,158,11,0.3)]">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span>1940s ERA TIMELINE • NEW UPDATE NOW LIVE</span>
            </div>

            <h1
              ref={headingRef}
              className="text-3xl sm:text-5xl md:text-6xl lg:text-[4.2rem] font-black tracking-tight uppercase mb-3 sm:mb-4 font-['Outfit'] leading-[1.08]"
            >
              <span className="text-light-sweep">
                Goldstone County <span className="text-amber-400">•</span> 1940s
                Era
              </span>
            </h1>

            <p className="text-slate-200 text-xs sm:text-sm md:text-base max-w-xl sm:max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed font-semibold px-2">
              Step into the 1940s vintage timeline. Download the official
              community launcher with instant dual-sync connection for RedM and
              TeamSpeak 3 SaltyChat.
            </p>

            {/* Main Action Buttons (High Contrast & Glowing) */}
            <div
              ref={linksRef}
              className="flex flex-col items-center gap-3 sm:gap-4 w-full"
            >
              <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-3 sm:gap-4 w-full">
                <MagneticButton
                  as="a"
                  href={DOWNLOAD_URL}
                  download="Goldstone County.exe"
                  className="btn-primary-download w-full sm:w-auto px-7 py-3.5 sm:px-9 sm:py-4 rounded-full text-xs sm:text-sm md:text-base flex items-center justify-center gap-2.5 sm:gap-3 cursor-pointer"
                >
                  <Rocket className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                  <span>DOWNLOAD LAUNCHER (v{release.version})</span>
                </MagneticButton>

                <MagneticButton
                  as="a"
                  href="#features"
                  className="btn-secondary-site w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 rounded-full text-xs sm:text-sm md:text-base flex items-center justify-center gap-2.5 cursor-pointer font-black border-amber-500/40 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                >
                  <Globe className="w-4 h-4 text-amber-400" />
                  <span>EXPLORE LAUNCHER FEATURES</span>
                </MagneticButton>
              </div>

              {/* Sub-row with Official Goldstone Website and Badges */}
              <div className="flex flex-wrap justify-center items-center gap-2.5 w-full mt-1">
                <MagneticButton
                  as="a"
                  href={OFFICIAL_GOLDSTONE_SITE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-glass-pill px-5 py-2 rounded-full text-amber-300/90 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-2 hover:text-white border-amber-500/25 bg-amber-950/20"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                  <span>OFFICIAL GOLDSTONE WEBSITE</span>
                </MagneticButton>
              </div>

              {/* Quick Info Badges */}
              <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-2.5 w-full mt-1">
                <MagneticButton
                  as="a"
                  href={VT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-glass-pill px-5 py-2 rounded-full text-emerald-400 font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-2 hover:text-emerald-300 border-emerald-500/35"
                >
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                  <span>View VirusTotal Report</span>
                </MagneticButton>

                <MagneticButton
                  as="a"
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-glass-pill px-5 py-2 rounded-full text-slate-200 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-2 hover:text-white border-white/10"
                >
                  <Github className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />
                  <span>Open Source (View Code)</span>
                </MagneticButton>
              </div>
              <a
                className="download-mirror"
                href={`${GITHUB_URL}/releases/download/${release.version}/Goldstone.County.exe`}
                download="Goldstone County.exe"
              >
                GitHub download mirror <ExternalLink className="w-3 h-3" />
              </a>
              <div
                className="ambience-controls"
                aria-label="County ambience controls"
              >
                <button
                  className="ambience-button"
                  onClick={() =>
                    playing ? audioRef.current?.pause() : void playMusic()
                  }
                  aria-label={
                    playing ? "Pause county music" : "Play county music"
                  }
                  aria-pressed={playing}
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>{playing ? "PAUSE MUSIC" : "COUNTY SOUNDTRACK"}</span>
                </button>
                <button
                  className="ambience-next"
                  onClick={nextTrack}
                  aria-label="Next music track"
                >
                  {String(track + 1).padStart(2, "0")} →
                </button>
                <span className="ambience-divider" aria-hidden="true" />
                <button
                  className="ambience-button"
                  onClick={() => setScenePaused((current) => !current)}
                  aria-pressed={scenePaused}
                >
                  <span>{scenePaused ? "PLAY SCENERY" : "PAUSE SCENERY"}</span>
                </button>
                <audio
                  ref={audioRef}
                  src={`/gscs_${track + 1}.mp3`}
                  preload="none"
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onEnded={nextTrack}
                  onError={() => {
                    setPlaying(false);
                    setAudioError("Music unavailable. Please try again.");
                  }}
                />
              </div>
              <p className="ambience-status" role="status">
                {audioError}
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            --- 2. SIX CORE FEATURES (MATCHING CINEMATIC THEME) ---
            ========================================================================= */}
        <section
          id="features"
          className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
        >
          <div className="features-header text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>LAUNCHER FEATURES</span>
            </div>
            <h2 className="font-['Outfit'] text-3xl sm:text-5xl font-black uppercase text-white">
              Everything You Need To Play
            </h2>
            <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed font-medium">
              Jump into Goldstone County quickly and easily with built-in fixes
              and recovery tools.
            </p>
          </div>

          {/* 6 Feature Glow Cards (All with Goldstone Amber Glow) */}
          <div className="feature-cards-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1: Dual-Sync */}
            <GlowCard
              customSize={true}
              glowColor="gold"
              className="feature-card p-7 rounded-2xl flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-110 transition-transform">
                  <Rocket className="w-6 h-6" />
                </div>
                <h3 className="font-['Outfit'] text-xl font-black text-white mb-2">
                  One-Click Dual-Sync
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Opens RedM and TeamSpeak 3 simultaneously, sets your voice
                  channel, and connects you straight to Goldstone County.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5" />
                <span>Simultaneous Launch</span>
              </div>
            </GlowCard>

            {/* Feature 2: ReShade Graphics (NEW) */}
            <GlowCard
              customSize={true}
              glowColor="gold"
              className="feature-card p-7 rounded-2xl flex flex-col justify-between group relative overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                    <Palette className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/25 border border-amber-500/60 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                    v0.3.2 NEW
                  </span>
                </div>
                <h3 className="font-['Outfit'] text-xl font-black text-white mb-2">
                  Goldstone ReShade Graphics
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Enhanced vintage 1940s graphics and cinematic visual presets
                  with easy one-click install and in-game toggle.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>1940s Vintage Visuals</span>
              </div>
            </GlowCard>

            {/* Feature 3: TeamSpeak 3 & SaltyChat Auto Installer (NEW) */}
            <GlowCard
              customSize={true}
              glowColor="gold"
              className="feature-card p-7 rounded-2xl flex flex-col justify-between group relative overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                    <Headphones className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/25 border border-amber-500/60 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                    v0.3.2 NEW
                  </span>
                </div>
                <h3 className="font-['Outfit'] text-xl font-black text-white mb-2">
                  TS3 & SaltyChat Easy Installer
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  One-click easy installation with live progress for TeamSpeak 3
                  and SaltyChat plugin. No complicated manual setup needed.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Check className="w-3.5 h-3.5" />
                <span>Live Status & Auto Setup</span>
              </div>
            </GlowCard>

            {/* Feature 4: Official Songs & Music Player (NEW) */}
            <GlowCard
              customSize={true}
              glowColor="gold"
              className="feature-card p-7 rounded-2xl flex flex-col justify-between group relative overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                    <Music className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/25 border border-amber-500/60 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                    11 TRACKS
                  </span>
                </div>
                <h3 className="font-['Outfit'] text-xl font-black text-white mb-2">
                  Official Songs & Music Player
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Official Goldstone songs, music video by KRJ & EMD, remixes,
                  and queue music player with instant offline playback.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Offline Persistent</span>
              </div>
            </GlowCard>

            {/* Feature 5: Standalone Single Executable (NEW) */}
            <GlowCard
              customSize={true}
              glowColor="gold"
              className="feature-card p-7 rounded-2xl flex flex-col justify-between group relative overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/25 border border-amber-500/60 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                    PORTABLE
                  </span>
                </div>
                <h3 className="font-['Outfit'] text-xl font-black text-white mb-2">
                  Goldstone County.exe
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Official standalone single-file binary. Runs instantly on any
                  clean Windows 10/11 PC with no installer, WebView2, or runtime
                  dependencies needed.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Check className="w-3.5 h-3.5" />
                <span>Pure Single-File Portable</span>
              </div>
            </GlowCard>

            {/* Feature 6: Smart 67% Stuck Fix */}
            <GlowCard
              customSize={true}
              glowColor="gold"
              className="feature-card p-7 rounded-2xl flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="font-['Outfit'] text-xl font-black text-white mb-2">
                  Smart 67% Stuck Fix
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Solves the notorious RedM 67% loading freeze. Launches clean
                  to the engine first, then auto-connects once assets are ready.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Check className="w-3.5 h-3.5" />
                <span>Engine Ready Protection</span>
              </div>
            </GlowCard>

            {/* Feature 7: Vulkan & Cache Cleaner */}
            <GlowCard
              customSize={true}
              glowColor="gold"
              className="feature-card p-7 rounded-2xl flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-110 transition-transform">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="font-['Outfit'] text-xl font-black text-white mb-2">
                  Vulkan & Cache Cleaner
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  One-click fix for graphical glitches, invisible buildings, and
                  RedM Vulkan shader crashes without restarting your PC.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Check className="w-3.5 h-3.5" />
                <span>Instant Repair</span>
              </div>
            </GlowCard>

            {/* Feature 8: Deadlock Killer & Auto-Locator */}
            <GlowCard
              customSize={true}
              glowColor="gold"
              className="feature-card p-7 rounded-2xl flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-110 transition-transform">
                  <HardDrive className="w-6 h-6" />
                </div>
                <h3 className="font-['Outfit'] text-xl font-black text-white mb-2">
                  Deadlock Killer & Locator
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Scans all storage drives automatically for game paths and
                  terminates hung background RedM/RDR2 processes after crashes.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Check className="w-3.5 h-3.5" />
                <span>Memory & Path Manager</span>
              </div>
            </GlowCard>
          </div>
        </section>

        {/* =========================================================================
            --- 3. 100% VIRUS-FREE / SECURITY SECTION (WITH GLOW CARD & GOLD THEME) ---
            ========================================================================= */}
        <section
          id="security"
          className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full"
        >
          <GlowCard
            customSize={true}
            glowColor="gold"
            className="security-card p-8 sm:p-12 text-center relative overflow-hidden"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4 mx-auto">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>OPEN SOURCE & RELEASE VERIFICATION</span>
            </div>

            <h2 className="font-['Outfit'] text-3xl sm:text-4xl font-black uppercase text-white">
              Your Launcher. Fully Transparent.
            </h2>

            <p className="mt-3 text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Inspect the source on GitHub, compare the official release
              fingerprint, and check the VirusTotal report for this file.
              Download with the information you need to verify the launcher
              yourself.
            </p>

            {/* Checksum Box with One-Click Copy */}
            <div className="mt-6 p-4 rounded-xl bg-[#080b11]/90 backdrop-blur-md border border-amber-500/30 max-w-2xl mx-auto text-left font-mono text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
              <div className="w-full">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
                  Official SHA-256 Checksum:
                </div>
                <div className="text-amber-400 break-all select-all font-bold">
                  {SHA256_HASH}
                </div>
              </div>
              <button
                aria-label="Copy release checksum"
                onClick={copyToClipboard}
                className="flex-shrink-0 px-3.5 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedHash ? (
                  <Check className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedHash ? "COPIED" : "COPY"}</span>
              </button>
            </div>

            <p className="checksum-status" role="status">
              {copiedHash ? "Checksum copied" : copyError}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <a
                href={VT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-glass-pill px-7 py-3.5 rounded-full text-amber-300 font-['Outfit'] font-black text-sm uppercase tracking-wider border-amber-500/50 hover:bg-amber-500/20 transition-all flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Verify VirusTotal Report</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-glass-pill px-7 py-3.5 rounded-full text-slate-200 font-['Outfit'] font-black text-sm uppercase tracking-wider border-white/15 hover:border-amber-500/50 hover:text-amber-300 transition-all flex items-center gap-2"
              >
                <Github className="w-4 h-4 text-slate-300" />
                <span>Inspect Source Code (GitHub)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </GlowCard>
        </section>

        {/* =========================================================================
            --- 4. BOTTOM BAR / CREDITS ---
            ========================================================================= */}
        <div className="relative z-20 w-full pb-8 pt-4 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-white/10 bg-slate-950/40 backdrop-blur-xl">
          {/* Copyright: STRICTLY ALL RIGHTS RESERVED BY NIMNABRO */}
          <div className="text-slate-400 text-xs font-semibold tracking-wider uppercase order-2 md:order-1 flex items-center gap-2">
            <img
              src="/goldstone-logo.png"
              alt="Goldstone Logo"
              className="w-5 h-5 object-contain"
            />
            <span>© 2026 All Rights Reserved by Nimnabro.</span>
          </div>

          {/* Developer Badge: CREATED BY ❤ Nimnabro */}
          <div className="footer-glass-pill px-5 py-2.5 rounded-full flex items-center gap-2 order-1 md:order-2 cursor-default border-white/10">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              CREATED BY
            </span>
            <span className="animate-footer-heartbeat text-sm text-red-500">
              ❤
            </span>
            <a
              href="https://guns.lol/nimnabro"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-amber-400 font-black text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 ml-0.5"
            >
              <img
                src="/nb_logo.jpg"
                alt="Nimnabro"
                className="w-4 h-4 rounded-full object-cover border border-amber-500/40"
              />
              <span>Nimnabro</span>
            </a>
          </div>

          {/* Back to top */}
          <MagneticButton
            as="button"
            onClick={scrollToTop}
            className="w-10 h-10 rounded-full footer-glass-pill flex items-center justify-center text-slate-400 hover:text-white group order-3"
            title="Back to top"
          >
            <ArrowUp className="w-4 h-4 transform group-hover:-translate-y-1 transition-transform duration-300 text-amber-400" />
          </MagneticButton>
        </div>
      </div>
    </>
  );
}
