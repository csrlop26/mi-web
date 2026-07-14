import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MonologButton from './MonologButton';

interface NavbarProps {
  onHireClick: () => void;
  onAboutClick: () => void;
  activeSection: string;
  dark?: boolean;
}

export default function Navbar({ onHireClick, onAboutClick, activeSection, dark = false }: NavbarProps) {
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
    { label: 'Nosotros', id: 'about', isDrawer: true },
    { label: 'Proyectos', id: 'work' },
    { label: 'Servicios', id: 'services' },
    { label: 'Contacto', id: 'contact' },
  ];

  const handleNavClick = (item: typeof menuItems[number]) => {
    setIsMobileMenuOpen(false);
    if (item.isDrawer) {
      onAboutClick();
      return;
    }
    const element = document.getElementById(item.id);
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

  return (
    <>
      <nav
        className={`fixed top-0 left-0 w-full z-40 transition-[background-color,border-color,padding,backdrop-filter,color] duration-500 ease-out ${
          isScrolled
            ? dark
              ? 'bg-[#0A0A09]/85 backdrop-blur-xl border-b border-white/10 py-3.5'
              : 'bg-[#EAE7E2]/90 backdrop-blur-xl border-b border-black/10 py-3.5'
            : 'bg-transparent py-5'
        } ${dark ? 'text-[#EAE7E2]' : 'text-[#0A0A09]'}`}
      >
        <div className="flex justify-between items-center px-6 md:px-20 w-full max-w-[1440px] mx-auto">

          {/* AugustoCS Logo */}
          <motion.a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="flex items-center gap-2.5 cursor-none z-50 text-current"
            data-cursor-text="INICIO"
          >
            <img
              src={dark ? '/logo-negative.png' : '/logo-normal.png'}
              alt="AugustoCS"
              className="h-[26px] w-auto select-none transition-opacity duration-500"
            />
            <span className="font-sans text-xs font-bold tracking-[0.2em] uppercase hidden sm:block">
              AugustoCS
            </span>
          </motion.a>

          {/* Links (Desktop) */}
          <div className="hidden md:flex items-center gap-12">
            {menuItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`relative font-sans text-xs tracking-[0.2em] font-bold uppercase transition-colors duration-300 pb-1 cursor-none rolling-text-container ${
                    isActive
                      ? 'text-current'
                      : dark
                        ? 'text-zinc-400 hover:text-current'
                        : 'text-zinc-500 hover:text-current'
                  }`}
                >
                  <span className="rolling-text">
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.span
                      layoutId="activeUnderline"
                      className="absolute bottom-0 left-0 w-full h-[1.5px] bg-current"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Action Button (Desktop) */}
          <div className="hidden md:flex items-center">
            <MonologButton onClick={onHireClick} dark={dark} className="bg-transparent text-current">Empezar proyecto</MonologButton>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            whileTap={{ scale: 0.9 }}
            className="md:hidden text-current p-2 z-50 relative"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </motion.button>
        </div>
      </nav>

      {/* Mobile Menu Drawer Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 top-[77px] w-full bg-[#EAE7E2]/98 backdrop-blur-2xl z-30 md:hidden overflow-hidden flex flex-col justify-center"
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
                  onClick={() => handleNavClick(item)}
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
                className="mt-6 font-sans text-xs uppercase tracking-[0.2em] bg-[#0A0A09] text-[#EAE7E2] py-4 px-10 rounded-none hover:bg-zinc-800 transition-colors font-bold shadow-md"
              >
                Empezar proyecto
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
