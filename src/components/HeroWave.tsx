import { motion, useReducedMotion } from 'motion/react';

// Minimal, near-flat liquid ripple that dissolves the hero into the next
// (solid black) section — a soft gradient fade does most of the blending,
// the wave just adds a hint of motion on top.
const WAVE =
  'M0,120 C300,100 600,140 900,118 C1200,96 1500,130 1800,112 C2000,100 2200,116 2400,110 L2400,200 L0,200 Z';

export default function HeroWave() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="absolute bottom-0 left-0 w-full h-[140px] sm:h-[200px] overflow-hidden pointer-events-none select-none z-[1]">
      {/* Soft gradient fade — carries most of the blend into the next section */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(10,10,9,0.5) 60%, #0A0A09 100%)' }}
      />
      <motion.svg
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 w-[200%] h-full opacity-[0.18]"
        animate={shouldReduceMotion ? {} : { x: ['0%', '-50%'] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      >
        <path d={WAVE} fill="#0A0A09" />
      </motion.svg>
    </div>
  );
}
