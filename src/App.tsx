import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { LayoutGrid, GalleryHorizontal } from 'lucide-react';
import Navbar from './components/Navbar';
import CustomCursor from './components/CustomCursor';
import AmbientParticles from './components/AmbientParticles';
import OrganicParticles from './components/OrganicParticles';
import HeroCanvas from './components/HeroCanvas';
import HeroWave from './components/HeroWave';
import MonologButton from './components/MonologButton';
import ProjectCard from './components/ProjectCard';
import ProjectMobileCarousel from './components/ProjectMobileCarousel';
import ProjectDesktopCarousel from './components/ProjectDesktopCarousel';
import ContactSection from './components/ContactSection';
import JournalSection from './components/JournalSection';
import AbstractLoop from './components/AbstractLoop';
import Lenis from 'lenis';
import { PROJECTS } from './data';
import { Project } from './types';

// Only mounted after user interaction (click) — kept out of the initial bundle
const AboutDrawer = lazy(() => import('./components/AboutDrawer'));
const HireModal = lazy(() => import('./components/HireModal'));
const ProjectModal = lazy(() => import('./components/ProjectModal'));
const LegalModal = lazy(() => import('./components/LegalModal'));

export default function App() {
  const [activeSection, setActiveSection] = useState('home');
  const [isHireOpen, setIsHireOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [activeLegalType, setActiveLegalType] = useState<'terms' | 'privacy' | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroContentScale = useTransform(heroProgress, [0, 1], [1, shouldReduceMotion ? 1 : 0.82]);
  const heroContentOpacity = useTransform(heroProgress, [0, 1], [1, 0]);
  const heroContentY = useTransform(heroProgress, [0, 1], [0, shouldReduceMotion ? 0 : 60]);
  // Wordmark fill crossfades dark -> white across the back half of the hero
  // scroll, so it lands white right as the dark Philosophy section arrives.
  const wordmarkColor = useTransform(heroProgress, [0.45, 1], ['#0A0A09', '#EAE7E2']);

  // "Cerramos" / "Esa Brecha" converge from opposite edges as the section
  // scrolls into view, and pull back apart if the user scrolls back up.
  const philosophyRef = useRef<HTMLElement>(null);
  const { scrollYProgress: philosophyProgress } = useScroll({
    target: philosophyRef,
    offset: ['start end', 'center center'],
  });
  // Below sm, the row is stacked (flex-col) — the "converge from opposite
  // edges" metaphor only makes sense side-by-side, and any horizontal shift
  // there risks pushing text past the padding and clipping it. Disable it
  // outright on mobile instead of just shrinking it.
  const philosophyShift =
    typeof window !== 'undefined' && window.innerWidth >= 640
      ? Math.min(220, window.innerWidth * 0.28)
      : 0;
  const closesX = useTransform(philosophyProgress, [0, 1], [shouldReduceMotion ? 0 : -philosophyShift, 0]);
  const gapX = useTransform(philosophyProgress, [0, 1], [shouldReduceMotion ? 0 : philosophyShift, 0]);

  // Slow ambient zoom on the closing CTA's background loop as it scrolls through
  const ctaFooterRef = useRef<HTMLElement>(null);
  const { scrollYProgress: ctaFooterProgress } = useScroll({
    target: ctaFooterRef,
    offset: ['start end', 'end start'],
  });
  const ctaLoopScale = useTransform(ctaFooterProgress, [0, 1], [1, shouldReduceMotion ? 1 : 1.25]);
  const [hoveredService, setHoveredService] = useState<number | null>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [desktopView, setDesktopView] = useState<'editorial' | 'carousel'>('carousel');
  const [mobileView, setMobileView] = useState<'carousel' | 'editorial'>('carousel');
  const sectionOffsets = useRef<{ id: string; offset: number }[]>([]);

  // Preload project thumbnails in the background
  useEffect(() => {
    PROJECTS.forEach((project) => {
      if (project.imageUrl && !project.isBuilding) {
        const img = new Image();
        img.src = project.imageUrl;
      }
    });
  }, []);

  // Initialize Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo out
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });
    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Track scroll Y for parallax
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      lenis.destroy();
      lenisRef.current = null;
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Pause Lenis smooth scroll while any overlay is open — otherwise Lenis
  // keeps driving the page scroll underneath, ignoring the overlay's own
  // body-scroll lock, and the page visibly scrolls behind the modal.
  useEffect(() => {
    const anyOverlayOpen = Boolean(selectedProject) || isHireOpen || isAboutOpen;
    if (anyOverlayOpen) {
      lenisRef.current?.stop();
    } else {
      lenisRef.current?.start();
    }
  }, [selectedProject, isHireOpen, isAboutOpen]);

  // Scroll-spy: highlight the active nav item as the user scrolls
  useEffect(() => {
    const sections = ['philosophy', 'work', 'services', 'cta-footer', 'faq', 'contact'];

    const calculateOffsets = () => {
      const offsets: { id: string; offset: number }[] = [];
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          offsets.push({ id, offset: rect.top + scrollTop });
        }
      }
      sectionOffsets.current = offsets;
    };

    calculateOffsets();
    const timer = setTimeout(calculateOffsets, 1000);
    window.addEventListener('resize', calculateOffsets);

    const handleScroll = () => {
      const scrollPos = window.scrollY + 220;
      let currentSection = 'home';

      for (const { id, offset } of sectionOffsets.current) {
        if (scrollPos >= offset) {
          currentSection = id;
        }
      }
      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculateOffsets);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Capacidades del estudio (bloque de filosofía)
  const capabilities = [
    {
      number: 'UX / UI',
      label: 'Diseño de interfaces claras y editoriales, con layouts asimétricos que le dan personalidad a cada marca.'
    },
    {
      number: 'Frontend',
      label: 'Ingeniería a medida en React, rápida y limpia, libre de plantillas genéricas o builders pesados.'
    },
    {
      number: 'IA & Automatización',
      label: 'Integramos automatización e IA aplicada para que tu negocio gane tiempo, no solo para que se vea bien.'
    }
  ];

  // Los 4 servicios reales del estudio
  const services = [
    {
      title: 'Diseño & Desarrollo Web',
      description: 'Páginas web a medida, diseñadas y programadas desde cero. Sin plantillas genéricas, con animaciones e identidad propia.',
      preview: '/service-web.svg'
    },
    {
      title: 'Shopify & E-commerce',
      description: 'Tiendas online que venden: gestión, optimización y diseño de e-commerce en Shopify enfocado en conversión real.',
      preview: '/service-shopify.svg'
    },
    {
      title: 'Contenido Digital',
      description: 'Contenido comercial y digital pensado para tu marca: piezas visuales, copy y material que refuerza cómo te perciben.',
      preview: '/service-content.svg'
    },
    {
      title: 'Automatización & IA',
      description: 'Chatbots, automatización de tareas e IA aplicada a tu negocio. En desarrollo activo — pronto disponible.',
      tag: 'En desarrollo activo',
      preview: '/service-ai.svg'
    }
  ];

  return (
    <div className="bg-[#EAE7E2] min-h-screen text-[#0A0A09] flex flex-col relative w-full overflow-x-hidden pb-12 select-none">

      {/* Film grain overlay */}
      <AmbientParticles hidden={['home', 'philosophy', 'services'].includes(activeSection)} />

      {/* Custom cursor tracer */}
      <CustomCursor />

      {/* Top Navbar */}
      <Navbar
        onHireClick={() => setIsHireOpen(true)}
        onAboutClick={() => setIsAboutOpen(true)}
        activeSection={activeSection}
        dark={['philosophy', 'services', 'cta-footer'].includes(activeSection)}
      />

      <main className="w-full flex-1 flex flex-col z-10">

        {/* HERO SECTION */}
        <section
          ref={heroRef}
          id="home"
          className="min-h-[100svh] flex flex-col justify-between items-center pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 px-5 sm:px-6 md:px-20 relative overflow-hidden"
        >
          <div className="absolute inset-0 z-0 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1527576539890-dfa815648363?q=60&w=900&auto=format&fit=crop"
              loading="eager"
              fetchPriority="high"
              alt="Arquitectura moderna — AugustoCS, diseño web y e-commerce"
              className="w-full h-full object-cover scale-125"
              style={{
                transform: `translate3d(0, ${scrollY * 0.08}px, 0)`,
                filter: 'blur(22px) brightness(1) saturate(1.7) contrast(1.1)'
              }}
            />
            <div className="absolute inset-0 bg-[#0A0A09]/8" />
            <div
              className="absolute inset-0 opacity-[0.18] mix-blend-overlay pointer-events-none"
              style={{
                backgroundImage: 'url(\'data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="n"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23n)"/%3E%3C/svg%3E\')',
                backgroundRepeat: 'repeat'
              }}
            />
          </div>

          <HeroCanvas />
          <HeroWave />

          <div className="w-full max-w-[1440px] mx-auto flex flex-col justify-between h-full flex-1 z-10 mt-12 relative">
          <motion.div
            style={{ scale: heroContentScale, opacity: heroContentOpacity, y: heroContentY }}
            className="w-full flex flex-col"
          >
            <div className="flex flex-col items-center text-center gap-8 w-full max-w-3xl mx-auto">
              <div className="space-y-6 flex flex-col items-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: [0.9, 1, 1.04, 1] }}
                  transition={{
                    opacity: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
                    scale: { duration: 6, times: [0, 0.2, 0.6, 1], repeat: Infinity, ease: [0.45, 0, 0.55, 1] }
                  }}
                  className="w-12 h-auto"
                >
                  <img src="/logo-normal.png" alt="AugustoCS" className="w-full h-auto select-none" />
                </motion.div>

                <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] tracking-[-0.02em] leading-[1.1] font-normal text-[#1A1A1A] max-w-xl mt-6">
                  <span className="block overflow-hidden py-1">
                    <motion.span
                      initial={{ y: '110%' }}
                      animate={{ y: 0 }}
                      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                      className="block"
                    >
                      Elevamos tu <span className="text-zinc-400">marca</span>
                    </motion.span>
                  </span>
                  <span className="block overflow-hidden py-1">
                    <motion.span
                      initial={{ y: '110%' }}
                      animate={{ y: 0 }}
                      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.28 }}
                      className="block"
                    >
                      a su máxima <span className="text-zinc-400">expresión.</span>
                    </motion.span>
                  </span>
                </h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="font-sans text-[10px] sm:text-xs text-zinc-500 uppercase tracking-[0.25em] leading-relaxed font-bold"
                >
                  Diseño web, e-commerce &amp; contenido · Castellón
                </motion.p>
              </div>
            </div>
          </motion.div>

            {/* Wordmark — deliberately NOT inside the fading wrapper above:
                it stays fully visible and crossfades to white as you scroll,
                so it reads as a persistent title handing off to the next
                (dark) section instead of disappearing with the rest of hero. */}
            <div className="w-full mt-auto pt-24 relative">
              {/* Colored wave band behind the letters for contrast against the photo */}
              <div className="absolute inset-x-0 bottom-0 h-full flex items-end pointer-events-none">
                <HeroWave tone="accent" className="!h-[70%] sm:!h-[80%]" />
              </div>
              <motion.div
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="w-full relative"
              >
                <svg viewBox="0 0 900 120" xmlns="http://www.w3.org/2000/svg" fill="none" className="w-full h-auto select-none pointer-events-none">
                  <defs>
                    {/* Narrow bright band on a transparent field — a sheen, not a recolor */}
                    <motion.linearGradient
                      id="wordmarkSheen"
                      gradientUnits="objectBoundingBox"
                      y1="0" y2="0"
                      animate={shouldReduceMotion ? {} : { x1: ['-50%', '150%'], x2: ['10%', '210%'] }}
                      transition={{ duration: 9, repeat: Infinity, repeatDelay: 2, ease: [0.45, 0, 0.55, 1] }}
                    >
                      <stop offset="0%" stopColor="#EAE7E2" stopOpacity="0" />
                      <stop offset="30%" stopColor="#EAE7E2" stopOpacity="0" />
                      <stop offset="50%" stopColor="#EAE7E2" stopOpacity="0.45" />
                      <stop offset="70%" stopColor="#EAE7E2" stopOpacity="0" />
                      <stop offset="100%" stopColor="#EAE7E2" stopOpacity="0" />
                    </motion.linearGradient>
                    <clipPath id="wordmarkClip">
                      <text x="50%" y="85%" textAnchor="middle" fontFamily="'Unbounded', sans-serif" fontWeight="700" fontSize="100" textLength="820" lengthAdjust="spacingAndGlyphs">
                        AUGUSTOCS
                      </text>
                    </clipPath>
                    <filter id="wordmarkSoften" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="9" />
                    </filter>
                  </defs>

                  {/* Solid base — textLength keeps it inside the viewBox so it
                      never clips, and its fill crossfades dark -> white as
                      you scroll, so it lands as a legible title over the
                      dark section that follows instead of just fading out */}
                  <motion.text
                    x="50%" y="85%" textAnchor="middle"
                    fontFamily="'Unbounded', sans-serif" fontWeight="700" fontSize="100"
                    textLength="820" lengthAdjust="spacingAndGlyphs"
                    style={{ fill: wordmarkColor }}
                  >
                    AUGUSTOCS
                  </motion.text>

                  {/* Diffuse sheen, clipped to the letterforms so it never washes them out */}
                  <g clipPath="url(#wordmarkClip)" filter="url(#wordmarkSoften)">
                    <rect x="0" y="0" width="900" height="120" fill="url(#wordmarkSheen)" />
                  </g>
                </svg>
              </motion.div>
            </div>
          </div>
        </section>

        {/* PHILOSOPHY & CAPABILITIES SECTION */}
        <section
          ref={philosophyRef}
          id="philosophy"
          className="py-20 sm:py-24 md:py-40 bg-[#0A0A09] text-[#EAE7E2] w-[100vw] ml-[calc(50%-50vw)] px-5 sm:px-8 md:px-12 lg:px-20 border-b border-white/5 relative overflow-hidden"
        >
          <OrganicParticles />

          <div className="max-w-[1440px] mx-auto flex flex-col justify-between min-h-[60vh] relative z-10">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="font-mono text-[10px] tracking-[0.3em] text-zinc-500 uppercase block mb-12 self-start"
            >
              01 / FILOSOFÍA
            </motion.span>

            <div className="w-full flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 my-12">
              <motion.h2
                style={{ x: closesX }}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="font-serif text-4xl sm:text-6xl md:text-8xl font-light uppercase tracking-tight text-white select-none"
              >
                Cerramos
              </motion.h2>

              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-100px' }}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="w-48 sm:w-64 aspect-[4/3] overflow-hidden bg-zinc-800 border border-white/10 relative shadow-2xl"
              >
                <AbstractLoop className="w-full h-full" />
                <div className="absolute inset-0 bg-[#EAE7E2]/5 mix-blend-overlay pointer-events-none" />
              </motion.div>

              <motion.h2
                style={{ x: gapX }}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="font-serif text-4xl sm:text-6xl md:text-8xl font-light uppercase tracking-tight text-white select-none"
              >
                Esa Brecha.
              </motion.h2>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-2xl mt-12 md:self-end text-left md:text-right"
            >
              <p className="font-sans text-lg sm:text-xl text-zinc-300 font-light leading-relaxed">
                Tu sitio web es donde tus clientes ideales deciden si vales su tiempo. Tomamos lo que te hace irremplazable, diseñamos toda la experiencia en torno a ello y nos aseguramos de que lo sientan antes de leer una sola palabra.
              </p>
            </motion.div>

            {/* 3-Column Capabilities Grid — staggered reveal */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-12 mt-24 pt-16 border-t border-white/10">
              {capabilities.map((pillar, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false, margin: '-80px' }}
                  transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4"
                >
                  <span className="font-sans text-[#EAE7E2]/40 text-[10px] tracking-widest block">/ 0{index + 1}</span>
                  <h3 className="font-serif text-3xl sm:text-4xl font-light text-white tracking-tight">
                    {pillar.number}
                  </h3>
                  <p className="font-sans text-xs text-zinc-400 leading-relaxed">
                    {pillar.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* PROJECTS ASYMMETRIC GRID GALLERY */}
        <section id="work" className="py-20 sm:py-24 md:py-40 max-w-[1440px] mx-auto px-5 sm:px-8 md:px-12 lg:px-20 w-full">
          <div className="flex flex-col mb-16 md:mb-20 font-sans">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="w-full flex items-center justify-between border-b border-black/10 pb-4 mb-4"
            >
              <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-semibold">
                Edición 01
              </span>
              <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-semibold">
                Archivo Selectivo
              </span>
            </motion.div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-4">
              <motion.h2
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '0px' }}
                transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
                className="font-serif text-5xl md:text-7xl font-normal tracking-tight text-[#1A1A1A]"
              >
                Obras <span className="text-zinc-400">Escogidas</span>
              </motion.h2>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="hidden md:flex items-center gap-1 border border-black/12 p-1"
              >
                <button
                  onClick={() => setDesktopView('editorial')}
                  className={`flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-semibold transition-all duration-300 ${
                    desktopView === 'editorial' ? 'bg-[#1A1A1A] text-white' : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <LayoutGrid size={12} /> Editorial
                </button>
                <button
                  onClick={() => setDesktopView('carousel')}
                  className={`flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-semibold transition-all duration-300 ${
                    desktopView === 'carousel' ? 'bg-[#1A1A1A] text-white' : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <GalleryHorizontal size={12} /> Carrusel
                </button>
              </motion.div>
            </div>
          </div>

          {/* Mobile view toggle */}
          <div className="md:hidden flex items-center gap-1 border border-black/12 p-1 w-fit mb-8">
            <button
              onClick={() => setMobileView('carousel')}
              className={`flex items-center gap-1.5 px-3 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-semibold transition-all duration-300 ${
                mobileView === 'carousel' ? 'bg-[#1A1A1A] text-white' : 'text-zinc-500'
              }`}
            >
              <GalleryHorizontal size={11} /> Carrusel
            </button>
            <button
              onClick={() => setMobileView('editorial')}
              className={`flex items-center gap-1.5 px-3 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-semibold transition-all duration-300 ${
                mobileView === 'editorial' ? 'bg-[#1A1A1A] text-white' : 'text-zinc-500'
              }`}
            >
              <LayoutGrid size={11} /> Editorial
            </button>
          </div>

          {/* Mobile project view */}
          <div className="md:hidden">
            <AnimatePresence mode="wait">
              {mobileView === 'carousel' ? (
                <motion.div
                  key="mob-carousel"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ProjectMobileCarousel
                    projects={PROJECTS}
                    onOpen={(p) => setSelectedProject(p)}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="mob-editorial"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col gap-10"
                >
                  {PROJECTS.filter(p => !p.isBuilding).map((project, index) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onOpen={(p) => setSelectedProject(p)}
                      index={index}
                      forceMobile
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop project view */}
          <div className="hidden md:block">
            <AnimatePresence mode="wait">
              {desktopView === 'editorial' ? (
                <motion.div
                  key="editorial"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="grid grid-cols-12 gap-x-8 lg:gap-x-12 gap-y-24 items-start"
                >
                  {PROJECTS.map((project, index) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onOpen={(p) => setSelectedProject(p)}
                      index={index}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="carousel"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ProjectDesktopCarousel
                    projects={PROJECTS}
                    onOpen={(p) => setSelectedProject(p)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* SERVICES SECTION */}
        <section
          id="services"
          className="py-20 sm:py-24 md:py-48 bg-[#0A0A09] text-[#EAE7E2] w-[100vw] ml-[calc(50%-50vw)] px-5 sm:px-8 md:px-12 lg:px-20 border-t border-white/5 relative"
        >
          <OrganicParticles />
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-start relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 space-y-12"
            >
              <span className="font-mono text-[10px] tracking-[0.3em] text-zinc-500 uppercase block">
                (CÓMO TRABAJAMOS)
              </span>

              <h2 className="font-serif text-4xl sm:text-5xl font-light text-white tracking-tight leading-tight">
                Cuatro formas de ayudarte a crecer online.
              </h2>

              <p className="font-sans text-sm sm:text-base text-zinc-400 font-light leading-relaxed max-w-md">
                Desde la primera línea de código hasta la última pieza de contenido, cubrimos toda tu presencia digital. Sin subcontratar, sin intermediarios: trabajas directamente conmigo en cada etapa del proyecto.
              </p>
            </motion.div>

            <div className="lg:col-span-7 space-y-12 relative">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="font-sans text-[10px] uppercase tracking-[0.25em] text-zinc-400 font-bold block">
                  EN QUÉ TE PODEMOS AYUDAR
                </span>
              </div>

              <div className="relative">
                <div className="flex flex-col border-t border-white/10">
                  {services.map((service, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: false, margin: '-60px' }}
                      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
                      onMouseEnter={() => setHoveredService(index)}
                      onMouseLeave={() => setHoveredService(null)}
                      className="group flex items-center justify-between py-6 border-b border-white/10 hover:border-white transition-colors duration-500 relative cursor-none"
                    >
                      <div className="flex items-center gap-4">
                        <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl font-light text-zinc-400 group-hover:text-white transition-colors duration-300 group-hover:translate-x-2 transition-transform duration-500">
                          {service.title}
                        </h3>
                        {service.tag && (
                          <span className="font-sans text-[9px] uppercase tracking-widest text-zinc-500 border border-white/10 rounded-full px-2.5 py-1 group-hover:border-white/30 group-hover:text-zinc-300 transition-colors">
                            {service.tag}
                          </span>
                        )}
                      </div>
                      <span className="font-sans text-xs text-zinc-600 group-hover:text-white transition-colors duration-300">
                        (0{index + 1})
                      </span>
                    </motion.div>
                  ))}
                </div>

                <AnimatePresence>
                  {hoveredService !== null && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.92, y: 10, filter: 'blur(8px)' }}
                      animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, scale: 0.96, y: 6, filter: 'blur(6px)' }}
                      transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                      className="absolute right-0 top-1/4 w-[280px] aspect-[4/5] bg-zinc-800 border border-white/10 z-20 pointer-events-none shadow-2xl overflow-hidden"
                    >
                      <motion.img
                        key={hoveredService}
                        initial={{ scale: 1.15 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        src={services[hoveredService].preview}
                        alt="Vista previa del servicio"
                        className="w-full h-full object-cover grayscale brightness-90"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                      <motion.p
                        key={`desc-${hoveredService}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute bottom-0 left-0 right-0 p-5 font-sans text-xs text-zinc-200 leading-relaxed"
                      >
                        {services[hoveredService].description}
                      </motion.p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER CALL TO ACTION — moved up between Services and FAQ */}
        <section
          ref={ctaFooterRef}
          id="cta-footer"
          className="relative min-h-[100svh] md:min-h-[90vh] bg-[#0A0A09] text-[#EAE7E2] w-[100vw] ml-[calc(50%-50vw)] flex flex-col items-center justify-center overflow-hidden border-t border-white/5 py-20 sm:py-24 md:py-32 px-5 sm:px-6 md:px-20"
        >
          <motion.div
            style={{ scale: ctaLoopScale }}
            className="absolute inset-0 z-0 select-none pointer-events-none opacity-25"
          >
            <AbstractLoop className="w-full h-full" />
          </motion.div>

          <div className="max-w-[1440px] mx-auto w-full text-center space-y-12 relative z-10 flex flex-col items-center justify-between">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap justify-center gap-x-8 gap-y-3 font-mono text-[10px] tracking-[0.2em] text-zinc-400 uppercase mb-8"
            >
              <a
                href="https://wa.me/34624169459"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors cursor-none"
                data-cursor-text="WHATSAPP"
              >
                Escríbenos por WhatsApp ↗
              </a>
              <span className="hidden sm:inline text-zinc-700">•</span>
              <a
                href="mailto:cesarl@augustocs.com"
                className="hover:text-white transition-colors cursor-none"
                data-cursor-text="EMAIL"
              >
                cesarl@augustocs.com
              </a>
              <span className="hidden sm:inline text-zinc-700">•</span>
              <button
                onClick={() => setIsHireOpen(true)}
                className="hover:text-white transition-colors cursor-none uppercase"
                data-cursor-text="HIRE"
              >
                Empezar proyecto ↗
              </button>
            </motion.div>

            <div className="space-y-4">
              {[
                { text: 'Creemos', color: 'text-white' },
                { text: 'Una Experiencia', color: 'text-zinc-400' },
              ].map((line, i) => (
                <motion.h2
                  key={line.text}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className={`font-serif text-4xl sm:text-6xl md:text-8xl font-light ${line.color} leading-[1.05] tracking-tight uppercase select-none`}
                >
                  {line.text}
                </motion.h2>
              ))}
              <motion.h2
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="font-serif text-4xl sm:text-6xl md:text-8xl font-light text-white leading-[1.05] tracking-tight uppercase select-none"
              >
                A Tu Altura.
              </motion.h2>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="font-sans text-[10px] text-zinc-500 uppercase tracking-[0.25em] leading-relaxed pt-8 max-w-sm"
            >
              Disponible para nuevos proyectos — hablemos de tu marca.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="pt-12"
            >
              <MonologButton
                onClick={() => setIsHireOpen(true)}
                className="px-10 py-6 bg-[#EAE7E2] text-[#0A0A09] hover:text-[#0A0A09] font-sans text-xs uppercase tracking-[0.2em] font-bold transition-all duration-350 hover:bg-white hover:shadow-2xl shadow-xl flex items-center gap-3 border border-white/20 cursor-none"
                data-cursor-text="START"
              >
                Cuéntanos tu historia
                <span className="text-sm">↗</span>
              </MonologButton>
            </motion.div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section
          id="faq"
          className="py-20 sm:py-24 md:py-48 max-w-[1440px] mx-auto w-full px-5 sm:px-8 md:px-12 lg:px-20 border-t border-black/10"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-4 flex items-center gap-3"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#0A0A09] animate-pulse" />
              <span className="font-sans text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-bold block">
                ¿TIENES PREGUNTAS?
              </span>
            </motion.div>

            <div className="lg:col-span-8 space-y-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                <h2 className="font-serif text-3xl sm:text-4xl font-light text-[#0A0A09] tracking-tight">
                  Consideraciones clave antes de trabajar juntos.
                </h2>
              </motion.div>

              <div className="flex flex-col border-t border-black/10">
                {[
                  {
                    q: "¿Quién trabajará realmente en mi proyecto?",
                    a: "Trabajarás directamente conmigo, César. No delego tu proyecto en diseñadores junior ni gestores de cuenta intermediarios: cada pixel y cada decisión de estrategia pasa por mis manos."
                  },
                  {
                    q: "¿Cuánto tiempo suele tardar un proyecto?",
                    a: "Depende del alcance. Una landing o web sencilla puede estar lista en 2-3 semanas; un e-commerce en Shopify o un proyecto con contenido y automatización a medida suele necesitar entre 4 y 8 semanas. Te doy un plazo concreto tras la primera conversación."
                  },
                  {
                    q: "¿Qué necesito para empezar?",
                    a: "Nada preparado de antemano: una idea de lo que necesitas y disponibilidad para una charla inicial por WhatsApp o email. Ahí hablamos de alcance, plazos e inversión según tu caso concreto."
                  }
                ].map((faq, index) => {
                  const isOpen = activeFaq === index;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: false, margin: '-60px' }}
                      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
                      className="border-b border-black/10 py-6 transition-all duration-300"
                    >
                      <button
                        onClick={() => setActiveFaq(isOpen ? null : index)}
                        className="w-full flex items-center justify-between text-left cursor-none"
                      >
                        <h3 className={`font-serif text-lg sm:text-xl font-light transition-colors duration-300 ${isOpen ? 'text-black font-semibold' : 'text-zinc-600 hover:text-black'}`}>
                          {faq.q}
                        </h3>
                        <span className="font-mono text-base text-zinc-400">{isOpen ? '−' : '+'}</span>
                      </button>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <p className="font-sans text-sm text-zinc-500 leading-relaxed max-w-2xl">
                              {faq.a}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>

              {/* Chat with César Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="bg-[#0A0A09] text-[#EAE7E2] p-8 md:p-12 flex flex-col md:flex-row justify-between items-center gap-8 border border-white/5"
              >
                <div className="flex items-center gap-6">
                  <img
                    src="/logo-negative.png"
                    alt="AugustoCS"
                    className="w-14 h-14 object-contain"
                  />
                  <div>
                    <h4 className="font-sans text-xs uppercase tracking-widest font-bold text-white">
                      ¿Sigues con dudas?
                    </h4>
                    <p className="font-sans text-sm text-zinc-400 mt-1">
                      Escríbeme por WhatsApp o email y hablamos de tu proyecto sin compromiso.
                    </p>
                  </div>
                </div>

                <a
                  href="https://wa.me/34624169459"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative px-6 py-4 bg-[#EAE7E2] text-[#0A0A09] font-sans text-xs uppercase tracking-widest font-bold transition-all duration-350 hover:bg-white flex items-center gap-2 cursor-none"
                  data-cursor-text="WHATSAPP"
                >
                  Escribir por WhatsApp
                  <span className="group-hover:translate-x-1 transition-transform duration-300">↗</span>
                </a>
              </motion.div>
            </div>
          </div>
        </section>

        {/* PARTNERSHIPS / CONTACT FORM SECTION */}
        <ContactSection />

        {/* ARTICLES & NOTES — last content section before the footer */}
        <JournalSection />

      </main>

      {/* FOOTER METADATA BAR */}
      <footer className="w-full border-t border-black/10 bg-[#EAE7E2] py-12 z-10 px-5 sm:px-8 md:px-12 lg:px-20 max-w-[1440px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <span className="font-sans text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            © 2026 AUGUSTOCS. TODOS LOS DERECHOS RESERVADOS.
          </span>
          <div className="flex flex-wrap gap-x-8 gap-y-2 items-center">
            <a
              href="https://www.instagram.com/augustocs.studio"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative font-sans text-[10px] uppercase tracking-[0.16em] text-zinc-600 hover:text-black font-bold pb-0.5 cursor-none"
              data-cursor-text="INSTAGRAM"
            >
              Instagram
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-black group-hover:w-full transition-all duration-350" />
            </a>

            <span
              className="relative font-sans text-[10px] uppercase tracking-[0.16em] text-zinc-400 font-bold cursor-none"
              data-cursor-text="PRÓXIMAMENTE"
            >
              LinkedIn (Próximamente)
            </span>

            <button
              onClick={() => setActiveLegalType('terms')}
              className="group relative font-sans text-[10px] uppercase tracking-[0.16em] text-zinc-600 hover:text-black font-bold pb-0.5 cursor-none bg-transparent border-0 p-0"
              data-cursor-text="TÉRMINOS"
            >
              Términos
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-black group-hover:w-full transition-all duration-350" />
            </button>

            <button
              onClick={() => setActiveLegalType('privacy')}
              className="group relative font-sans text-[10px] uppercase tracking-[0.16em] text-zinc-600 hover:text-black font-bold pb-0.5 cursor-none bg-transparent border-0 p-0"
              data-cursor-text="PRIVACIDAD"
            >
              Privacidad
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-black group-hover:w-full transition-all duration-350" />
            </button>
          </div>
        </div>
      </footer>

      {/* MODAL & DRAWER SYSTEM — lazy-loaded, only pulled in once used */}
      <Suspense fallback={null}>
        {selectedProject && (
          <ProjectModal
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        <AnimatePresence>
          {isAboutOpen && (
            <AboutDrawer
              isOpen={isAboutOpen}
              onClose={() => setIsAboutOpen(false)}
            />
          )}
        </AnimatePresence>
      </Suspense>

      <Suspense fallback={null}>
        <AnimatePresence>
          {isHireOpen && (
            <HireModal
              isOpen={isHireOpen}
              onClose={() => setIsHireOpen(false)}
            />
          )}
        </AnimatePresence>
      </Suspense>

      <Suspense fallback={null}>
        {activeLegalType && (
          <LegalModal
            type={activeLegalType}
            onClose={() => setActiveLegalType(null)}
          />
        )}
      </Suspense>

    </div>
  );
}
