import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, MousePointerClick } from 'lucide-react';
import { Project } from '../types';
import TypewriterText from './timelapse/TypewriterText';

interface ProjectCardProps {
  key?: string;
  project: Project;
  onOpen: (project: Project) => void;
  step?: number;
  isTimelapseMode?: boolean;
  index?: number;
  forceMobile?: boolean;
}

const colSpan: Record<number, string> = {
  4:  'md:col-span-4',
  5:  'md:col-span-5',
  6:  'md:col-span-6',
  7:  'md:col-span-7',
  8:  'md:col-span-8',
  12: 'md:col-span-12',
};

/* ── BUILDING slot ─────────────────────────────────────── */
function BuildingCard({ project, step = 0, isTimelapseMode = false, forceMobile = false }: { project: Project; step?: number; isTimelapseMode?: boolean; forceMobile?: boolean }) {
  if (isTimelapseMode && step < 13) {
    return null; // Don't show in early steps
  }

  return (
    <motion.div
      initial={isTimelapseMode ? { scale: 0 } : { opacity: 0, y: 35 }}
      animate={isTimelapseMode ? { scale: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={isTimelapseMode ? { type: "spring", stiffness: 150, damping: 12 } : { duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden bg-[#111110] border border-white/5 rounded-none ${forceMobile ? 'w-full' : (colSpan[project.colSpanDesktop] || 'md:col-span-7')} ${forceMobile ? '' : project.marginTopDesktop || ''}`}
    >
      <div className={`w-full ${project.aspectRatio} flex flex-col items-center justify-center relative`}>
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 56px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 56px)',
          }}
        />

        {/* Shimmer light sweep loop */}
        <motion.div
          className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -skew-x-12 pointer-events-none"
          animate={{
            x: ['-100%', '100%']
          }}
          transition={{
            repeat: Infinity,
            duration: 4,
            ease: "linear"
          }}
        />

        {/* Top label */}
        <div className="absolute top-6 left-6">
          <span className="font-sans text-[9px] uppercase tracking-[0.35em] text-white/25 font-bold">
            {isTimelapseMode ? <TypewriterText text="Próxima página" speed={25} /> : 'Próxima página'}
          </span>
        </div>

        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center gap-6 select-none">
          <span className="font-serif text-5xl md:text-7xl font-black tracking-[0.18em] text-white/10 block">
            {isTimelapseMode ? <TypewriterText text="BUILDING" speed={35} /> : 'BUILDING'}
          </span>
          <div className="flex items-center gap-2.5">
            {[0, 0.4, 0.8].map((delay) => (
              <span
                key={delay}
                className="w-1.5 h-1.5 rounded-full bg-white/20"
                style={{ animation: `pulse 2s ${delay}s ease-in-out infinite` }}
              />
            ))}
          </div>
        </div>

        {/* Bottom year */}
        <div className="absolute bottom-6 right-6">
          <span className="font-sans text-[9px] uppercase tracking-[0.25em] text-white/20">
            {project.year}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Main card ─────────────────────────────────────────── */
export default function ProjectCard({ project, onOpen, step = 0, isTimelapseMode = false, index = 0, forceMobile = false }: ProjectCardProps) {
  const [hovered, setHovered] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const hintShown = useRef(false);

  // One-time hint on first card only
  useEffect(() => {
    if (index !== 0 || hintShown.current || isTimelapseMode) return;
    const timer = setTimeout(() => {
      hintShown.current = true;
      setShowHint(true);
      setTimeout(() => setShowHint(false), 2400);
    }, 1200);
    return () => clearTimeout(timer);
  }, [index, isTimelapseMode]);

  if (project.isBuilding) return <BuildingCard project={project} step={step} isTimelapseMode={isTimelapseMode} forceMobile={forceMobile} />;

  // Timelapse rendering constraints:
  if (isTimelapseMode) {
    if (index === 0) { // Robot Energy & Peace
      if (step < 8) return null;
    } else if (index === 1) { // Madre Superiora
      if (step < 11) return null;
    } else if (index === 2) { // AutoTietz
      if (step < 12) return null;
    } else { // All other projects
      if (step < 13) return null;
    }
  }

  // Draw the top hairline border sequentially
  const isLineDrawn = !isTimelapseMode || (index === 0 && step >= 8) || (index === 1 && step >= 11) || (index >= 2 && step >= 12);

  const indexLabel = String(index + 1).padStart(2, '0');

  return (
    <motion.div
      initial={isTimelapseMode ? { y: 35, opacity: 0 } : {}}
      animate={isTimelapseMode ? { y: 0, opacity: 1 } : {}}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`relative group flex flex-col transition-all duration-500 cursor-none ${forceMobile ? 'w-full' : (colSpan[project.colSpanDesktop] || 'md:col-span-4')} ${forceMobile ? '' : project.marginTopDesktop || ''}`}
      onClick={() => !isTimelapseMode && onOpen(project)}
      onMouseEnter={() => !isTimelapseMode && setHovered(true)}
      onMouseLeave={() => !isTimelapseMode && setHovered(false)}
      data-cursor="project"
      data-cursor-text="VER"
    >
      {/* Image container with overlaid title */}
      <div className={`w-full overflow-hidden ${project.aspectRatio} relative bg-zinc-100`}>

        {/* Image */}
        <motion.div
          animate={{ scale: hovered ? 1.05 : 1 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 w-full h-full"
        >
          {isTimelapseMode ? (
            index === 0 ? (
              step >= 9 ? (
                <motion.img
                  initial={{ clipPath: 'circle(0% at 50% 50%)' }}
                  animate={{ clipPath: 'circle(70% at 50% 50%)' }}
                  transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                  src={project.imageUrl} alt={project.title} loading="lazy" decoding="async"
                  className="img-scroll absolute top-0 left-0 w-full h-[135%] object-cover object-top"
                />
              ) : null
            ) : (
              (index === 1 && step >= 11) || (index >= 2 && step >= 12) ? (
                <motion.img
                  initial={{ clipPath: 'inset(100% 0 0 0)' }}
                  animate={{ clipPath: 'inset(0% 0 0 0)' }}
                  transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
                  src={project.imageUrl} alt={project.title} loading="lazy" decoding="async"
                  className="img-scroll absolute top-0 left-0 w-full h-[135%] object-cover object-top"
                />
              ) : null
            )
          ) : (
            <img
              src={project.imageUrl} alt={project.title}
              referrerPolicy="no-referrer" loading="lazy" decoding="async"
              className="img-scroll absolute top-0 left-0 w-full h-[135%] object-cover object-top"
            />
          )}
        </motion.div>

        {/* Dark gradient at bottom for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

        {/* Top row: index number + category */}
        <div className="absolute top-0 left-0 right-0 flex justify-between items-start p-4 md:p-5">
          <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold">
            {isTimelapseMode ? <TypewriterText text={project.category} speed={10} /> : project.category}
          </span>
          {project.isDemo && (
            <span className="font-sans text-[9px] uppercase tracking-[0.25em] text-white/50 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
              DEMO
            </span>
          )}
        </div>

        {/* Large ghost index number — top-right editorial accent */}
        <span className="absolute top-3 right-4 font-serif text-[4.5rem] md:text-[6rem] font-black leading-none text-white/[0.06] select-none pointer-events-none">
          {indexLabel}
        </span>

        {/* One-time click hint — first card only */}
        <AnimatePresence>
          {showHint && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-4 left-4 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 pointer-events-none"
            >
              <MousePointerClick size={11} className="text-zinc-700" />
              <span className="font-sans text-[9px] uppercase tracking-[0.22em] font-bold text-zinc-700">
                Haz clic para explorar
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom: title + red rule + arrow */}
        {isLineDrawn && (
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
            {/* Red accent rule */}
            <motion.div
              animate={{ width: hovered ? '2.5rem' : '1rem' }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="h-[2px] bg-red-600 mb-3"
            />
            <div className="flex items-end justify-between gap-4">
              <h3 className="font-serif text-2xl md:text-3xl font-normal text-white leading-tight group-hover:italic transition-all duration-500">
                {isTimelapseMode ? <TypewriterText text={project.title} speed={15} /> : project.title}
              </h3>
              <motion.div
                animate={{ x: hovered ? 4 : 0, opacity: hovered ? 1 : 0.4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="shrink-0 mb-1"
              >
                <ArrowRight size={16} className="text-white" />
              </motion.div>
            </div>
          </div>
        )}
      </div>

      {/* Below-image metadata strip */}
      {isLineDrawn && (
        <div className="flex justify-between items-start pt-3 border-t border-black/10 gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <p className="font-sans text-[11px] text-zinc-500 leading-relaxed line-clamp-1">
              {isTimelapseMode ? <TypewriterText text={project.description} speed={8} /> : project.description}
            </p>
            <span className="font-sans text-[10px] text-zinc-400 tracking-widest">
              {project.year}
            </span>
          </div>
          <motion.span
            animate={{ opacity: hovered ? 1 : 0.3, x: hovered ? 0 : 3 }}
            transition={{ duration: 0.3 }}
            className="font-sans text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-semibold flex items-center gap-1 shrink-0 pt-0.5"
          >
            Ver caso <ArrowRight size={9} />
          </motion.span>
        </div>
      )}
    </motion.div>
  );
}
