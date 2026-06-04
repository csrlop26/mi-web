import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Calendar, User, Globe, ArrowUpRight, ExternalLink, X } from 'lucide-react';
import { Project } from '../types';

interface ProjectModalProps {
  project: Project | null;
  onClose: () => void;
}

export default function ProjectModal({ project, onClose }: ProjectModalProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (project) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [project]);

  return (
    <AnimatePresence>
      {project && (
        <div className="fixed inset-0 z-50 flex items-end md:items-stretch justify-center md:justify-end overflow-hidden">

          {/* Backdrop — desktop only */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-[#1a1a1a]/55 backdrop-blur-sm md:block hidden"
            onClick={onClose}
          />
          {/* Mobile tap-outside */}
          {isMobile && (
            <div className="absolute inset-0" onClick={onClose} />
          )}

          {/* Sheet */}
          <motion.div
            initial={isMobile ? { y: '100%' } : { x: '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: '100%' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className={
              isMobile
                ? 'relative w-full bg-[#FDFCFB] flex flex-col z-10 shadow-2xl'
                : 'relative w-full md:w-[650px] lg:w-[800px] h-full bg-[#FDFCFB] border-l border-black/10 shadow-2xl flex flex-col z-10'
            }
            style={isMobile ? { height: '100dvh' } : undefined}
            onClick={(e) => e.stopPropagation()}
          >

            {/* ── MOBILE HEADER ── */}
            {isMobile && (
              <div className="flex items-center justify-between px-5 pt-[env(safe-area-inset-top,16px)] pb-3 pt-safe border-b border-black/8 bg-[#FDFCFB] flex-shrink-0 z-20"
                style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)' }}
              >
                <motion.button
                  onClick={onClose}
                  whileTap={{ scale: 0.93 }}
                  className="flex items-center gap-2 text-[#1a1a1a]"
                >
                  <ArrowLeft size={18} />
                  <span className="font-sans text-[10px] uppercase tracking-[0.2em] font-bold">Volver</span>
                </motion.button>

                <span className="font-sans text-[10px] uppercase tracking-[0.18em] font-bold text-[#1a1a1a] truncate max-w-[40vw] text-center">
                  {project.title}
                </span>

                <div className="flex items-center gap-2">
                  {project.url && (
                    <motion.a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileTap={{ scale: 0.93 }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 bg-black/6 border border-black/10 px-2.5 py-1.5"
                    >
                      <span className="font-sans text-[9px] uppercase tracking-[0.18em] font-bold">Web</span>
                      <ExternalLink size={10} />
                    </motion.a>
                  )}
                  <motion.button
                    onClick={onClose}
                    whileTap={{ scale: 0.93 }}
                    className="w-8 h-8 flex items-center justify-center bg-black/5"
                  >
                    <X size={15} />
                  </motion.button>
                </div>
              </div>
            )}

            {/* ── DESKTOP HEADER ── */}
            {!isMobile && (
              <div className="flex justify-between items-center gap-2 px-8 py-5 border-b border-black/10 flex-shrink-0 bg-[#FDFCFB] z-20">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#1a1a1a] font-bold truncate">
                    {project.title}
                  </span>
                  {project.isDemo && (
                    <span className="font-sans text-[9px] uppercase tracking-[0.2em] text-zinc-500 border border-black/15 px-2 py-1 flex items-center gap-1.5 flex-shrink-0">
                      <span className="w-1 h-1 rounded-full bg-zinc-400 animate-pulse" />
                      Demo
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {project.url && (
                    <motion.a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-1.5 font-sans text-[10px] uppercase tracking-[0.18em] font-bold text-[#1a1a1a] bg-black/5 border border-black/10 px-3 py-2 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>Visitar Sitio</span>
                      <ExternalLink size={11} />
                    </motion.a>
                  )}
                  <motion.button
                    onClick={onClose}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-black transition-all"
                    aria-label="Cerrar"
                  >
                    <X size={16} />
                  </motion.button>
                </div>
              </div>
            )}

            {/* ── SCROLLABLE CONTENT ── */}
            <div className="flex-1 overflow-y-auto">
              <div className={isMobile ? 'p-5 space-y-8 pb-12' : 'p-12 space-y-12'}>

                {/* Cover image — smaller on mobile */}
                <div className={`w-full overflow-hidden relative bg-zinc-100 ${isMobile ? 'aspect-[16/7]' : 'aspect-[16/10]'}`}>
                  <motion.img
                    key={project.id}
                    src={project.imageUrl}
                    alt={project.title}
                    referrerPolicy="no-referrer"
                    decoding="async"
                    animate={{ y: ['0%', '-20%'] }}
                    transition={{ duration: 18, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '130%', objectFit: 'cover', objectPosition: 'top center' }}
                  />
                </div>

                {/* Title */}
                <div className="space-y-4">
                  <h2 className={`font-serif font-black italic tracking-tight text-[#1a1a1a] ${isMobile ? 'text-3xl' : 'text-4xl md:text-5xl'}`}>
                    {project.title}
                  </h2>
                  <p className={`font-serif font-light text-zinc-600 leading-relaxed italic ${isMobile ? 'text-base' : 'text-lg'}`}>
                    {project.description}
                  </p>
                </div>

                {/* Metadata grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-5 bg-[#F4F2EE] border border-black/5">
                  <div className="space-y-1">
                    <span className="flex items-center gap-2 text-[10px] font-sans uppercase tracking-widest text-zinc-500">
                      <User size={11} /> Cliente
                    </span>
                    <p className="font-sans text-sm font-semibold text-zinc-800">{project.client}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="flex items-center gap-2 text-[10px] font-sans uppercase tracking-widest text-zinc-500">
                      <Calendar size={11} /> Año
                    </span>
                    <p className="font-sans text-sm font-semibold text-zinc-800">{project.year}</p>
                  </div>
                  <div className="space-y-1 col-span-2 md:col-span-1">
                    <span className="flex items-center gap-2 text-[10px] font-sans uppercase tracking-widest text-zinc-500">
                      <Globe size={11} /> Sitio
                    </span>
                    {project.url ? (
                      <a href={project.url} target="_blank" rel="noopener noreferrer"
                        className="font-sans text-sm font-semibold text-zinc-800 hover:text-black underline underline-offset-2 transition-colors flex items-center gap-1">
                        Ver sitio <ExternalLink size={11} />
                      </a>
                    ) : (
                      <p className="font-sans text-sm font-semibold text-zinc-800">España / Digital</p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-3">
                  <h4 className="font-serif text-base italic font-semibold text-[#1a1a1a]">Filosofía de Diseño</h4>
                  <p className="font-sans text-[#1a1a1a]/80 leading-[1.8] text-sm">{project.detailedDescription}</p>
                </div>

                {/* Services */}
                <div className="space-y-3">
                  <h4 className="font-serif text-base italic font-semibold text-[#1a1a1a]">Servicios & Entregables</h4>
                  <div className="flex flex-wrap gap-2">
                    {project.services.map((s, i) => (
                      <span key={i} className="font-sans text-xs text-zinc-800 bg-[#EAE7E1] border border-black/5 px-4 py-2 font-bold">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Visit CTA */}
                {project.url && (
                  <motion.a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full flex items-center justify-center gap-3 bg-[#1a1a1a] text-[#FDFCFB] py-4 font-sans text-xs uppercase tracking-[0.25em] font-bold hover:bg-zinc-800 transition-colors"
                  >
                    Visitar {project.title} <ArrowUpRight size={14} />
                  </motion.a>
                )}

                {/* Contact CTA */}
                <div className="pt-6 border-t border-black/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <h5 className="font-serif text-lg text-[#1a1a1a] font-bold">¿Interesado en algo similar?</h5>
                    <p className="font-sans text-xs text-zinc-500">Cuéntanos tu visión y lo construimos juntos.</p>
                  </div>
                  <motion.a
                    href="#contact"
                    onClick={() => { onClose(); setTimeout(() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }), 400); }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="font-sans text-xs uppercase tracking-[0.2em] bg-black/6 border border-black/15 text-[#1a1a1a] px-6 py-3 font-semibold flex items-center gap-2"
                  >
                    Iniciar Proyecto <ArrowUpRight size={14} />
                  </motion.a>
                </div>

              </div>
            </div>

            {/* ── MOBILE FLOATING BACK BUTTON ── */}
            {isMobile && (
              <motion.button
                onClick={onClose}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                whileTap={{ scale: 0.93 }}
                className="fixed bottom-6 left-5 z-50 flex items-center gap-2 bg-[#1a1a1a] text-white px-4 py-3 shadow-lg"
                style={{ bottom: 'max(env(safe-area-inset-bottom, 0px), 24px)' }}
              >
                <ArrowLeft size={14} />
                <span className="font-sans text-[9px] uppercase tracking-[0.2em] font-bold">Volver</span>
              </motion.button>
            )}

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
