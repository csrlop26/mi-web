import { motion } from 'motion/react';
import { EyeOff, Award, Fingerprint } from 'lucide-react';
import ConstructionBox from './timelapse/ConstructionBox';
import TypewriterText from './timelapse/TypewriterText';

interface StudioSectionProps {
  step?: number;
  isTimelapseMode?: boolean;
  forceMobile?: boolean;
}

export default function StudioSection({ step = 0, isTimelapseMode = false, forceMobile = false }: StudioSectionProps) {
  if (isTimelapseMode && step < 13) {
    return null; // Hidden in early steps
  }

  const values = [
    {
      icon: <EyeOff size={18} className="text-white animate-pulse" />,
      title: 'Estrategia & UX/UI',
      description: 'Diseño de interfaces intuitivas y arquitecturas de información claras para experiencias digitales fluidas.',
    },
    {
      icon: <Fingerprint size={18} className="text-white" />,
      title: 'Ingeniería Técnica',
      description: 'Desarrollo frontend avanzado con animaciones de alto rendimiento (Framer Motion, React).',
    },
    {
      icon: <Award size={18} className="text-white" />,
      title: 'E-commerce Premium',
      description: 'Soluciones a medida en Shopify orientadas a la conversión y la estética narrativa.',
    },
  ];

  const cardVariants = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    hover: { 
      y: -6, 
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderColor: 'rgba(255, 255, 255, 0.08)'
    }
  };

  const iconVariants = {
    hover: { 
      scale: 1.15, 
      rotate: 5, 
      transition: { type: 'spring', stiffness: 300, damping: 15 } 
    }
  };


  return (
    <motion.section
      initial={isTimelapseMode ? { y: 35, opacity: 0 } : {}}
      animate={isTimelapseMode ? { y: 0, opacity: 1 } : {}}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      id="studio"
      className={
        forceMobile
          ? "py-12 border-t border-white/5 relative bg-[#0A0A09] w-full px-5 mt-12"
          : "py-24 md:py-40 border-t border-white/5 relative bg-[#0A0A09] w-[100vw] ml-[calc(50%-50vw)] px-4 sm:px-6 md:px-[calc(50vw-720px+5rem)] xl:px-[calc(50vw-720px)] mt-24"
      }
    >
      <div
        className={
          forceMobile
            ? "grid grid-cols-1 gap-10 w-full"
            : "grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 w-full max-w-7xl mx-auto pl-0 md:pl-20"
        }
      >
        {/* Left Side: Category Label */}
        <div className={forceMobile ? "space-y-6" : "lg:col-span-4 space-y-8"}>
          <div className="space-y-2">
            <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-[#EAE7E2] block font-semibold">
              {isTimelapseMode ? <TypewriterText text="02 / Filosofía de Estudio" speed={20} /> : '02 / Filosofía de Estudio'}
            </span>
            <h2 className="font-serif text-3xl font-light tracking-wide text-zinc-100">
              {isTimelapseMode ? <TypewriterText text="Acerca del Estudio" speed={25} /> : 'Acerca del Estudio'}
            </h2>
          </div>
          
          <div className="w-12 h-[1px] bg-[#EAE7E2]/30" />
          
          <p className="font-sans text-xs text-zinc-400 uppercase tracking-widest leading-relaxed">
            {isTimelapseMode ? (
              <TypewriterText text="Transformamos tu visión en una experiencia digital premium orientada a resultados." speed={12} />
            ) : (
              'Transformamos tu visión en una experiencia digital premium orientada a resultados.'
            )}
          </p>
        </div>

        {/* Right Side: Major Quote & Principles */}
        <div className={forceMobile ? "space-y-10" : "lg:col-span-8 space-y-16"}>
          <div className={`font-serif ${forceMobile ? 'text-xl' : 'text-2xl md:text-4xl'} text-[#FDFCFB] leading-[1.6] font-light italic`}>
            {isTimelapseMode ? (
              <TypewriterText text='"Creemos en el diseño como herramienta de conversión. Al fusionar estéticas editoriales con ingeniería técnica de alto rendimiento, creamos experiencias que no solo se ven bien: venden."' speed={8} />
            ) : (
              <span>
                "Creemos en el <span className="text-white font-semibold not-italic">diseño como herramienta de conversión</span>. Al fusionar estéticas editoriales con ingeniería técnica de alto rendimiento, creamos experiencias que no solo se ven bien: venden."
              </span>
            )}
          </div>

          {/* Three columns of Values */}
          <div className={`grid grid-cols-1 ${forceMobile ? '' : 'md:grid-cols-3'} gap-8 pt-8 border-t border-white/5`}>
            {values.map((v, i) => {
              const cardInner = (
                <div className="space-y-4">
                  <div className="w-10 h-10 flex items-center justify-center rounded-none bg-white/5">
                    <motion.div variants={iconVariants} className="text-white flex items-center justify-center">
                      {v.icon}
                    </motion.div>
                  </div>
                  <h3 className="font-serif text-lg font-medium text-zinc-100">
                    {isTimelapseMode ? <TypewriterText text={v.title} speed={15} /> : v.title}
                  </h3>
                  <p className="font-sans text-xs text-zinc-400 leading-relaxed">
                    {isTimelapseMode ? <TypewriterText text={v.description} speed={8} /> : v.description}
                  </p>
                </div>
              );

              if (isTimelapseMode) {
                return (
                  <div
                    key={v.title}
                    className="space-y-4 p-6 rounded-none border border-transparent transition-all duration-350 cursor-none"
                  >
                    {cardInner}
                  </div>
                );
              }

              return (
                <motion.div
                  key={v.title}
                  variants={cardVariants}
                  initial="initial"
                  whileInView="animate"
                  whileHover="hover"
                  whileTap={{ scale: 0.98 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4 p-6 rounded-none border border-transparent transition-all duration-350 cursor-none"
                >
                  {cardInner}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
