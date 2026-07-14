import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  accent: boolean;
  twinkleOffset: number;
}

interface OrganicParticlesProps {
  className?: string;
}

// Soft drifting bokeh-style particles with faint constellation threads —
// an organic, minimal alternative to a rigid grid for dark sections.
export default function OrganicParticles({ className = '' }: OrganicParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const container = canvas.parentElement;
    if (!container) return;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let animationFrameId: number;
    let t = 0;

    const COUNT = 34;

    const build = () => {
      width = canvas.width = container.clientWidth;
      height = canvas.height = container.clientHeight;
      particles = Array.from({ length: COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        r: Math.random() * 1.8 + 1,
        accent: Math.random() < 0.16,
        twinkleOffset: Math.random() * Math.PI * 2,
      }));
    };
    build();

    const resizeObserver = new ResizeObserver(() => build());
    resizeObserver.observe(container);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      t += prefersReducedMotion ? 0.0015 : 0.012;

      for (const p of particles) {
        if (!prefersReducedMotion) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
          if (p.y < -10) p.y = height + 10;
          if (p.y > height + 10) p.y = -10;
        }
      }

      // Faint constellation threads between nearby particles — sparse, not a grid
      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 130) {
            ctx.strokeStyle = `rgba(234, 231, 226, ${0.05 * (1 - dist / 130)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        const twinkle = 0.5 + 0.5 * Math.sin(t * 1.4 + p.twinkleOffset);
        const alpha = p.accent ? 0.18 + twinkle * 0.22 : 0.1 + twinkle * 0.14;
        const color = p.accent ? '194, 112, 60' : '234, 231, 226';

        ctx.save();
        ctx.shadowBlur = p.accent ? 10 : 6;
        ctx.shadowColor = `rgba(${color}, ${alpha})`;
        ctx.fillStyle = `rgba(${color}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
