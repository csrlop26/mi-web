import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Send, CheckCircle, Mail, ArrowUpRight } from 'lucide-react';
import ConstructionBox from './timelapse/ConstructionBox';
import TypewriterText from './timelapse/TypewriterText';

interface ContactSectionProps {
  step?: number;
  isTimelapseMode?: boolean;
  forceMobile?: boolean;
}

export default function ContactSection({ step = 0, isTimelapseMode = false, forceMobile = false }: ContactSectionProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    projectType: 'E-commerce',
    budget: '1.000€ - 2.000€',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  if (isTimelapseMode && step < 14) {
    return null; // Hidden in early steps
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Enviar solicitud de proyecto a FormSubmit.co (envía un correo a cesarl@augustocs.com)
    fetch("https://formsubmit.co/ajax/cesarl@augustocs.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        Nombre: formData.name,
        Email: formData.email,
        "Tipo de Proyecto": formData.projectType,
        "Inversión Estimada": formData.budget,
        "Especificaciones": formData.message,
        _subject: "Nueva Solicitud de Proyecto - AugustoCS"
      })
    })
      .then(() => {
        setLoading(false);
        setSubmitted(true);
        // Resetear formulario
        setFormData({
          name: '',
          email: '',
          projectType: 'E-commerce',
          budget: '1.000€ - 2.000€',
          message: '',
        });
      })
      .catch((err) => {
        console.error("Error al enviar el formulario:", err);
        // Marcamos como enviado de todos modos para no bloquear el flujo del usuario
        setLoading(false);
        setSubmitted(true);
      });
  };

  const projectTypes = [
    'E-commerce',
    'Landing Page',
    'Web Corporativa',
    'Aplicación Web / SaaS',
  ];

  const budgets = [
    '< 1.000€',
    '1.000€ - 2.000€',
    '2.000€+',
  ];


  return (
    <motion.section
      initial={{ y: isTimelapseMode ? 35 : 30, opacity: 0 }}
      animate={isTimelapseMode ? { y: 0, opacity: 1 } : undefined}
      whileInView={!isTimelapseMode ? { y: 0, opacity: 1 } : undefined}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      id="contact"
      className={`${forceMobile ? 'py-12 px-5' : 'py-20 sm:py-24 md:py-40 px-5 sm:px-8 md:px-12 lg:px-20 max-w-[1440px] mx-auto'} border-t border-black/10 relative`}
    >
      <div className={`grid grid-cols-1 ${forceMobile ? 'gap-10' : 'lg:grid-cols-12 gap-16 lg:gap-24'}`}>
        {/* Left Side: Editorial Prompt */}
        <div className={forceMobile ? 'space-y-8 font-sans' : 'lg:col-span-5 space-y-12 font-sans'}>
          <div className="space-y-6">
            <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-[#1A1A1A] block font-bold">
              {isTimelapseMode ? <TypewriterText text="03 / Conversemos" speed={20} /> : '03 / Conversemos'}
            </span>
            <h2 className={`font-serif ${forceMobile ? 'text-4xl' : 'text-5xl md:text-6xl lg:text-7xl'} font-normal tracking-[-0.02em] leading-[1.05] text-zinc-900`}>
              {isTimelapseMode ? (
                <TypewriterText text="Hagamos realidad tu visión." speed={15} />
              ) : (
                <>
                  Hagamos <br />
                  realidad tu <span className="text-zinc-400 font-light">visión.</span>
                </>
              )}
            </h2>
          </div>

          <div className="space-y-4">
            <p className="text-sm md:text-base text-zinc-600 leading-[1.8] max-w-sm font-light">
              {isTimelapseMode ? (
                <TypewriterText text="Todo gran proyecto comienza con una conversación. Cuéntanos qué imaginas para tu marca y diseñaremos juntos el camino para hacerlo excepcional. Te responderemos con una propuesta a medida." speed={10} />
              ) : (
                'Todo gran proyecto comienza con una conversación. Cuéntanos qué imaginas para tu marca y diseñaremos juntos el camino para hacerlo excepcional. Te responderemos con una propuesta a medida.'
              )}
            </p>
            <div className="inline-block">
              <a
                href="mailto:cesarl@augustocs.com"
                className="group relative inline-flex items-center gap-2 font-serif text-lg md:text-2xl text-[#1A1A1A] hover:text-black transition-colors duration-300 pb-2 mt-4 break-all sm:break-normal cursor-none"
                data-cursor="project"
                data-cursor-text="EMAIL"
              >
                <Mail size={20} />
                {isTimelapseMode ? <TypewriterText text="cesarl@augustocs.com" speed={15} /> : 'cesarl@augustocs.com'}
                {/* Underline expanding from center */}
                {!isTimelapseMode && (
                  <span className="absolute bottom-0 left-1/2 w-0 h-[1.5px] bg-[#1A1A1A] group-hover:w-full group-hover:left-0 transition-all duration-500" />
                )}
              </a>
            </div>
          </div>

          <div className="pt-8 border-t border-black/10 space-y-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">
              {isTimelapseMode ? <TypewriterText text="Base de Operaciones" speed={15} /> : 'Base de Operaciones'}
            </span>
            <p className="text-xs text-zinc-800 font-medium">
              {isTimelapseMode ? <TypewriterText text="Castellón / España / Digital" speed={15} /> : 'Castellón / España / Digital'}
            </p>
          </div>
        </div>

        {/* Right Side: High-End Minimalist Form */}
        <div className={forceMobile ? 'bg-[#F4F2EE] border border-black/5 p-6 shadow-sm relative overflow-hidden' : 'lg:col-span-7 bg-[#F4F2EE] border border-black/5 rounded-none p-8 md:p-12 shadow-sm relative overflow-hidden'}>
          <div className="absolute top-0 left-0 w-full h-[1.5px] bg-[#1A1A1A]" />

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center text-center py-16 space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center text-black border border-black/10">
                <CheckCircle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="font-serif text-2xl font-bold text-zinc-900">Mensaje Enviado</h3>
                <p className="font-sans text-xs text-zinc-500 max-w-sm mx-auto">
                  Hemos recibido tus requerimientos. Analizaremos tu propuesta y te responderemos a la brevedad con una solución estructurada.
                </p>
              </div>
              <motion.button
                onClick={() => setSubmitted(false)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="font-sans text-[10px] uppercase tracking-[0.2em] underline text-zinc-500 hover:text-black transition-colors pt-4 cursor-none"
              >
                Enviar otra solicitud
              </motion.button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-1">
                <h3 className="font-serif text-xl font-medium text-zinc-900">
                  {isTimelapseMode ? <TypewriterText text="Solicitud de Proyecto" speed={20} /> : 'Solicitud de Proyecto'}
                </h3>
                <p className="font-sans text-xs text-zinc-500">
                  {isTimelapseMode ? <TypewriterText text="Detalla tus especificaciones a continuación." speed={15} /> : 'Detalla tus especificaciones a continuación.'}
                </p>
              </div>

              {/* Standard layout fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Name */}
                <div className="space-y-2 relative">
                  <label className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#1A1A1A] font-bold block">
                    {isTimelapseMode ? <TypewriterText text="Tu Nombre" speed={15} /> : 'Tu Nombre'}
                  </label>
                  {isTimelapseMode ? (
                    <div className="w-full border-b border-black/15 py-3 text-sm text-[#1A1A1A] font-medium min-h-[45px]">
                      <TypewriterText text="ej. Carlos" speed={20} className="text-zinc-400" />
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="ej. Carlos"
                      className="w-full bg-transparent border-b border-black/15 py-3 text-sm text-[#1A1A1A] placeholder-zinc-400 focus:outline-none transition-colors duration-300 font-medium cursor-none"
                    />
                  )}
                  {/* Underline expanding from center */}
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: focusedField === 'name' ? 1 : 0 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#1A1A1A] origin-center pointer-events-none"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2 relative">
                  <label className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#1A1A1A] font-bold block">
                    {isTimelapseMode ? <TypewriterText text="Email Corporativo" speed={15} /> : 'Email Corporativo'}
                  </label>
                  {isTimelapseMode ? (
                    <div className="w-full border-b border-black/15 py-3 text-sm text-[#1A1A1A] font-medium min-h-[45px]">
                      <TypewriterText text="ej. director@marca.com" speed={20} className="text-zinc-400" />
                    </div>
                  ) : (
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="ej. director@marca.com"
                      className="w-full bg-transparent border-b border-black/15 py-3 text-sm text-[#1A1A1A] placeholder-zinc-400 focus:outline-none transition-colors duration-300 font-medium cursor-none"
                    />
                  )}
                  {/* Underline expanding from center */}
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: focusedField === 'email' ? 1 : 0 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#1A1A1A] origin-center pointer-events-none"
                  />
                </div>
              </div>

              {/* Project Type Options */}
              <div className="space-y-3 font-sans">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#1A1A1A] font-bold block">
                  {isTimelapseMode ? <TypewriterText text="Tipo de Proyecto" speed={15} /> : 'Tipo de Proyecto'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {projectTypes.map((type) => {
                    const isSelected = formData.projectType === type;
                    const buttonInner = isTimelapseMode ? <TypewriterText text={type} speed={15} /> : type;
                    
                    if (isTimelapseMode) {
                      return (
                        <div
                          key={type}
                          className={`text-left p-3 text-xs border ${
                            isSelected
                              ? 'bg-black/5 border-black text-black font-bold'
                              : 'bg-[#EAE7E1] border-black/5 text-zinc-600'
                          }`}
                        >
                          {buttonInner}
                        </div>
                      );
                    }

                    return (
                      <motion.button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, projectType: type })}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={`text-left p-3 text-xs rounded-none border transition-colors duration-300 cursor-none ${
                          isSelected
                            ? 'bg-black/5 border-black text-black font-bold'
                            : 'bg-[#EAE7E1] border-black/5 text-zinc-600 hover:border-black/20'
                        }`}
                      >
                        {buttonInner}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Budget Estimation */}
              <div className="space-y-3 font-sans">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#1A1A1A] font-bold block">
                  {isTimelapseMode ? <TypewriterText text="Inversión Estimada" speed={15} /> : 'Inversión Estimada'}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {budgets.map((b) => {
                    const isSelected = formData.budget === b;
                    const bInner = isTimelapseMode ? <TypewriterText text={b} speed={15} /> : b;

                    if (isTimelapseMode) {
                      return (
                        <div
                          key={b}
                          className={`text-center py-2 text-xs border ${
                            isSelected
                              ? 'bg-black/5 border-black text-black font-bold'
                              : 'bg-[#EAE7E1] border-black/5 text-zinc-600'
                          }`}
                        >
                          {bInner}
                        </div>
                      );
                    }

                    return (
                      <motion.button
                        key={b}
                        type="button"
                        onClick={() => setFormData({ ...formData, budget: b })}
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.985 }}
                        className={`text-center py-2 text-xs rounded-none border transition-colors duration-300 cursor-none ${
                          isSelected
                            ? 'bg-black/5 border-black text-black font-bold'
                            : 'bg-[#EAE7E1] border-black/5 text-zinc-600 hover:border-black/20'
                        }`}
                      >
                        {bInner}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Brief Outline Description */}
              <div className="space-y-2">
                <label className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#1A1A1A] font-bold block">
                  {isTimelapseMode ? <TypewriterText text="Descripción del Proyecto" speed={15} /> : 'Descripción del Proyecto'}
                </label>
                {isTimelapseMode ? (
                  <div className="w-full border rounded-none p-4 text-sm text-[#1A1A1A] border-black/15 min-h-[90px]">
                    <TypewriterText text="Detalla los elementos espaciales, el tono deseado, plazos..." speed={12} className="text-zinc-400" />
                  </div>
                ) : (
                  <textarea
                    rows={3}
                    value={formData.message}
                    onFocus={() => setFocusedField('message')}
                    onBlur={() => setFocusedField(null)}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Detalla los elementos espaciales, el tono deseado, plazos..."
                    className={`w-full bg-transparent border rounded-none p-4 text-sm text-[#1A1A1A] placeholder-zinc-400 focus:outline-none transition-colors duration-300 cursor-none ${
                      focusedField === 'message' ? 'border-black' : 'border-black/15'
                    }`}
                  />
                )}
              </div>

              {/* Submit with loading feedback */}
              <motion.button
                type="submit"
                disabled={loading || isTimelapseMode}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full text-center py-4 bg-[#1A1A1A] text-[#FDFCFB] font-semibold text-xs uppercase tracking-[0.2em] rounded-none hover:bg-zinc-850 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-none ${
                  isTimelapseMode ? 'bg-transparent text-sky-400 border border-dashed border-sky-300' : ''
                }`}
              >
                {isTimelapseMode ? (
                  <TypewriterText text="[btn_submit_proposal]" speed={20} />
                ) : loading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-[#FAFAFA] border-t-transparent rounded-full" />
                    Enviando solicitud...
                  </>
                ) : (
                  <>
                    Enviar Propuesta <ArrowUpRight size={14} />
                  </>
                )}
              </motion.button>
            </form>
          )}
        </div>
      </div>
    </motion.section>
  );
}
