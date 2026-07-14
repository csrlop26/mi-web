import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, ChevronRight, CornerDownRight, X } from 'lucide-react';
import { JOURNAL_POSTS } from '../data';
import { JournalPost } from '../types';
import ConstructionBox from './timelapse/ConstructionBox';
import TypewriterText from './timelapse/TypewriterText';

interface JournalSectionProps {
  step?: number;
  isTimelapseMode?: boolean;
  forceMobile?: boolean;
}

export default function JournalSection({ step = 0, isTimelapseMode = false, forceMobile = false }: JournalSectionProps) {
  const [activeArticle, setActiveArticle] = useState<JournalPost | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  if (isTimelapseMode && step < 14) {
    return null; // Hidden in early steps
  }

  const itemsPerPage = 3;
  const totalPages = Math.ceil(JOURNAL_POSTS.length / itemsPerPage);
  
  const paginatedPosts = isTimelapseMode
    ? JOURNAL_POSTS
    : JOURNAL_POSTS.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  const articleContent: Record<string, string[]> = {
    'art-of-whitespace': [
      'El espacio en blanco suele entenderse erróneamente como un lienzo vacío a la espera de contenido. En el diseño de lujo, el espacio negativo es un componente sólido y funcional que establece la arquitectura.',
      'Cuando un usuario entra en una pantalla densa, sufre fatiga cognitiva inmediata. Al aumentar los márgenes drásticamente, las imágenes y titulares adquieren un estatus icónico, sintiéndose seleccionados, valiosos y exclusivos.',
      'Tratamos los márgenes como el marco silencioso de obras maestras digitales. Una interfaz despejada transmite confianza absoluta: no necesitamos gritar para ser vistos.'
    ],
    'fluid-microinteractions': [
      'En el diseño premium, la interactividad es táctil. Si un botón brilla con una transición rápida por defecto, se siente digital y sin peso. Ajustando las curvas Bezier en CSS, logramos imitar la inercia física.',
      'Usamos cursores personalizados que cambian su morfología para sugerir acciones, guiando de manera elegante la mirada a través del sistema.',
      'Las respuestas deben sentirse instantáneas pero suaves. Una ventana no debe simplemente aparecer; debe deslizarse, frenando de forma orgánica, reflejando la calidad de objetos físicos de alta fidelidad.'
    ],
    'tactile-dark-mode': [
      'Los modos oscuros estándar son conversiones simples: el fondo blanco se vuelve negro. En las interfaces de lujo, este alto contraste genera fatiga visual en pantallas OLED y parece poco inspirado.',
      'Construimos espectros "Deep Night". El lienzo usa un negro absoluto (#0A0A0C) solo como base. Las tarjetas utilizan un gris neutro de alta clase (#141416), mientras los detalles se resaltan sutilmente.',
      'Esto crea una profundidad estratificada. Los tonos subyacentes simulan retroiluminación física, sintiéndose como metales bajo luces suaves de galería en lugar de una matriz digital.'
    ],
    'diseno-web-castellon': [
      'El diseño web en Castellón ha evolucionado de simples páginas informativas a completas experiencias de marca. En un mercado local competitivo, la diferenciación visual y el rendimiento técnico son cruciales para posicionarse como una opción de primer nivel.',
      'No se trata solo de tener presencia digital; la clave reside en la creación de páginas web con una dirección de arte cuidada que refleje la calidad real de tu producto o servicio. Integrar tipografías elegantes, animaciones sutiles y flujos de usuario intuitivos genera confianza inmediata y posiciona a tu negocio por encima de la competencia.',
      'Además, un diseño web premium optimizado a nivel SEO asegura que los clientes potenciales en Castellón de la Plana y la Comunidad Valenciana encuentren tu marca fácilmente en Google, transformando las visitas orgánicas en conversiones reales.'
    ],
    'creacion-paginas-web-valencia': [
      'La creación de páginas web y tiendas online en Valencia demanda un enfoque híbrido: la sofisticación estética de un estudio de diseño y la solidez técnica de una agencia de ingeniería. La rapidez de carga y la facilidad de uso móvil son factores decisivos que determinan si un usuario realiza una compra o abandona el sitio.',
      'Al desarrollar plataformas e-commerce personalizadas en Shopify para marcas de la Comunidad Valenciana, priorizamos la narrativa visual del producto y la simplicidad en el proceso de pago. Esta combinación elimina la fricción de compra y optimiza la tasa de conversión.',
      'Unir una sólida estrategia de desarrollo web en Valencia con buenas prácticas de optimización SEO local y global permite a las marcas locales competir de tú a tú en el mercado global, convirtiendo su tienda digital en su canal de ventas más rentable.'
    ],
    'seo-castellon-valencia': [
      'A menudo se piensa que el diseño web premium de alto nivel visual está reñido con el posicionamiento en buscadores (SEO). La realidad es que los motores de búsqueda valoran la experiencia de usuario (UX) por encima de todo. La optimización del código, el renderizado rápido y la correcta estructuración semántica de las etiquetas son el motor oculto que impulsa tu visibilidad.',
      'Para captar clientes de valor en Castellón de la Plana, Valencia y alrededores, estructuramos el contenido atacando las palabras clave locales más rentables del sector, integrando microdatos y asegurando una velocidad de carga móvil excepcional.',
      'El resultado final es un sitio web que no solo deslumbra visualmente a quien lo visita, sino que también atrae tráfico cualificado de forma pasiva día tras día, actuando como un embudo de ventas constante para tu negocio.'
    ]
  };

  return (
    <motion.section
      initial={isTimelapseMode ? { y: 35, opacity: 0 } : {}}
      animate={isTimelapseMode ? { y: 0, opacity: 1 } : {}}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      id="journal"
      className={`${forceMobile ? 'py-12 px-5' : 'py-24 md:py-40'} border-t border-black/10 relative`}
    >
      <div className={`grid grid-cols-1 ${forceMobile ? 'gap-10' : 'lg:grid-cols-12 gap-16 lg:gap-24'} font-sans`}>
        {/* Left column info */}
        <div className={forceMobile ? 'space-y-6' : 'lg:col-span-4 space-y-8'}>
          <div className="space-y-2">
            <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-[#1A1A1A] block font-bold">
              {isTimelapseMode ? <TypewriterText text="02 / Reflexiones" speed={20} /> : '02 / Reflexiones'}
            </span>
            <h2 className="font-serif text-3xl font-light tracking-wide text-zinc-900">
              {isTimelapseMode ? <TypewriterText text="Artículos & Notas" speed={25} /> : 'Artículos & Notas'}
            </h2>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed max-w-sm">
            {isTimelapseMode ? (
              <TypewriterText text="Breves notas explorando la arquitectura de interfaces, la inercia táctil y la experiencia de usuario premium." speed={12} />
            ) : (
              'Breves notas explorando la arquitectura de interfaces, la inercia táctil y la experiencia de usuario premium.'
            )}
          </p>
        </div>


        {/* Right column: Interactive list */}
        <div className={forceMobile ? 'space-y-8' : 'lg:col-span-8 space-y-8'}>
          <div className="divide-y divide-black/10 border-b border-black/10">
            {JOURNAL_POSTS.map((post, idx) => {
              const isSelected = activeArticle?.id === post.id;
              const postPage = Math.floor(idx / itemsPerPage);
              const isVisible = isTimelapseMode || postPage === currentPage;
              
              const itemInner = (
                <div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                    <div className="space-y-3 flex-1">
                      {/* Meta info */}
                      <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest text-[#1A1A1A] font-bold">
                        <span>{isTimelapseMode ? <TypewriterText text={post.category} speed={15} /> : post.category}</span>
                        <span className="text-zinc-300">•</span>
                        <span className="flex items-center gap-1 text-zinc-500 font-normal">
                          <Clock size={10} /> {isTimelapseMode ? <TypewriterText text={post.readTime} speed={15} /> : post.readTime}
                        </span>
                      </div>
                      
                      {/* Title */}
                      <h3 className="font-serif text-xl md:text-2xl font-light text-zinc-900 group-hover:text-black transition-colors duration-300">
                        {isTimelapseMode ? <TypewriterText text={post.title} speed={15} /> : post.title}
                      </h3>
                      
                      <p className="text-xs text-zinc-600 leading-relaxed max-w-xl font-light">
                        {isTimelapseMode ? <TypewriterText text={post.excerpt} speed={8} /> : post.excerpt}
                      </p>
                    </div>

                    {/* Toggle button indicator */}
                    {!isTimelapseMode && (
                      <motion.div 
                        animate={{ 
                          rotate: isSelected ? 90 : 0,
                          backgroundColor: isSelected ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.03)',
                          borderColor: isSelected ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.03)'
                        }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className="flex items-center justify-center w-12 h-12 rounded-none border self-start md:self-center"
                      >
                        <ChevronRight size={16} className="text-zinc-500" />
                      </motion.div>
                    )}
                  </div>
                </div>
              );

              if (isTimelapseMode) {
                return (
                  <div key={post.id} className="py-10 first:pt-0 overflow-hidden">
                    {itemInner}
                  </div>
                );
              }

              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: (idx % itemsPerPage) * 0.1 }}
                  className={`py-10 first:pt-0 overflow-hidden ${isVisible ? 'block' : 'hidden'}`}
                >
                  <motion.div
                    onClick={() => setActiveArticle(isSelected ? null : post)}
                    whileHover={{ x: 6 }}
                    whileTap={{ scale: 0.995 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-6 group cursor-pointer"
                  >
                    {itemInner}
                  </motion.div>
                  {/* Expanded Essay body text */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="mt-8 pt-8 border-t border-black/10 pl-4 md:pl-8 space-y-6">
                          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-black font-bold">
                            <CornerDownRight size={12} /> Nota Completa
                          </div>
                          
                          <motion.div 
                            variants={{
                              show: { transition: { staggerChildren: 0.08 } }
                            }}
                            initial="hidden"
                            animate="show"
                            className="space-y-6 max-w-2xl"
                          >
                            {articleContent[post.id]?.map((paragraph, idx) => (
                              <motion.p
                                key={idx}
                                variants={{
                                  hidden: { opacity: 0, y: 12 },
                                  show: { opacity: 1, y: 0 }
                                }}
                                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                className="text-sm text-zinc-800 leading-relaxed font-normal"
                              >
                                {paragraph}
                              </motion.p>
                            ))}
                          </motion.div>

                          <div className="pt-4 flex items-center justify-between">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
                              Publicado: {post.date}
                            </span>
                            <motion.button
                              onClick={() => setActiveArticle(null)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="text-xs uppercase tracking-widest text-[#1A1A1A] hover:text-black hover:underline transition-colors flex items-center gap-1 font-bold cursor-none"
                            >
                              Cerrar <X size={12} />
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {!isTimelapseMode && totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 font-sans">
              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
                Página {String(currentPage + 1).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
              </span>
              <div className="flex gap-4">
                <button
                  disabled={currentPage === 0}
                  onClick={() => {
                    setCurrentPage(prev => prev - 1);
                    setActiveArticle(null);
                  }}
                  className={`text-[10px] uppercase tracking-[0.25em] font-bold pb-0.5 border-b transition-all duration-350 cursor-none ${
                    currentPage === 0
                      ? 'text-zinc-300 border-transparent'
                      : 'text-[#1A1A1A] border-black hover:text-zinc-500'
                  }`}
                >
                  Anterior
                </button>
                <button
                  disabled={(currentPage + 1) * itemsPerPage >= JOURNAL_POSTS.length}
                  onClick={() => {
                    setCurrentPage(prev => prev + 1);
                    setActiveArticle(null);
                  }}
                  className={`text-[10px] uppercase tracking-[0.25em] font-bold pb-0.5 border-b transition-all duration-300 cursor-none ${
                    (currentPage + 1) * itemsPerPage >= JOURNAL_POSTS.length
                      ? 'text-zinc-300 border-transparent'
                      : 'text-[#1A1A1A] border-black hover:text-zinc-500'
                  }`}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
