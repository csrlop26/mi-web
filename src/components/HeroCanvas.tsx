import { useEffect, useRef } from 'react';

interface Node {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  // current displacement, lerped toward the target each frame for a fluid,
  // inertial feel instead of snapping straight to the computed position
  dispX: number;
  dispY: number;
  col: number;
  row: number;
}

function smoothstep(edge0: number, edge1: number, v: number) {
  const t = Math.min(1, Math.max(0, (v - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, targetX: -1000, targetY: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationFrameId: number;
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    // How much smaller everything (wave amplitude, interaction radius, node
    // spacing feel) should read compared to the 1440px desktop baseline —
    // without this, a mobile canvas at the same absolute pixel values reads
    // as a huge, "zoomed in" tangle instead of a subtle mesh.
    let motionScale = 1;

    const applyCanvasSize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      // Render at the screen's real pixel density so the mesh stays crisp
      // on high-DPI phones instead of upscaling a blurry low-res canvas.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      motionScale = Math.max(0.42, Math.min(1, width / 1440));
    };

    // ─── Build a wave mesh: a grid of nodes connected to their neighbors.
    // Fewer nodes on small screens — keeps it readable instead of a tangle,
    // and lighter on mobile GPUs ───
    let nodes: Node[] = [];
    let grid: (Node | undefined)[][] = [];

    const buildNodes = () => {
      const isSmall = width < 640;
      const isMedium = width >= 640 && width < 1024;
      const COLS = isSmall ? 12 : isMedium ? 18 : 26;
      const ROWS = isSmall ? 9 : isMedium ? 11 : 14;

      nodes = [];
      grid = Array.from({ length: ROWS }, () => Array(COLS).fill(undefined));
      const spacingX = width / (COLS - 1);
      const spacingY = height / (ROWS - 1);
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const x = col * spacingX;
          const y = row * spacingY;
          const node: Node = { baseX: x, baseY: y, x, y, dispX: 0, dispY: 0, col, row };
          nodes.push(node);
          grid[row][col] = node;
        }
      }
    };
    applyCanvasSize();
    buildNodes();

    const handleResize = () => {
      if (!canvas) return;
      applyCanvasSize();
      buildNodes();
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.targetX = e.clientX - rect.left;
      mouseRef.current.targetY = e.clientY - rect.top;
    };
    const handleMouseLeave = () => {
      mouseRef.current.targetX = -1000;
      mouseRef.current.targetY = -1000;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    let t = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      t += prefersReducedMotion ? 0.001 : 0.0055;

      // ─── Update node positions: layered sine waves, lerped toward target
      // displacement each frame so motion glides instead of snapping ───
      for (const n of nodes) {
        const wave =
          (Math.sin(n.col * 0.42 + t * 1.6) * 12 +
            Math.sin(n.row * 0.7 + t * 1.05) * 9 +
            Math.sin((n.col + n.row) * 0.3 + t * 0.85) * 7) *
          motionScale;

        let targetDispX = 0;
        let targetDispY = wave;

        const dx = n.baseX - mouse.x;
        const dy = n.baseY + wave - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 150 * motionScale;
        if (dist < maxDist) {
          const ratio = smoothstep(0, maxDist, maxDist - dist);
          targetDispX += (dx / (dist || 1)) * ratio * 26 * motionScale;
          targetDispY += (dy / (dist || 1)) * ratio * 26 * motionScale;
        }

        // Critically-damped glide toward the target displacement
        n.dispX += (targetDispX - n.dispX) * 0.1;
        n.dispY += (targetDispY - n.dispY) * 0.1;
        n.x = n.baseX + n.dispX;
        n.y = n.baseY + n.dispY;
      }

      // ─── Draw mesh lines to right + down neighbors ───
      ctx.lineWidth = 1;
      for (const n of nodes) {
        const right = grid[n.row]?.[n.col + 1];
        const down = grid[n.row + 1]?.[n.col];
        const distToMouse = Math.hypot(n.x - mouse.x, n.y - mouse.y);
        const proximity = smoothstep(220 * motionScale, 0, distToMouse);
        const alpha = 0.045 + proximity * 0.16;

        ctx.strokeStyle = `rgba(10, 10, 9, ${alpha})`;
        if (right) {
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(right.x, right.y);
          ctx.stroke();
        }
        if (down) {
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(down.x, down.y);
          ctx.stroke();
        }
      }

      // ─── Draw nodes ───
      for (const n of nodes) {
        const distToMouse = Math.hypot(n.x - mouse.x, n.y - mouse.y);
        const proximity = smoothstep(220 * motionScale, 0, distToMouse);
        const r = 1.1 + proximity * 1.4;
        const orange = proximity > 0.05;
        ctx.fillStyle = orange
          ? `rgba(194, 112, 60, ${0.15 + proximity * 0.5})`
          : 'rgba(10, 10, 9, 0.13)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
