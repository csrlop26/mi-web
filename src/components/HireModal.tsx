import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, ArrowRight, CheckCircle } from 'lucide-react';

interface HireModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HireModal({ isOpen, onClose }: HireModalProps) {
  const [activeStep, setActiveStep] = useState<1 | 2>(1);
  const [bookingType, setBookingType] = useState<'consult' | 'emergency'>('consult');
  const [isMobile, setIsMobile] = useState(false);
  
  const [details, setDetails] = useState({
    name: '',
    email: '',
    timeSlot: '16:00 CET',
    notes: '',
  });

  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);

  // Freeze background scrolling when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setFinished(true);
    }, 1200);
  };

  const handleClose = () => {
    onClose();
    // Reset state with delay to let close transitions end smoothly
    setTimeout(() => {
      setActiveStep(1);
      setFinished(false);
      setDetails({ name: '', email: '', timeSlot: '16:00 CET', notes: '' });
    }, 500);
  };

  const timeSlots = [
    '10:00 GMT+1',
    '14:00 CET',
    '16:00 CET',
    '18:30 CET',
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 overflow-hidden">
          {/* Blur backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Consultation Drawer Box */}
          <motion.div
            initial={isMobile ? { y: '100%', opacity: 1 } : { scale: 0.96, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={isMobile ? { y: '100%', opacity: 1 } : { scale: 0.96, opacity: 0, y: 20 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-[#FDFCFB] border border-black/10 rounded-t-[20px] sm:rounded-none w-full max-w-[900px] h-[92vh] sm:h-auto max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl z-10"
          >
            {/* iOS style drag indicator on mobile */}
            <div className="w-12 h-1 bg-zinc-300 rounded-full mx-auto my-3 md:hidden flex-shrink-0 animate-pulse" />

            {/* Close trigger */}
            <motion.button
              onClick={handleClose}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/5 border border-black/5 hover:bg-black/10 hover:text-black transition-all cursor-none"
              aria-label="Close scheduler"
            >
              <X size={14} className="text-zinc-800" />
            </motion.button>

            {/* Accent top border */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-[#1A1A1A] hidden sm:block" />

            {/* Left side: branding/editorial panel */}
            <div className="w-full md:w-5/12 bg-[#F4F2EE] p-6 md:p-12 flex flex-col justify-between border-b md:border-b-0 md:border-r border-black/10 font-sans">
              <div className="space-y-4 md:space-y-6">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#1A1A1A] font-bold block">
                  Consulta inicial
                </span>

                <h3 className="font-serif text-2xl md:text-3xl font-light tracking-tight text-zinc-900 leading-tight">
                  Consulta de Diseño
                </h3>

                <p className="text-[11px] md:text-xs text-zinc-655 leading-relaxed font-light">
                  Una revisión de diseño de 20 minutos donde analizamos tu estructura digital, el equilibrio de espacios y la tipografía de tu proyecto actual.
                </p>
              </div>

              <div className="flex flex-row md:flex-col gap-4 md:gap-4 pt-6 md:pt-12 items-center md:items-start">
                <div className="flex items-center gap-3 text-xs text-zinc-800">
                  <Clock size={14} className="text-black" />
                  <span>20 minutos</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-800">
                  <Calendar size={14} className="text-black" />
                  <span>Videollamada</span>
                </div>
              </div>

              <div className="pt-4 border-t border-black/15 mt-4 hidden md:block">
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest block font-medium">
                  AUGUSTOCS — ESTUDIO DIGITAL
                </span>
              </div>
            </div>

            {/* Right side: Interactive scheduler steps */}
            <div className="w-full md:w-7/12 p-6 md:p-12 overflow-y-auto flex-1">
              {finished ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center py-8 space-y-6 font-sans"
                >
                  <div className="w-14 h-14 rounded-full bg-black/5 flex items-center justify-center text-black border border-black/10">
                    <CheckCircle size={24} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-serif text-xl font-medium text-zinc-900">Cita Confirmada</h4>
                    <p className="text-xs text-zinc-600 max-w-sm mx-auto">
                      Tu cita a las <strong className="text-black font-semibold">{details.timeSlot}</strong> está confirmada. Recibirás la invitación de calendario en {details.email}.
                    </p>
                  </div>
                  <motion.button
                    onClick={handleClose}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="font-sans text-[10px] uppercase tracking-[0.2em] bg-[#1A1A1A] hover:bg-zinc-800 text-white py-3 px-8 rounded-none transition-colors cursor-none font-bold"
                  >
                    Cerrar
                  </motion.button>
                </motion.div>
              ) : (
                <form onSubmit={handleBook} className="space-y-6 font-sans h-full flex flex-col justify-between">
                  <AnimatePresence mode="wait">
                    {activeStep === 1 ? (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 16 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="space-y-6 flex-1"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] text-zinc-450 font-bold block">PASO 1 DE 2</span>
                          <h4 className="font-serif text-lg font-medium text-zinc-900">Tipo de Consulta</h4>
                        </div>

                        <div className="space-y-3">
                          <motion.button
                            type="button"
                            onClick={() => setBookingType('consult')}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className={`w-full p-4 rounded-none border text-left flex items-start gap-4 transition-all duration-350 cursor-none ${
                              bookingType === 'consult'
                                ? 'bg-black/5 border-black text-[#1A1A1A] font-bold'
                                : 'bg-[#EAE7E1] border-black/5 hover:border-black/20'
                            }`}
                          >
                            <div className={`mt-1 w-4 h-4 rounded-full border flex items-center justify-center ${
                              bookingType === 'consult' ? 'border-black' : 'border-zinc-300'
                            }`}>
                              {bookingType === 'consult' && <div className="w-2 h-2 rounded-full bg-black" />}
                            </div>
                            <div>
                              <span className="font-serif text-[15px] font-medium text-zinc-900 block">Consultoría Estratégica Digital</span>
                              <span className="text-[11px] text-zinc-650 block mt-1 font-light">Análisis de composición visual, estructura editorial y propuesta de mejoras.</span>
                            </div>
                          </motion.button>

                          <motion.button
                            type="button"
                            onClick={() => setBookingType('emergency')}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className={`w-full p-4 rounded-none border text-left flex items-start gap-4 transition-all duration-350 cursor-none ${
                              bookingType === 'emergency'
                                ? 'bg-black/5 border-black text-[#1A1A1A] font-bold'
                                : 'bg-[#EAE7E1] border-black/5 hover:border-black/20'
                            }`}
                          >
                            <div className={`mt-1 w-4 h-4 rounded-full border flex items-center justify-center ${
                              bookingType === 'emergency' ? 'border-black' : 'border-zinc-300'
                            }`}>
                              {bookingType === 'emergency' && <div className="w-2 h-2 rounded-full bg-black" />}
                            </div>
                            <div>
                              <span className="font-serif text-[15px] font-medium text-zinc-900 block">Revisión Rápida de Interfaz</span>
                              <span className="text-[11px] text-zinc-650 block mt-1 font-light">Resolución de problemas de layout, transiciones y ajustes de estilo urgentes.</span>
                            </div>
                          </motion.button>
                        </div>

                        <div className="pt-6 border-t border-black/10 flex justify-end">
                          <motion.button
                            type="button"
                            onClick={() => setActiveStep(2)}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="font-sans text-xs uppercase tracking-[0.2em] bg-[#1A1A1A] text-white font-bold py-3 px-6 rounded-none hover:bg-zinc-800 transition-colors flex items-center gap-2 cursor-none"
                          >
                            Continuar <ArrowRight size={12} />
                          </motion.button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -16 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="space-y-6 flex-1"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] text-zinc-500 font-bold block">PASO 2 DE 2</span>
                          <h4 className="font-serif text-lg font-medium text-zinc-900">Selecciona Horario</h4>
                        </div>

                        {/* Info fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase tracking-widest block font-bold">Tu Nombre</label>
                            <input
                              type="text"
                              required
                              value={details.name}
                              onChange={(e) => setDetails({ ...details, name: e.target.value })}
                              placeholder="ej. Carlos"
                              className="w-full bg-[#EAE7E1] border border-black/10 rounded-none px-4 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-black transition-colors cursor-none font-medium"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase tracking-widest block font-bold">Email Corporativo</label>
                            <input
                              type="email"
                              required
                              value={details.email}
                              onChange={(e) => setDetails({ ...details, email: e.target.value })}
                              placeholder="ej. director@marca.com"
                              className="w-full bg-[#EAE7E1] border border-black/10 rounded-none px-4 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-black transition-colors cursor-none font-medium"
                            />
                          </div>
                        </div>

                        {/* Time Slot Horizontal selection */}
                        <div className="space-y-2">
                          <label className="text-[10px] text-zinc-500 uppercase tracking-widest block font-bold">Selecciona Franja Horaria</label>
                          <div className="grid grid-cols-2 gap-2">
                            {timeSlots.map((slot) => {
                              const isChosen = details.timeSlot === slot;
                              return (
                                <motion.button
                                  key={slot}
                                  type="button"
                                  onClick={() => setDetails({ ...details, timeSlot: slot })}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  className={`py-2 text-[11px] font-sans rounded-none border transition-colors duration-300 cursor-none ${
                                    isChosen
                                      ? 'bg-black/5 border-black text-black font-bold'
                                      : 'bg-[#EAE7E1] border-black/5 text-zinc-650 hover:border-black/20'
                                  }`}
                                >
                                  {slot}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Notes brief */}
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500 uppercase tracking-widest block font-bold">Notas Adicionales</label>
                          <textarea
                            rows={2}
                            value={details.notes}
                            onChange={(e) => setDetails({ ...details, notes: e.target.value })}
                            placeholder="ej. Hablar sobre paleta de colores, estructura del layout..."
                            className="w-full bg-[#EAE7E1] border border-black/10 rounded-none px-4 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-black transition-colors cursor-none"
                          />
                        </div>

                        <div className="pt-6 border-t border-black/10 flex justify-between items-center">
                          <motion.button
                            type="button"
                            onClick={() => setActiveStep(1)}
                            whileTap={{ scale: 0.95 }}
                            className="font-sans text-xs uppercase tracking-[0.2em] text-zinc-500 hover:text-black font-bold py-3 cursor-none"
                          >
                            Volver
                          </motion.button>
                          <motion.button
                            type="submit"
                            disabled={loading}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="font-sans text-xs uppercase tracking-[0.2em] bg-[#1A1A1A] text-white font-bold py-3 px-8 rounded-none hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-none"
                          >
                            {loading ? 'Confirmando...' : 'Confirmar Cita'}
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
