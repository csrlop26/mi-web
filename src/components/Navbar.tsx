import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConstructionBox from './timelapse/ConstructionBox';
import TypewriterText from './timelapse/TypewriterText';

interface NavbarProps {
  onHireClick: () => void;
  activeSection: string;
  step?: number;
  isTimelapseMode?: boolean;
  forceMobile?: boolean;
}

export default function Navbar({ onHireClick, activeSection, step = 0, isTimelapseMode = false, forceMobile = false }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Control overflow scroll when mobile menu is active
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const menuItems = [
    { label: 'Proyectos', id: 'projects' },
    { label: 'Estudio', id: 'studio' },
    { label: 'Artículos', id: 'journal' },
    { label: 'Contacto', id: 'contact' },
  ];

  const handleNavClick = (id: string) => {
    setIsMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const offset = 90; // account for fixed navbar height
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  if (isTimelapseMode && step < 1) {
    return null; // Empty navbar in step 0
  }

  const innerContent = (
    <div className="flex justify-between items-center px-6 md:px-20 w-full max-w-[1440px] mx-auto">
      {/* Brand Logo */}
      <motion.a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="font-serif text-xl md:text-2xl font-black tracking-[0.1em] text-[#1A1A1A]"
        data-cursor="project"
        data-cursor-text="AUGUSTOCS"
      >
        {isTimelapseMode ? (
          <TypewriterText text="AugustoCS" speed={30} />
        ) : (
          'AugustoCS'
        )}
      </motion.a>

      {/* Links (Desktop) */}
      <div className={`${forceMobile ? 'hidden' : 'hidden md:flex'} items-center gap-12`}>
        {menuItems.map((item, idx) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`relative font-sans text-xs tracking-[0.2em] font-bold uppercase transition-colors duration-300 pb-1 cursor-none ${
                isActive ? 'text-[#1A1A1A]' : 'text-zinc-500 hover:text-[#1A1A1A]'
              }`}
            >
              {isTimelapseMode ? (
                <TypewriterText text={item.label} speed={25} delay={300 + idx * 100} />
              ) : (
                item.label
              )}
              {/* Active Underline Indicator with horizontal Spring physics layoutId */}
              {isActive && !isTimelapseMode && (
                <motion.span
                  layoutId="activeUnderline"
                  className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#1A1A1A]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Action Button (Desktop) */}
      <div className={`${forceMobile ? 'hidden' : 'hidden md:flex'} items-center`}>
        <motion.button
          onClick={onHireClick}
          whileHover={{ scale: 1.04, y: -1 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={`font-sans text-xs uppercase tracking-[0.2em] font-semibold bg-[#1A1A1A] text-[#FDFCFB] px-7 py-3 rounded-none hover:bg-zinc-850 transition-all shadow-sm cursor-none ${
            isTimelapseMode && step < 2 
              ? 'opacity-0' 
              : ''
          }`}
        >
          {isTimelapseMode ? (
            step >= 2 ? (
              <TypewriterText text="Trabajemos juntos" speed={20} />
            ) : null
          ) : (
            'Trabajemos juntos'
          )}
        </motion.button>
      </div>

      {/* Mobile Menu Button */}
      <motion.button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        whileTap={{ scale: 0.9 }}
        className={`${forceMobile ? 'block' : 'md:hidden'} text-zinc-800 hover:text-black p-2 z-50 relative`}
        aria-label="Toggle Menu"
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </motion.button>
    </div>
  );

  return (
    <>
      <motion.nav
        initial={isTimelapseMode ? { y: -50, opacity: 0 } : {}}
        animate={isTimelapseMode ? { y: 0, opacity: 1 } : {}}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`${forceMobile ? 'absolute' : 'fixed'} top-0 left-0 w-full z-40 transition-[background-color,border-color,padding,backdrop-filter] duration-300 ease-out ${
          isScrolled || (isTimelapseMode && step >= 1)
            ? 'bg-[#FDFCFB]/90 backdrop-blur-xl border-b border-black/10 py-3.5'
            : 'bg-transparent py-5'
        }`}
      >
        {innerContent}
      </motion.nav>

      {/* Mobile Menu Drawer Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 top-[77px] w-full bg-[#FDFCFB]/98 backdrop-blur-2xl z-30 md:hidden overflow-hidden flex flex-col justify-center"
          >
            <motion.div
              variants={{
                show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
                hide: { transition: { staggerChildren: 0.05, staggerDirection: -1 } }
              }}
              initial="hide"
              animate="show"
              exit="hide"
              className="flex flex-col items-center justify-center gap-8 pb-32"
            >
              {menuItems.map((item) => (
                <motion.button
                  key={item.id}
                  variants={{
                    show: { opacity: 1, y: 0, scale: 1 },
                    hide: { opacity: 0, y: 15, scale: 0.95 }
                  }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => handleNavClick(item.id)}
                  whileTap={{ scale: 0.94 }}
                  className="font-serif text-3xl font-light tracking-wide text-zinc-700 hover:text-black transition-colors"
                >
                  {item.label}
                </motion.button>
              ))}
              
              <motion.button
                variants={{
                  show: { opacity: 1, y: 0, scale: 1 },
                  hide: { opacity: 0, y: 15, scale: 0.95 }
                }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onHireClick();
                }}
                whileTap={{ scale: 0.95 }}
                className="mt-6 font-sans text-xs uppercase tracking-[0.2em] bg-[#1A1A1A] text-[#FDFCFB] py-4 px-10 rounded-none hover:bg-zinc-800 transition-colors font-bold shadow-md"
              >
                Trabajemos juntos
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
