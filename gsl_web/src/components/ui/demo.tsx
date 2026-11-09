import { GlowCard } from "@/components/ui/spotlight-card";

export function Default() {
  return (
    <div className="w-screen h-screen flex flex-row items-center justify-center gap-10 custom-cursor">
      <GlowCard glowColor="orange">
        <div className="text-white font-bold">Orange Card</div>
      </GlowCard>
      <GlowCard glowColor="blue">
        <div className="text-white font-bold">Blue Card</div>
      </GlowCard>
      <GlowCard glowColor="purple">
        <div className="text-white font-bold">Purple Card</div>
      </GlowCard>
    </div>
  );
}

