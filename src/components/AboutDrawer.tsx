import { useEffect } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import AbstractLoop from './AbstractLoop';

interface AboutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutDrawer({ isOpen, onClose }: AboutDrawerProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const realClients = [
    'Robot Energy & Peace',
    'Madre Superiora Coffee',
    'AutoTietz',
  ];

  const demoProjects = [
    'B2Tech',
    'Nova Restaurante',
    'Odentrics',
    'La Trattoria',
  ];

  const guarantees = [
    { title: 'Código 100% a medida', desc: 'Desarrollo en React & Tailwind libre de constructores pesados.' },
    { title: 'Optimización SEO local', desc: 'Estructuras semánticas preparadas para Castellón y Valencia.' },
    { title: 'Velocidad de carga optimizada', desc: 'Assets comprimidos y código limpio para que tu web cargue rápido de verdad.' },
    { title: 'Autonomía post-lanzamiento', desc: 'Soporte técnico de 30 días y vídeos formativos de autogestión.' },
  ];

  const principles = [
    {
      title: 'Resultados primero, estética después',
      desc: 'Cada decisión creativa que tomamos se cuestiona frente a una sola pregunta: ¿esto sirve realmente para el crecimiento de tu marca?',
    },
    {
      title: 'Todo o nada',
      desc: 'Asumimos menos proyectos para poder darlo todo en cada uno. Cuando nos comprometemos con tu marca, estamos completamente presentes y somos responsables del resultado.',
    },
    {
      title: 'Humano primero, siempre',
      desc: 'Detrás de cada marca hay una persona con una historia real e intereses reales. Nunca perdemos eso de vista. Las experiencias digitales más potentes son las que se sienten humanas.',
    },
    {
      title: 'Intención sobre velocidad',
      desc: 'El trabajo apresurado se convierte en arrepentimiento. Nos movemos al ritmo que requiere la obra. Cada detalle se gana su lugar antes de pasar al siguiente.',
    },
  ];

  const processSteps = [
    { step: '01', title: 'Descubrimos tu historia', desc: 'Nos sumergimos en tu marca, extraemos lo que te hace único y lo estructuramos en un posicionamiento claro y una estrategia web que conecta.' },
    { step: '02', title: 'Damos forma a tu presencia digital', desc: 'Diseñamos y estructuramos un sitio web que se siente premium, transmite credibilidad y guía a tu audiencia hacia la conversión.' },
    { step: '03', title: 'Lanzamiento e impacto', desc: 'Tu sitio web se publica como un activo de valor que atrae a los clientes para los que fuiste creado y escala con tu crecimiento.' }
  ];

  return (
    <>
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        onClick={onClose}
        className="fixed inset-0 bg-[#0A0A09]/40 z-40 backdrop-blur-[2px] cursor-none"
        data-cursor-text="CERRAR"
      />

      {/* Slide-in panel drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 38, mass: 0.8 }}
        className="fixed top-0 right-0 h-screen w-full md:w-[70vw] lg:w-[60vw] bg-[#EAE7E2] text-[#0A0A09] z-50 shadow-2xl border-l border-black/10 flex flex-col cursor-default overflow-hidden"
      >
        {/* Header toolbar */}
        <div className="flex justify-between items-center px-8 md:px-12 py-6 border-b border-black/5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#0A0A09] rounded-full animate-pulse" />
            <span className="font-sans text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-500">
              Acerca del estudio
            </span>
          </div>

          {/* Close button with circular layout */}
          <button
            onClick={onClose}
            className="flex items-center gap-2 font-sans text-[9px] uppercase tracking-[0.2em] font-bold py-2 px-3 border border-black/10 hover:border-black transition-colors rounded-none cursor-none group"
            data-cursor-text="VOLVER"
          >
            <span>Cerrar</span>
            <X size={12} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-8 md:px-16 py-12 space-y-16 scrollbar-none" data-lenis-prevent>
          
          {/* Top bio paragraph and video loop columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Bio text column */}
            <div className="lg:col-span-7 space-y-8 pr-0 lg:pr-8">
              <h2 className="font-serif text-3xl md:text-4xl leading-tight font-light tracking-tight">
                Hola, soy César. Creé AugustoCS porque vi negocios de Castellón con un producto excelente y una web que no estaba a su altura.
              </h2>
              <div className="w-8 h-[1px] bg-black/20" />
              <div className="font-sans text-xs md:text-sm text-zinc-600 space-y-6 leading-relaxed">
                <p>
                  Cerca de casa vi tiendas, restaurantes y negocios con años de buen trabajo detrás cuya presencia online no reflejaba nada de eso: webs anticuadas, lentas o directamente inexistentes, perdiendo clientes que ya los estaban buscando.
                </p>
                <p>
                  Empecé AugustoCS para cerrar esa brecha. Soy un estudio joven, y eso lo llevo como ventaja: trabajo con el stack y las herramientas más actuales del diseño web, el e-commerce y la IA aplicada, sin el peso ni los procesos lentos de una agencia tradicional.
                </p>
                <p>
                  Cuando trabajo con un negocio, me sumerjo en su historia real, entiendo qué lo hace diferente y diseño la experiencia digital alrededor de eso — no de una plantilla genérica.
                </p>
              </div>
            </div>

            {/* Video loop column */}
            <div className="lg:col-span-5 space-y-4">
              <div className="relative aspect-[3/4] overflow-hidden bg-zinc-200 border border-black/5">
                <AbstractLoop className="w-full h-full" />
                <div className="absolute inset-0 bg-[#EAE7E2]/10 mix-blend-overlay pointer-events-none" />

                {/* Floating tag on corner */}
                <div className="absolute bottom-4 left-4 font-sans text-[8px] uppercase tracking-widest bg-[#0A0A09] text-[#EAE7E2] px-2 py-1">
                  Stack moderno · IA aplicada
                </div>
              </div>
              <p className="font-sans text-[9px] uppercase tracking-[0.16em] text-zinc-400 text-center">
                Con sede en Castellón de la Plana
              </p>
            </div>

          </div>

          {/* Principles Section */}
          <div className="space-y-8 pt-8 border-t border-black/5">
            <h3 className="font-sans text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-400">
              Nuestros Principios
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {principles.map((pr, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-3 p-6 bg-black/[0.02] border border-black/5"
                >
                  <h4 className="font-serif text-lg font-normal tracking-tight text-[#0A0A09]">
                    {pr.title}
                  </h4>
                  <p className="font-sans text-xs text-zinc-500 leading-relaxed">
                    {pr.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Process Section */}
          <div className="space-y-8 pt-8 border-t border-black/5">
            <h3 className="font-sans text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-400">
              Nuestro Proceso
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {processSteps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-3 p-6 bg-black/[0.01] border border-black/5"
                >
                  <span className="font-mono text-zinc-400 text-[10px] block">Paso /{step.step}</span>
                  <h4 className="font-serif text-lg font-normal tracking-tight text-[#0A0A09]">
                    {step.title}
                  </h4>
                  <p className="font-sans text-xs text-zinc-500 leading-relaxed">
                    {step.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Grid for Clients & Awards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 pt-8 border-t border-black/5">
            {/* Real Clients List */}
            <div className="space-y-6">
              <h3 className="font-sans text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-400">
                Clientes Reales
              </h3>
              <ul className="space-y-2.5">
                {realClients.map((client, i) => (
                  <li
                    key={i}
                    className="font-serif text-base font-light border-b border-black/5 pb-1 flex justify-between items-baseline"
                  >
                    <span>{client}</span>
                    <span className="font-sans text-[9px] text-zinc-400 font-semibold tracking-widest">
                      (CLIENTE)
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Demo Projects List */}
            <div className="space-y-6">
              <h3 className="font-sans text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-400">
                Proyectos Demo / Concepto
              </h3>
              <ul className="space-y-2.5">
                {demoProjects.map((project, i) => (
                  <li
                    key={i}
                    className="font-serif text-base font-light border-b border-black/5 pb-1 flex justify-between items-baseline"
                  >
                    <span>{project}</span>
                    <span className="font-sans text-[9px] text-zinc-400 font-semibold tracking-widest">
                      (DEMO)
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Guarantees List */}
            <div className="space-y-6">
              <h3 className="font-sans text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-400">
                Garantías de Calidad
              </h3>
              <ul className="space-y-4">
                {guarantees.map((guarantee, i) => (
                  <li
                    key={i}
                    className="border-b border-black/5 pb-2.5 flex flex-col gap-1"
                  >
                    <div className="flex justify-between items-baseline">
                      <span className="font-serif text-base font-semibold text-[#0A0A09]">{guarantee.title}</span>
                      <span className="font-sans text-[8px] text-zinc-400 font-semibold tracking-widest uppercase">
                        (GARANTÍA)
                      </span>
                    </div>
                    <p className="font-sans text-xs text-zinc-500 leading-relaxed">
                      {guarantee.desc}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer of the Drawer */}
          <div className="pt-12 text-center border-t border-black/5 pb-8">
            <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-zinc-400">
              Rehúsa ser subestimado.
            </p>
          </div>

        </div>
      </motion.div>
    </>
  );
}
