import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, GalleryHorizontal, ArrowUpRight } from 'lucide-react';
import Navbar from './components/Navbar';
import ProjectCard from './components/ProjectCard';
import ProjectModal from './components/ProjectModal';
import StudioSection from './components/StudioSection';
import JournalSection from './components/JournalSection';
import ContactSection from './components/ContactSection';
import DemosSection from './components/DemosSection';
import CustomCursor from './components/CustomCursor';
import HireModal from './components/HireModal';
import ProjectMobileCarousel from './components/ProjectMobileCarousel';
import ProjectDesktopCarousel from './components/ProjectDesktopCarousel';
import { PROJECTS } from './data';
import { Project } from './types';

export default function App() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isHireOpen, setIsHireOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('projects');
  const [desktopView, setDesktopView] = useState<'editorial' | 'carousel'>('editorial');
  const [mobileView, setMobileView] = useState<'carousel' | 'editorial'>('carousel');

  // Preload all project images in the background for instant carousel transitions
  useEffect(() => {
    PROJECTS.forEach((project) => {
      if (project.imageUrl && !project.isBuilding) {
        const img = new Image();
        img.src = project.imageUrl;
      }
    });
  }, []);

  // Multi-section scroll observer to highlight menu item
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['projects', 'demos', 'studio', 'journal', 'contact'];
      let currentSection = 'projects';

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 160) {
            currentSection = sectionId;
          }
        }
      }
      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-[#FDFCFB] min-h-screen text-zinc-900 flex flex-col relative w-full overflow-x-hidden pb-12">
      
      {/* Subtle organic light shading textures — reduced blur on mobile for performance */}
      <div className="hidden md:block absolute top-[10%] left-[15%] w-[450px] h-[450px] bg-zinc-200/20 rounded-full blur-[160px] pointer-events-none" />
      <div className="hidden md:block absolute top-[50%] right-[10%] w-[500px] h-[500px] bg-zinc-100/10 rounded-full blur-[180px] pointer-events-none" />

      {/* Premium cursor tracer */}
      <CustomCursor />

      {/* Structured top navbar bar */}
      <Navbar
        onHireClick={() => setIsHireOpen(true)}
        activeSection={activeSection}
      />

      {/* Main Inner limits */}
      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-20 pt-28 md:pt-36 flex-1 flex flex-col z-10">
        
        {/* HERO SECTION - LIGHT PREMIUM */}
        <section className="min-h-[80vh] md:min-h-[85vh] flex flex-col justify-center items-start pt-8 md:pt-20 relative font-sans">
          <div className="space-y-4 relative z-10 w-full">
            
            {/* Tiny Luxury Tag */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3 text-[9px] md:text-[10px] uppercase font-sans tracking-[0.3em] font-semibold text-zinc-500 mb-8"
            >
              <span className="w-8 h-[1px] bg-zinc-300" />
              <span>
                Diseño web &amp; e-commerce · Castellón
              </span>
            </motion.div>

            {/* Main title with line-by-line reveal */}
            <h1 className="font-serif text-[2.5rem] sm:text-6xl md:text-[6.5rem] lg:text-[7.5rem] tracking-[-0.02em] leading-[0.98] md:leading-[0.95] font-normal text-[#1A1A1A] max-w-6xl">
              <span className="block overflow-hidden py-1 min-h-[50px] md:min-h-[110px]">
                <motion.span
                  initial={{ y: '110%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                  className="block"
                >
                  Elevamos tu <span className="italic font-light text-zinc-400">marca</span>
                </motion.span>
              </span>
              <span className="block overflow-hidden py-1 min-h-[50px] md:min-h-[110px]">
                <motion.span
                  initial={{ y: '110%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.28 }}
                  className="block"
                >
                  a su máxima <span className="italic font-light text-zinc-400">expresión.</span>
                </motion.span>
              </span>
            </h1>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col md:flex-row md:items-end justify-between w-full mt-16 lg:mt-24 gap-8 border-t border-black/10 pt-8"
          >
            <div className="font-sans text-sm md:text-lg text-zinc-600 max-w-xl leading-[1.8] font-light min-h-[80px]">
              <p>
                Creamos páginas web y tiendas online para marcas que no se conforman con lo genérico. Diseño editorial, código de alto rendimiento y un resultado que convierte visitas en clientes reales.
              </p>
            </div>
            
            <div className="flex items-center gap-4 group cursor-default self-start md:self-end">
              <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-[#1A1A1A] font-bold">
                DESCUBRE
              </span>
              <div className="w-[1.5px] h-12 bg-zinc-200 relative overflow-hidden">
                <motion.div
                  animate={{ 
                    y: ['-100%', '100%']
                  }}
                  transition={{ 
                    repeat: Infinity,
                    duration: 2,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  className="absolute top-0 left-0 w-full h-1/2 bg-black" 
                />
              </div>
            </div>
          </motion.div>
        </section>

        {/* PROJECTS ASYMMETRIC GRID GALLERY */}
        <section id="projects" className="py-24 md:py-40">

          {/* Header */}
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
                Obras <span className="italic font-light text-zinc-400">Escogidas</span>
              </motion.h2>

              {/* Desktop view toggle */}
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
                    desktopView === 'editorial'
                      ? 'bg-[#1A1A1A] text-white'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <LayoutGrid size={12} /> Editorial
                </button>
                <button
                  onClick={() => setDesktopView('carousel')}
                  className={`flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-semibold transition-all duration-300 ${
                    desktopView === 'carousel'
                      ? 'bg-[#1A1A1A] text-white'
                      : 'text-zinc-500 hover:text-zinc-800'
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

          {/* Mobile: carousel or stacked grid */}
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

          {/* Desktop: toggle between views */}
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

        {/* VISION CTA — after portfolio */}
        <section className="py-20 md:py-32 border-t border-black/10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-10"
          >
            <div className="space-y-5 max-w-2xl">
              <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-semibold">
                ¿Tienes un proyecto?
              </span>
              <h2 className="font-serif text-4xl md:text-6xl font-normal tracking-tight text-[#1A1A1A] leading-[1.05]">
                Hagamos realidad <br className="hidden md:block" />
                tu <span className="italic font-light text-zinc-400">visión.</span>
              </h2>
              <p className="font-sans text-sm text-zinc-500 leading-relaxed max-w-md font-light">
                Todo gran proyecto comienza con una conversación. Cuéntanos qué imaginas para tu marca y lo construimos juntos.
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-3 self-start md:self-end shrink-0">
              <motion.button
                onClick={() => {
                  document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                }}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="flex items-center gap-3 bg-[#1A1A1A] text-[#FDFCFB] font-sans text-xs uppercase tracking-[0.25em] font-bold px-8 py-5"
                data-cursor="project"
                data-cursor-text="VAMOS"
              >
                Contactar <ArrowUpRight size={14} />
              </motion.button>
              <a
                href="mailto:cesarl@augustocs.com"
                className="font-sans text-[11px] text-zinc-400 hover:text-zinc-700 transition-colors tracking-wide"
                data-cursor="project"
                data-cursor-text="EMAIL"
              >
                cesarl@augustocs.com
              </a>
            </div>
          </motion.div>
        </section>

        {/* WEBS CREATOR DEMOS SECTION */}
        <DemosSection />

        {/* CORE IDEOLOGY / STUDIO SECTION */}
        <StudioSection />

        {/* THE JOURNAL SECTION */}
        <JournalSection />

        {/* PARTNERSHIPS / CONTACT FORM SECTION */}
        <ContactSection />

      </main>

      {/* FOOTER COMPONENT */}
      <footer className="w-full border-t border-black/10 bg-[#FDFCFB] py-12 z-10 px-6 md:px-20 max-w-[1440px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <span className="font-sans text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            © 2026 AUGUSTOCS. TODOS LOS DERECHOS RESERVADOS.
          </span>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {['Instagram', 'LinkedIn', 'Behance', 'Dribbble', 'Terms', 'Privacy'].map((social) => (
              <a
                key={social}
                href="#"
                className="group relative font-sans text-[10px] uppercase tracking-[0.16em] text-zinc-600 hover:text-black font-semibold transition-all duration-350 pb-0.5"
                data-cursor="project"
                data-cursor-text={social.toUpperCase()}
              >
                {social}
                {/* Horizontal growing underline */}
                <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-black group-hover:w-full transition-all duration-350" />
              </a>
            ))}
          </div>
        </div>
      </footer>

      {/* CASE STUDY OVERLAY DRAWERS */}
      <ProjectModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />

      {/* HIRE/SCHEDULER POPUP MODALS */}
      <HireModal
        isOpen={isHireOpen}
        onClose={() => setIsHireOpen(false)}
      />

    </div>
  );
}
