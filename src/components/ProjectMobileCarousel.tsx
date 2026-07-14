import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hand } from 'lucide-react';
import { Project } from '../types';

interface Props {
  projects: Project[];
  onOpen: (project: Project) => void;
}

const AUTOPLAY_MS = 3800;
const CARD_ASPECT = 3 / 4; // portrait — better for mobile

// ─── Fan positions (mobile-tuned) ────────────────────────────────────────────
// Rotation pivots from bottom-center (transformOrigin '50% 90%')
interface FanPos {
  x: number;
  rotate: number;
  scale: number;
  opacity: number;
  zIndex: number;
}

function getFanPos(offset: number, cardW: number): FanPos | null {
  const abs = Math.abs(offset);
  if (abs > 2) return null;
  const sign = offset < 0 ? -1 : offset > 0 ? 1 : 0;
  switch (abs) {
    case 0:
      return { x: 0,                   rotate: 0,          scale: 1,    opacity: 1,    zIndex: 30 };
    case 1:
      return { x: sign * cardW * 0.68, rotate: sign * 6,   scale: 0.84, opacity: 0.52, zIndex: 20 };
    case 2:
      return { x: sign * cardW * 1.10, rotate: sign * 11,  scale: 0.70, opacity: 0.22, zIndex: 10 };
    default:
      return null;
  }
}

export default function ProjectMobileCarousel({ projects, onOpen }: Props) {
  const visible = projects.filter((p) => !p.isBuilding);
  const total = visible.length;

  const [active, setActive]           = useState(0);
  const [cardW, setCardW]             = useState(0);
  const [progressKey, setProgressKey] = useState(0);
  const [showHint, setShowHint]       = useState(false);

  const hintShown    = useRef(false);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartX   = useRef<number | null>(null);
  const dragStartT   = useRef<number>(0);
  const hasDragged   = useRef(false);
  const isPaused     = useRef(false);   // paused during / just after drag

  // ─── Card width = 82% of viewport, max 320px ─────────────────────────────
  useEffect(() => {
    const update = () => setCardW(Math.min(window.innerWidth * 0.82, 320));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const goTo = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(i, total - 1));
      setActive(clamped);
      setProgressKey((k) => k + 1);
    },
    [total]
  );

  // ─── Autoplay ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (cardW === 0) return;
    timerRef.current = setTimeout(() => {
      if (!isPaused.current) goTo((active + 1) % total);
    }, AUTOPLAY_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [active, cardW, goTo, total]);

  // ─── One-time tap hint ────────────────────────────────────────────────────
  useEffect(() => {
    if (cardW > 0 && !hintShown.current) {
      hintShown.current = true;
      const t = setTimeout(() => {
        setShowHint(true);
        setTimeout(() => setShowHint(false), 2400);
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [cardW]);

  // ─── Drag / swipe handlers ────────────────────────────────────────────────
  // ── Pointer drag — NO setPointerCapture so click still fires on cards ──
  const lastX = useRef<number>(0);

  const onPointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    lastX.current      = e.clientX;
    dragStartT.current = Date.now();
    hasDragged.current = false;
    isPaused.current   = true;
    if (timerRef.current) clearTimeout(timerRef.current);
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
    if (hasDragged.current && (Math.abs(delta) > 45 || vel > 0.45)) {
      goTo(delta < 0 ? active + 1 : active - 1);
    }
    dragStartX.current = null;
    // hasDragged stays true → onClick will consume and reset it
    setTimeout(() => { isPaused.current = false; }, 300);
  };

  const onPointerUp  = (e: React.PointerEvent) => finishDrag(e.clientX);
  const cancelDrag   = () => { finishDrag(lastX.current); };

  if (cardW === 0) return null;

  const cardH = cardW / CARD_ASPECT; // portrait height

  return (
    <div className="relative select-none -mx-4 sm:-mx-6 px-4 sm:px-6">

      {/* ── Stage ──────────────────────────────────────────────────────────── */}
      <div
        className="relative flex items-center justify-center"
        style={{ height: cardH + 32 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={cancelDrag}
        onPointerCancel={cancelDrag}
      >
        {visible.map((project, i) => {
          const pos = getFanPos(i - active, cardW);
          if (!pos) return null;
          const isActive = i === active;

          return (
            <motion.div
              key={project.id}
              className="absolute"
              style={{
                width: cardW,
                left: '50%',
                marginLeft: -(cardW / 2),
                transformOrigin: '50% 90%',
                touchAction: 'none',
              }}
              animate={{
                x:       pos.x,
                rotate:  pos.rotate,
                scale:   pos.scale,
                opacity: pos.opacity,
                zIndex:  pos.zIndex,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 40, mass: 0.8 }}
              onClick={() => {
                // Drag just ended — swallow click and reset so next tap works
                if (hasDragged.current) { hasDragged.current = false; return; }
                if (isActive) onOpen(project);
                else goTo(i);
              }}
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
                  style={{ height: 'auto', minHeight: '100%', willChange: 'transform' }}
                  animate={{
                    y: isActive ? [0, -220, 0] : 0,
                  }}
                  transition={
                    isActive
                      ? {
                          y: {
                            duration: 10,
                            times: [0, 0.87, 1],
                            ease: 'easeInOut',
                            repeat: Infinity,
                            repeatDelay: 1.2,
                          },
                        }
                      : { y: { duration: 0.5 } }
                  }
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />

                {/* Ghost index */}
                <span className="absolute top-2 right-3 font-serif text-[5.5rem] font-black leading-none text-white/[0.05] pointer-events-none select-none">
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* One-time tap hint */}
                {i === 0 && (
                  <AnimatePresence>
                    {showHint && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute top-14 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 pointer-events-none"
                      >
                        <Hand size={11} className="text-zinc-700" />
                        <span className="font-sans text-[9px] uppercase tracking-[0.22em] font-bold text-zinc-700 whitespace-nowrap">
                          Desliza para explorar
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}

                {/* ── Top meta ─────────────────────────────────────────────── */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                  <span className="font-sans text-[9px] uppercase tracking-[0.28em] text-white/50 font-medium">
                    {project.category}
                  </span>
                  {project.isDemo && (
                    <span className="flex items-center gap-1 font-sans text-[8px] uppercase tracking-[0.18em] text-white/35">
                      <span className="w-[4px] h-[4px] rounded-full bg-white/30 animate-pulse" />
                      DEMO
                    </span>
                  )}
                </div>

                {/* ── Bottom content ───────────────────────────────────────── */}
                <div className="absolute bottom-0 left-0 right-0 p-4">

                  {/* Autoplay progress bar */}
                  <div className="w-full h-[1.5px] bg-white/15 mb-3 overflow-hidden">
                    {isActive && (
                      <motion.div
                        key={progressKey}
                        className="h-full bg-red-600 origin-left"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: AUTOPLAY_MS / 1000, ease: 'linear' }}
                        style={{ transformOrigin: 'left' }}
                      />
                    )}
                  </div>

                  {/* Red accent rule */}
                  <div className="w-3 h-[2px] bg-red-600 mb-2" />

                  <div className="flex items-end justify-between gap-2">
                    <h3 className="font-serif text-2xl font-normal text-white leading-tight">
                      {project.title}
                    </h3>
                    <span className="font-sans text-[10px] text-white/30 tracking-widest shrink-0 mb-0.5">
                      {project.year}
                    </span>
                  </div>

                  <AnimatePresence mode="wait">
                    {isActive && (
                      <motion.p
                        key={project.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="font-sans text-[11px] text-white/45 mt-1.5 leading-relaxed line-clamp-2"
                      >
                        {project.description}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {/* "Toca para ver" affordance */}
                  {isActive && (
                    <p className="mt-3 font-sans text-[9px] uppercase tracking-[0.22em] text-white/40">
                      Toca para ver →
                    </p>
                  )}
                </div>

                {/* Inner border */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' }}
                />
              </div>

              {/* Drop shadow */}
              <motion.div
                className="absolute inset-0 -z-10"
                animate={{
                  boxShadow: isActive
                    ? '0 24px 60px rgba(0,0,0,0.40), 0 6px 20px rgba(0,0,0,0.24)'
                    : '0 8px 20px rgba(0,0,0,0.16)',
                }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ transform: 'translateY(4px)' }}
              />
            </motion.div>
          );
        })}
      </div>

      {/* ── Dot indicators ───────────────────────────────────────────────── */}
      <div className="flex justify-center items-center gap-2 pt-5">
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
  );
}
