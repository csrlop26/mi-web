// Fixed-viewport ambient dots — replaces the flickering film-grain overlay
// on flat-color sections. Kept extremely subtle: a handful of slow-drifting
// specks, not a distraction. The hero keeps its own dedicated grain texture.
const DOTS = [
  { left: '8%', top: '15%', size: 3, duration: 22, delay: 0 },
  { left: '22%', top: '68%', size: 2, duration: 26, delay: 2 },
  { left: '38%', top: '32%', size: 2.5, duration: 19, delay: 4 },
  { left: '54%', top: '80%', size: 3, duration: 24, delay: 1 },
  { left: '67%', top: '20%', size: 2, duration: 28, delay: 5 },
  { left: '79%', top: '55%', size: 3.5, duration: 21, delay: 3 },
  { left: '90%', top: '12%', size: 2, duration: 25, delay: 6 },
  { left: '13%', top: '88%', size: 2.5, duration: 23, delay: 2.5 },
  { left: '46%', top: '10%', size: 2, duration: 27, delay: 4.5 },
  { left: '85%', top: '78%', size: 3, duration: 20, delay: 1.5 },
];

interface AmbientParticlesProps {
  hidden?: boolean;
}

export default function AmbientParticles({ hidden = false }: AmbientParticlesProps) {
  return (
    <div
      className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden transition-opacity duration-700"
      style={{ opacity: hidden ? 0 : 1 }}
      aria-hidden="true"
    >
      {DOTS.map((dot, i) => (
        <span
          key={i}
          className="ambient-dot"
          style={{
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
            animationDuration: `${dot.duration}s`,
            animationDelay: `${dot.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
