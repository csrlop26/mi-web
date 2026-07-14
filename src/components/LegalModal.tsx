import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, Scale } from 'lucide-react';

interface LegalModalProps {
  type: 'terms' | 'privacy' | null;
  onClose: () => void;
}

export default function LegalModal({ type, onClose }: LegalModalProps) {
  useEffect(() => {
    if (type) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [type]);

  const isOpen = type !== null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-4 sm:p-6 md:p-10">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 bg-[#1a1a1a]/50 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl max-h-[85vh] bg-[#FDFCFB] border border-black/10 shadow-2xl flex flex-col z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center gap-4 px-6 py-5 border-b border-black/10 bg-[#FDFCFB]">
              <div className="flex items-center gap-2.5">
                {type === 'terms' ? (
                  <>
                    <Scale size={16} className="text-zinc-600" />
                    <span className="font-sans text-[11px] uppercase tracking-[0.2em] font-bold text-[#1a1a1a]">
                      Términos de Servicio
                    </span>
                  </>
                ) : (
                  <>
                    <Shield size={16} className="text-zinc-600" />
                    <span className="font-sans text-[11px] uppercase tracking-[0.2em] font-bold text-[#1a1a1a]">
                      Política de Privacidad
                    </span>
                  </>
                )}
              </div>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-black transition-all cursor-none"
                aria-label="Cerrar"
              >
                <X size={15} />
              </motion.button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 font-sans text-sm text-zinc-700 leading-relaxed space-y-6">
              {type === 'terms' ? (
                <>
                  <div className="space-y-2">
                    <h3 className="font-serif text-lg font-bold text-black">1. Titularidad del Sitio</h3>
                    <p>
                      Este sitio web es propiedad exclusiva de AugustoCS (César López), con domicilio de operaciones en Castellón de la Plana, España. Correo de contacto: <a href="mailto:cesarl@augustocs.com" className="underline hover:text-black">cesarl@augustocs.com</a>.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-lg font-bold text-black">2. Propiedad Intelectual</h3>
                    <p>
                      Todos los contenidos, diseños, código fuente, logotipos, textos, ilustraciones, mockups y marcas comerciales expuestos en este sitio web están protegidos por derechos de propiedad intelectual propiedad de AugustoCS o de sus respectivos clientes y licenciantes. Queda prohibida la reproducción, distribución o modificación no autorizada de estos materiales.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-lg font-bold text-black">3. Uso del Sitio</h3>
                    <p>
                      El acceso a este sitio web es libre y gratuito. El usuario se compromete a realizar un uso lícito y adecuado de los servicios y contenidos mostrados, absteniéndose de realizar cualquier acción que pueda dañar la infraestructura o alterar el funcionamiento del sitio.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-lg font-bold text-black">4. Limitación de Responsabilidad</h3>
                    <p>
                      AugustoCS hace todo lo posible por asegurar la continuidad y veracidad de los contenidos del sitio, pero no garantiza la ausencia de interrupciones temporales o la infalibilidad absoluta de la información. No nos hacemos responsables de daños resultantes de un uso inadecuado del sitio web.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-lg font-bold text-black">5. Jurisdicción</h3>
                    <p>
                      Para cualquier conflicto derivado de la interpretación o ejecución de estos términos, las partes se someten a la legislación española y a la jurisdicción de los tribunales de Castellón de la Plana, España.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <h3 className="font-serif text-lg font-bold text-black">1. Responsable del Tratamiento</h3>
                    <p>
                      El responsable del tratamiento de los datos recabados en este sitio web es César López (AugustoCS), con domicilio en Castellón de la Plana, España. Email de contacto: <a href="mailto:cesarl@augustocs.com" className="underline hover:text-black">cesarl@augustocs.com</a>.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-lg font-bold text-black">2. Datos Recabados y Finalidad</h3>
                    <p>
                      Este sitio web no requiere registro previo para su navegación. Únicamente recopilamos los datos personales que usted decida enviarnos voluntariamente a través del correo de contacto o al solicitar información sobre nuestros servicios de diseño web y desarrollo de tiendas online. La finalidad del tratamiento es atender y gestionar su consulta o propuesta de colaboración.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-lg font-bold text-black">3. Base Legal del Tratamiento</h3>
                    <p>
                      La base jurídica que legitima el tratamiento de sus datos es su consentimiento explícito manifestado al enviarnos un correo electrónico o al ponerse en contacto para iniciar un proyecto.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-lg font-bold text-black">4. Conservación y Destinatarios</h3>
                    <p>
                      Los datos se conservarán durante el tiempo necesario para cumplir con la consulta realizada o la relación comercial correspondiente. No se realizarán cesiones de datos a terceros, salvo imperativo o requerimiento legal.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-lg font-bold text-black">5. Sus Derechos</h3>
                    <p>
                      Usted puede ejercer en cualquier momento sus derechos de acceso, rectificación, supresión, oposición y limitación del tratamiento escribiendo a <a href="mailto:cesarl@augustocs.com" className="underline hover:text-black">cesarl@augustocs.com</a> e indicando el derecho que desea solicitar.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-black/5 bg-[#F4F2EE] flex justify-end flex-shrink-0">
              <button
                onClick={onClose}
                className="font-sans text-[10px] uppercase tracking-[0.2em] bg-[#1a1a1a] text-[#FDFCFB] px-5 py-2.5 font-bold hover:bg-zinc-800 transition-all cursor-none"
              >
                Entendido
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
