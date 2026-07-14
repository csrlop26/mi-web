import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';

// The single AUGUSTOCS wordmark, shared between hero and the section that
// follows: it starts large and dark (as if still part of the hero), then as
// this zone scrolls through the viewport it shrinks, turns white, and lands
// pinned above "Cerramos esa brecha" via position: sticky.
export default function WordmarkHandoff() {
  const zoneRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: zoneRef,
    offset: ['start end', 'end start'],
  });

  const scale = useTransform(scrollYProgress, [0.15, 0.55], [1, 0.32]);
  const color = useTransform(scrollYProgress, [0.3, 0.65], ['#0A0A09', '#EAE7E2']);
  const entrance = useTransform(scrollYProgress, [0, 0.08], [0, 1]);

  return (
    <div
      ref={zoneRef}
      className="relative -mt-[150px] sm:-mt-[190px] md:-mt-[230px] h-[380px] sm:h-[440px] md:h-[480px] z-30 pointer-events-none"
    >
      <div className="sticky top-20 sm:top-24 flex justify-center">
        <motion.svg
          viewBox="0 0 900 120"
          style={shouldReduceMotion ? { scale: 0.32 } : { scale, opacity: entrance }}
          className="w-[260px] sm:w-[380px] md:w-[560px] h-auto select-none"
        >
          <motion.text
            x="50%" y="85%" textAnchor="middle"
            fontFamily="'Unbounded', sans-serif" fontWeight="700" fontSize="100"
            textLength="820" lengthAdjust="spacingAndGlyphs"
            style={{ fill: shouldReduceMotion ? '#EAE7E2' : color }}
          >
            AUGUSTOCS
          </motion.text>
        </motion.svg>
      </div>
    </div>
  );
}
