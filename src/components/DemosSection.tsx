import { motion } from 'motion/react';
import { ExternalLink, Github } from 'lucide-react';
import demosCatalog from '../data/demos_catalog.json';
import ConstructionBox from './timelapse/ConstructionBox';
import TypewriterText from './timelapse/TypewriterText';

interface Demo {
  id: string;
  name: string;
  description: string;
  live_url: string;
  github_url: string;
  thumbnail: string;
}

interface DemosSectionProps {
  step?: number;
  isTimelapseMode?: boolean;
  forceMobile?: boolean;
}

export default function DemosSection({ step = 0, isTimelapseMode = false, forceMobile = false }: DemosSectionProps) {
  if (isTimelapseMode && step < 13) {
    return null; // Hidden in early steps
  }

  if (!demosCatalog || demosCatalog.length === 0) {
    return null; // Don't show the section if no demos are available yet
  }


  return (
    <motion.section
      initial={isTimelapseMode ? { y: 35, opacity: 0 } : {}}
      animate={isTimelapseMode ? { y: 0, opacity: 1 } : {}}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      id="demos"
      className={
        forceMobile
          ? "py-12 bg-[#F4F2EE] w-full border-y border-black/5 px-5"
          : "py-24 md:py-40 bg-[#F4F2EE] w-[100vw] ml-[calc(50%-50vw)] px-4 sm:px-6 md:px-[calc(50vw-720px+5rem)] xl:px-[calc(50vw-720px)] border-y border-black/5"
      }
    >
      <div className={forceMobile ? "w-full" : "w-full max-w-7xl mx-auto pl-0 md:pl-20"}>
        {/* Header metadata label */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16 border-b border-black/10 pb-8">
          <div className="space-y-2">
            <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-[#1A1A1A] block font-bold">
              {isTimelapseMode ? <TypewriterText text="01 / Laboratorio" speed={20} /> : '01 / Laboratorio'}
            </span>
            <h2 className="font-serif text-3xl font-light tracking-wide text-zinc-900 uppercase">
              {isTimelapseMode ? <TypewriterText text="WEBS DEMO" speed={25} /> : 'WEBS DEMO'}
            </h2>
          </div>
          
          <span className="font-sans text-xs text-zinc-600 max-w-xs text-left md:text-right">
            {isTimelapseMode ? (
              <TypewriterText text="Una colección de sitios web conceptuales, diseñados y desarrollados para explorar nuevas estéticas, interacciones y modelos de negocio." speed={10} />
            ) : (
              'Una colección de sitios web conceptuales, diseñados y desarrollados para explorar nuevas estéticas, interacciones y modelos de negocio.'
            )}
          </span>
        </div>

        {/* Grid of Demos */}
        <div className={`grid grid-cols-1 ${forceMobile ? '' : 'md:grid-cols-2 lg:grid-cols-3'} gap-8`}>
          {(demosCatalog as Demo[]).map((demo, index) => {
            const demoInner = (
              <div className="flex flex-col h-full w-full">
                {/* Thumbnail */}
                <div className="relative w-full aspect-[4/3] bg-zinc-200 overflow-hidden mb-6 border border-black/5 shadow-sm">
                  {isTimelapseMode ? (
                    <motion.img
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 150, damping: 12, delay: index * 0.1 }}
                      src={demo.thumbnail}
                      alt={demo.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={demo.thumbnail}
                      alt={demo.name}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      loading="lazy"
                    />
                  )}
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500 pointer-events-none" />
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 space-y-3">
                  <h3 className="font-serif text-xl md:text-2xl text-zinc-900 group-hover:text-black transition-colors">
                    {isTimelapseMode ? <TypewriterText text={demo.name} speed={15} /> : demo.name}
                  </h3>
                  <p className="font-sans text-sm text-zinc-500 line-clamp-2">
                    {isTimelapseMode ? <TypewriterText text={demo.description} speed={8} /> : demo.description}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-4 mt-auto pt-4 border-t border-black/5">
                    <a
                      href={demo.live_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 font-sans text-xs uppercase tracking-widest text-zinc-900 hover:text-black font-semibold transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{isTimelapseMode ? <TypewriterText text="Ver Demo" speed={15} /> : 'Ver Demo'}</span>
                    </a>
                    <a
                      href={demo.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 font-sans text-xs uppercase tracking-widest text-zinc-500 hover:text-black font-semibold transition-colors ml-auto"
                    >
                      <Github className="w-3.5 h-3.5" />
                      <span>{isTimelapseMode ? <TypewriterText text="Código" speed={15} /> : 'Código'}</span>
                    </a>
                  </div>
                </div>
              </div>
            );

            if (isTimelapseMode) {
              return (
                <div
                  key={demo.id}
                  className="group flex flex-col relative"
                >
                  {demoInner}
                </div>
              );
            }

            return (
              <motion.div
                key={demo.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="group flex flex-col relative"
              >
                {demoInner}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
