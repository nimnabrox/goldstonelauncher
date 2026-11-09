import * as React from "react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { Rocket, ExternalLink, ShieldCheck, ArrowUp } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');

.cinematic-footer-wrapper {
  font-family: 'Plus Jakarta Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
}

@keyframes footer-breathe {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.45; }
  100% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.85; }
}

@keyframes footer-scroll-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
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
  animation: footer-scroll-marquee 35s linear infinite;
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
  mask-image: linear-gradient(to bottom, transparent, black 25%, black 75%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 25%, black 75%, transparent);
}

/* Aurora Glow (Goldstone Amber) */
.footer-aurora {
  background: radial-gradient(
    circle at 50% 50%, 
    rgba(245, 158, 11, 0.18) 0%, 
    rgba(217, 119, 6, 0.10) 40%, 
    transparent 70%
  );
}

/* Glass Pill Theming */
.footer-glass-pill {
  background: rgba(15, 20, 32, 0.72);
  box-shadow: 
      0 10px 30px -10px rgba(0, 0, 0, 0.6), 
      inset 0 1px 1px rgba(255, 255, 255, 0.1), 
      inset 0 -1px 2px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.footer-glass-pill:hover {
  background: rgba(24, 31, 48, 0.85);
  border-color: rgba(245, 158, 11, 0.4);
  box-shadow: 
      0 18px 40px -10px rgba(245, 158, 11, 0.25), 
      inset 0 1px 1px rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

/* Giant Background Text Masking */
.footer-giant-bg-text {
  font-size: 23vw;
  line-height: 0.75;
  font-weight: 900;
  letter-spacing: -0.05em;
  color: transparent;
  -webkit-text-stroke: 1px rgba(255, 255, 255, 0.05);
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.12) 0%, transparent 65%);
  -webkit-background-clip: text;
  background-clip: text;
}

/* Metallic Text Glow */
.footer-text-glow {
  background: linear-gradient(180deg, #ffffff 0%, rgba(255, 255, 255, 0.6) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0px 0px 24px rgba(245, 158, 11, 0.25));
}
`;

export type MagneticButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & 
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    as?: React.ElementType;
  };

export const MagneticButton = React.forwardRef<HTMLElement, MagneticButtonProps>(
  ({ className, children, as: Component = "button", ...props }, forwardedRef) => {
    const localRef = useRef<HTMLElement>(null);

    useEffect(() => {
      if (typeof window === "undefined") return;
      const element = localRef.current;
      if (!element) return;

      const ctx = gsap.context(() => {
        const handleMouseMove = (e: MouseEvent) => {
          const rect = element.getBoundingClientRect();
          const h = rect.width / 2;
          const w = rect.height / 2;
          const x = e.clientX - rect.left - h;
          const y = e.clientY - rect.top - w;

          gsap.to(element, {
            x: x * 0.35,
            y: y * 0.35,
            rotationX: -y * 0.1,
            rotationY: x * 0.1,
            scale: 1.04,
            ease: "power2.out",
            duration: 0.35,
          });
        };

        const handleMouseLeave = () => {
          gsap.to(element, {
            x: 0,
            y: 0,
            rotationX: 0,
            rotationY: 0,
            scale: 1,
            ease: "elastic.out(1, 0.3)",
            duration: 1.1,
          });
        };

        element.addEventListener("mousemove", handleMouseMove as any);
        element.addEventListener("mouseleave", handleMouseLeave);

        return () => {
          element.removeEventListener("mousemove", handleMouseMove as any);
          element.removeEventListener("mouseleave", handleMouseLeave);
        };
      }, element);

      return () => ctx.revert();
    }, []);

    return (
      <Component
        ref={(node: HTMLElement) => {
          (localRef as any).current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) (forwardedRef as any).current = node;
        }}
        className={cn("cursor-pointer", className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
MagneticButton.displayName = "MagneticButton";

const MarqueeItem = () => (
  <div className="flex items-center space-x-10 px-6">
    <span>GOLDSTONE COUNTY ROLEPLAY</span> <span className="text-amber-400">✦</span>
    <span>100% OPEN SOURCE & VERIFIED SAFE</span> <span className="text-amber-400/60">✦</span>
    <span>ONE-CLICK CONNECT</span> <span className="text-amber-400">✦</span>
    <span>67% STUCK FIX</span> <span className="text-amber-400/60">✦</span>
    <span>REDM & TEAMSPEAK AUTO-SYNC</span> <span className="text-amber-400/60">✦</span>
    <span>GRAPHICS & CACHE CLEANER</span> <span className="text-amber-400">✦</span>
    <span>0 DETECTIONS VIRUSTOTAL</span> <span className="text-amber-400">✦</span>
  </div>
);

interface CinematicFooterProps {
  downloadUrl: string;
  officialSite: string;
  vtUrl: string;
}

export function CinematicFooter({ downloadUrl, officialSite, vtUrl }: CinematicFooterProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const giantTextRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!wrapperRef.current) return;

    const ctx = gsap.context(() => {
      // Parallax text
      if (giantTextRef.current) {
        gsap.fromTo(
          giantTextRef.current,
          { y: "12vh", scale: 0.85, opacity: 0 },
          {
            y: "0vh",
            scale: 1,
            opacity: 1,
            ease: "power1.out",
            scrollTrigger: {
              trigger: wrapperRef.current,
              start: "top 85%",
              end: "bottom bottom",
              scrub: 1,
            },
          }
        );
      }

      // Content reveal
      gsap.fromTo(
        [headingRef.current, linksRef.current],
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: "top 60%",
            end: "bottom bottom",
            scrub: 1,
          },
        }
      );
    }, wrapperRef);

    return () => ctx.revert();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <div
        ref={wrapperRef}
        className="relative w-full min-h-[85vh] md:min-h-screen flex flex-col justify-between overflow-hidden bg-slate-950 text-slate-100 cinematic-footer-wrapper border-t border-white/10"
      >
        {/* Ambient Light & Grid Background */}
        <div className="footer-aurora absolute left-1/2 top-1/2 h-[65vh] w-[85vw] -translate-x-1/2 -translate-y-1/2 animate-footer-breathe rounded-[50%] blur-[90px] pointer-events-none z-0" />
        <div className="footer-bg-grid absolute inset-0 z-0 pointer-events-none" />

        {/* Giant background text: GOLDSTONE */}
        <div
          ref={giantTextRef}
          className="absolute -bottom-[4vh] left-0 right-0 w-full flex justify-center items-center z-0 pointer-events-none select-none overflow-hidden"
        >
          <div className="footer-giant-bg-text text-center select-none whitespace-nowrap tracking-tight">
            GOLDSTONE
          </div>
        </div>

        {/* 1. Diagonal Sleek Marquee (Top of footer) */}
        <div className="relative top-6 md:top-8 left-0 w-full overflow-hidden border-y border-white/10 bg-slate-950/70 backdrop-blur-md py-3.5 z-10 -rotate-1 scale-105 shadow-2xl">
          <div className="flex w-max animate-footer-scroll-marquee text-xs md:text-sm font-extrabold tracking-[0.25em] text-slate-300 uppercase">
            <MarqueeItem />
            <MarqueeItem />
          </div>
        </div>

        {/* 2. Main Center Content */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 my-14 w-full max-w-5xl mx-auto text-center">
          <h2
            ref={headingRef}
            className="text-4xl sm:text-6xl md:text-7xl font-black footer-text-glow tracking-tight uppercase mb-8"
          >
            Ready to enter the frontier?
          </h2>

          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto mb-10 leading-relaxed font-medium">
            Download the official community launcher. Instant connection, automatic 67% freeze fix, and texture cleanup.
          </p>

          {/* Interactive Magnetic Pills Layout */}
          <div ref={linksRef} className="flex flex-col items-center gap-5 w-full">
            {/* Main Action Links */}
            <div className="flex flex-wrap justify-center gap-4 w-full">
              <MagneticButton 
                as="a" 
                href={downloadUrl} 
                className="footer-glass-pill px-8 py-4 sm:px-10 sm:py-5 rounded-full text-slate-950 font-black text-sm md:text-base flex items-center gap-3 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 shadow-[0_0_35px_rgba(245,158,11,0.45)] hover:shadow-[0_0_50px_rgba(245,158,11,0.7)]"
              >
                <Rocket className="w-5 h-5 stroke-[2.5]" />
                <span>DOWNLOAD LAUNCHER (v0.3.0)</span>
              </MagneticButton>
              
              <MagneticButton 
                as="a" 
                href={officialSite} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="footer-glass-pill px-7 py-4 sm:px-8 sm:py-5 rounded-full text-amber-400 font-bold text-sm md:text-base flex items-center gap-2.5 border-amber-500/30 hover:border-amber-400"
              >
                <span>GOLDSTONE COUNTY WEBSITE</span>
                <ExternalLink className="w-4 h-4" />
              </MagneticButton>
            </div>

            {/* Quick Links Row (Cleaned: No RedM or TS3 copy buttons as requested) */}
            <div className="flex flex-wrap justify-center gap-3 w-full mt-2">
              <MagneticButton 
                as="a" 
                href={vtUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-glass-pill px-6 py-2.5 rounded-full text-emerald-400 font-bold text-xs flex items-center gap-2 hover:text-emerald-300 border-emerald-500/25"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>VirusTotal: 0/70 Clean (100% Safe)</span>
              </MagneticButton>

              <MagneticButton 
                as="a" 
                href={officialSite}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-glass-pill px-6 py-2.5 rounded-full text-slate-300 font-semibold text-xs flex items-center gap-2 hover:text-white"
              >
                <img src="/goldstone-logo.png" alt="Goldstone" className="w-3.5 h-3.5 object-contain" />
                <span>Official Community Roleplay</span>
              </MagneticButton>
            </div>
          </div>
        </div>

        {/* 3. Bottom Bar / Credits */}
        <div className="relative z-20 w-full pb-8 pt-4 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-white/5 bg-slate-950/80 backdrop-blur-md">
          
          {/* Copyright */}
          <div className="text-slate-400 text-xs font-semibold tracking-wider uppercase order-2 md:order-1 flex items-center gap-2">
            <img src="/goldstone-logo.png" alt="Goldstone Logo" className="w-5 h-5 object-contain" />
            <span>© 2026 All Rights Reserved by Nimnabro.</span>
          </div>

          {/* Developer Badge */}
          <div className="footer-glass-pill px-5 py-2.5 rounded-full flex items-center gap-2 order-1 md:order-2 cursor-default border-white/10">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Crafted with</span>
            <span className="animate-footer-heartbeat text-sm text-red-500">❤</span>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">by</span>
            <a 
              href="https://guns.lol/nimnabro" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white hover:text-amber-400 font-black text-xs transition-colors flex items-center gap-1.5 ml-1"
            >
              <img src="/nb_logo.jpg" alt="Nimnabro" className="w-4 h-4 rounded-full object-cover" />
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
