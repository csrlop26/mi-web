import React from 'react';
import { motion } from 'motion/react';

interface MonologButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  target?: string;
  className?: string;
  dataCursorText?: string;
  dark?: boolean;
}

export default function MonologButton({
  children,
  href,
  onClick,
  target,
  className = '',
  dataCursorText,
  dark = false,
}: MonologButtonProps) {
  const hoverBg = dark ? 'bg-[#EAE7E2]' : 'bg-[#0A0A09]';
  const hoverArrow = dark ? 'text-[#0A0A09]' : 'text-[#EAE7E2]';

  const content = (
    <>
      <span className="rolling-text-container shrink-0">
        <span className="rolling-text whitespace-nowrap">{children}</span>
      </span>
      <div className="relative w-8 h-8 shrink-0 flex items-center justify-center overflow-hidden border-l border-current/10 ml-4 pl-0.5">
        {/* Hover expanding background */}
        <div className={`absolute inset-0 ${hoverBg} origin-bottom scale-y-0 group-hover:scale-y-100 transition-transform duration-500 ease-[0.16,1,0.3,1]`} />

        {/* Default Arrow */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 12 12"
          fill="none"
          className="w-3.5 h-3.5 text-current relative z-10 transition-transform duration-500 ease-[0.16,1,0.3,1] group-hover:translate-x-[150%] group-hover:-translate-y-[150%]"
        >
          <path
            d="M8.90954 9.09046L9 3L2.90954 3.09046L2.90213 4.32367L6.86437 4.25391L2.55914 8.55914L3.44086 9.44086L7.74609 5.13563L7.68708 9.10862L8.90954 9.09046Z"
            fill="currentColor"
          />
        </svg>

        {/* Hover Arrow sliding in from bottom-left */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 12 12"
          fill="none"
          className={`w-3.5 h-3.5 ${hoverArrow} absolute z-10 -translate-x-[150%] translate-y-[150%] transition-transform duration-500 ease-[0.16,1,0.3,1] group-hover:translate-x-0 group-hover:translate-y-0`}
        >
          <path
            d="M8.90954 9.09046L9 3L2.90954 3.09046L2.90213 4.32367L6.86437 4.25391L2.55914 8.55914L3.44086 9.44086L7.74609 5.13563L7.68708 9.10862L8.90954 9.09046Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </>
  );

  // No bg-*/text-* utilities here on purpose — every caller supplies its own
  // via `className`, so there is never a same-property Tailwind class
  // collision (equal-specificity utilities have unpredictable winner order).
  const baseClasses = `group flex items-center justify-between border border-current/10 hover:border-current pl-7 pr-1 py-1 transition-colors duration-500 font-sans text-[11px] uppercase tracking-[0.25em] font-semibold cursor-none ${className}`;

  if (href) {
    return (
      <motion.a
        href={href}
        target={target}
        rel={target === '_blank' ? 'noopener noreferrer' : undefined}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
        className={baseClasses}
        data-cursor-text={dataCursorText}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
      className={baseClasses}
      data-cursor-text={dataCursorText}
    >
      {content}
    </motion.button>
  );
}
