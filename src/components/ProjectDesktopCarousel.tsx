import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Project } from '../types';

interface Props {
  projects: Project[];
  onOpen: (project: Project) => void;
}

const CARD_W = 560;
const CARD_ASPECT = 16 / 10; // 560 × 350

// ─── Fan positions relative to active index ──────────────────────────────────
// Each card fans out from a shared bottom-center anchor (transformOrigin 50% 90%)
// giving a "card deck spread on a table" feel.
interface FanPos {
  x: number;
  rotate: number;
  scale: number;
  opacity: number;
  zIndex: number;
}

function getFanPos(offset: number): FanPos | null {
  const abs = Math.abs(offset);
  if (abs > 2) return null;
  const sign = offset < 0 ? -1 : offset > 0 ? 1 : 0;
  switch (abs) {
    case 0:
      return { x: 0,            rotate: 0,          scale: 1,    opacity: 1,    zIndex: 30 };
    case 1:
      return { x: sign * 305,   rotate: sign * 5.5, scale: 0.87, opacity: 0.58, zIndex: 20 };
    case 2:
      return { x: sign * 510,   rotate: sign * 10,  scale: 0.74, opacity: 0.28, zIndex: 10 };
    default:
      return null;
  }
}

export default function ProjectDesktopCarousel({ projects, onOpen }: Props) {
  const visible = projects.filter((p) => !p.isBuilding);
  const total = visible.length;

  const [active, setActive] = useState(0);
  const [hoveredActive, setHoveredActive] = useState(false);

  // ─── Drag / swipe tracking ────────────────────────────────────────────────
  const dragStartX = useRef<number | null>(null);
  const dragStartT = useRef<number>(0);
  const lastX      = useRef<number>(0);
  const hasDragged = useRef(false);  // stays true until onClick consumes it

  const goTo = useCallback(
    (i: number) => setActive(Math.max(0, Math.min(i, total - 1))),
    [total]
  );

  // Keyboard navigation
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goTo(active + 1);
      if (e.key === 'ArrowLeft')  goTo(active - 1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [active, goTo]);

  // ── Pointer drag — NO setPointerCapture so click still fires on cards ──
  const onPointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    lastX.current      = e.clientX;
    dragStartT.current = Date.now();
    hasDragged.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    lastX.current = e.clientX;
    if (dragStartX.current !== null && Math.abs(e.clientX - dragStartX.current) > 8) {
      hasDragged.current = true;
    }
  };
  const finishDrag = (clientX: number) => {
    if (dragStartX.current === null) return;
    const delta   = clientX - dragStartX.current;
    const elapsed = Date.now() - dragStartT.current;
    const vel     = Math.abs(delta) / Math.max(elapsed, 1);
    if (hasDragged.current && (Math.abs(delta) > 55 || vel > 0.5)) {
      goTo(delta < 0 ? active + 1 : active - 1);
    }
    dragStartX.current = null;
    // hasDragged stays true → onClick will consume and clear it
  };
  const onPointerUp    = (e: React.PointerEvent) => finishDrag(e.clientX);
  const cancelDrag     = () => { finishDrag(lastX.current); hasDragged.current = false; };

  const canPrev = active > 0;
  const canNext = active < total - 1;
  const CARD_H  = CARD_W / CARD_ASPECT; // ≈ 350

  return (
    <div className="relative w-full select-none">

      {/* ── Stage ──────────────────────────────────────────────────────────── */}
      {/* overflow:visible so peek cards show; outer section clips at viewport */}
      <div
        className="relative flex items-center justify-center"
        style={{ height: CARD_H + 48 }} /* 48px headroom for lift + shadow */
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={cancelDrag}
        onPointerCancel={cancelDrag}
      >
        {visible.map((project, i) => {
          const pos = getFanPos(i - active);
          if (!pos) return null;
          const isActive = i === active;

          return (
            <motion.div
              key={project.id}
              /* Centre each card at x=0 so Framer's x is a true offset from stage centre */
              className="absolute cursor-none"
              style={{
                width: CARD_W,
                left: '50%',
                marginLeft: -(CARD_W / 2),
                /* Rotation pivots from bottom-centre → fan spread */
                transformOrigin: '50% 90%',
              }}
              animate={{
                x:       pos.x,
                rotate:  pos.rotate,
                scale:   pos.scale,
                opacity: pos.opacity,
                zIndex:  pos.zIndex,
                y:       hoveredActive && isActive ? -10 : 0,
              }}
              transition={{ type: 'spring', stiffness: 290, damping: 38, mass: 0.85 }}
              onMouseEnter={() => isActive && setHoveredActive(true)}
              onMouseLeave={() => setHoveredActive(false)}
              onClick={() => {
                // Drag just ended — swallow click and reset so next tap works
                if (hasDragged.current) { hasDragged.current = false; return; }
                isActive ? onOpen(project) : goTo(i);
              }}
              data-cursor={isActive ? 'project' : undefined}
            >
              {/* ── Card face ──────────────────────────────────────────────── */}
              <div
                className="relative overflow-hidden bg-zinc-950"
                style={{ aspectRatio: `${CARD_ASPECT}` }}
              >
                <motion.img
                  src={project.imageUrl}
                  alt={project.title}
                  draggable={false}
                  decoding="async"
                  className="absolute left-0 top-0 w-full pointer-events-none"
                  style={{ height: 'auto', minHeight: '100%' }}
                  animate={{
                    // Smooth scroll: top → scroll down → back to top
                    y: isActive ? [0, -310, 0] : 0,
                  }}
                  transition={
                    isActive
                      ? {
                          y: {
                            duration: 11,
                            times: [0, 0.87, 1],          // slow going down, quick reset
                            ease: 'easeInOut',
                            repeat: Infinity,
                            repeatDelay: 1.5,
                          },
                        }
                      : { y: { duration: 0.6 } }
                  }
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />

                {/* Ghost serif index */}
                <span className="absolute top-3 right-5 font-serif text-[7rem] font-black leading-none text-white/[0.05] pointer-events-none select-none">
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* ── Top meta ─────────────────────────────────────────────── */}
                <div className="absolute top-5 left-5 right-5 flex items-start justify-between">
                  <span className="font-sans text-[10px] uppercase tracking-[0.28em] text-white/50 font-medium">
                    {project.category}
                  </span>
                  {project.isDemo && (
                    <span className="flex items-center gap-1.5 font-sans text-[9px] uppercase tracking-[0.18em] text-white/35">
                      <span className="w-[5px] h-[5px] rounded-full bg-white/30 animate-pulse" />
                      DEMO
                    </span>
                  )}
                </div>

                {/* ── Bottom content ───────────────────────────────────────── */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  {/* Red accent rule — expands on hover */}
                  <motion.div
                    animate={{ width: hoveredActive && isActive ? '2.75rem' : '0.9rem' }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    className="h-[2px] bg-red-600 mb-3"
                  />

                  <div className="flex items-end justify-between gap-4">
                    <h3 className="font-serif text-[1.65rem] font-normal text-white leading-tight max-w-[260px]">
                      {project.title}
                    </h3>
                    <span className="font-sans text-[10px] text-white/30 tracking-widest shrink-0 mb-0.5">
                      {project.year}
                    </span>
                  </div>

                  <p className="font-sans text-[11px] text-white/45 mt-1.5 leading-relaxed line-clamp-1">
                    {project.description}
                  </p>

                  {/* "Ver caso" affordance — only on active */}
                  <motion.p
                    animate={{ opacity: isActive ? (hoveredActive ? 1 : 0.35) : 0, y: isActive ? 0 : 6 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="mt-4 font-sans text-[10px] uppercase tracking-[0.24em] text-white/75 pointer-events-none"
                  >
                    Ver caso →
                  </motion.p>
                </div>

                {/* Subtle inner shadow to lift card from background */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
                  }}
                />
              </div>

              {/* Drop shadow — stronger on active card */}
              <motion.div
                className="absolute inset-0 -z-10 rounded-sm"
                animate={{
                  boxShadow: isActive
                    ? '0 32px 80px rgba(0,0,0,0.38), 0 8px 24px rgba(0,0,0,0.22)'
                    : '0 12px 30px rgba(0,0,0,0.18)',
                }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                style={{ transform: 'translateY(4px)' }}
              />
            </motion.div>
          );
        })}
      </div>

      {/* ── Controls row ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-10 px-1">

        {/* Prev / Next buttons */}
        <div className="flex gap-2.5">
          {[
            { dir: -1, icon: <ArrowLeft size={15} />, can: canPrev },
            { dir:  1, icon: <ArrowRight size={15} />, can: canNext },
          ].map(({ dir, icon, can }) => (
            <motion.button
              key={dir}
              onClick={() => goTo(active + dir)}
              disabled={!can}
              whileHover={can ? { scale: 1.06, y: -1 } : {}}
              whileTap={can ? { scale: 0.94 } : {}}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              className={`w-11 h-11 flex items-center justify-center border transition-colors duration-200 ${
                can
                  ? 'border-black/20 text-black hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A]'
                  : 'border-black/8 text-black/18 cursor-default'
              }`}
            >
              {icon}
            </motion.button>
          ))}
        </div>

        {/* Counter */}
        <span className="font-sans text-[11px] tracking-widest text-zinc-400">
          <span className="text-zinc-900 font-semibold tabular-nums">
            {String(active + 1).padStart(2, '0')}
          </span>
          {' / '}
          {String(total).padStart(2, '0')}
        </span>

        {/* Dot indicators */}
        <div className="flex items-center gap-2">
          {visible.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => goTo(i)}
              className="h-[2px] rounded-full"
              animate={{
                width: i === active ? 20 : 4,
                backgroundColor: i === active ? '#1A1A1A' : '#D4D4D8',
              }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
