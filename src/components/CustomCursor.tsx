import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'motion/react';

export default function CustomCursor() {
  const [cursorState, setCursorState] = useState<'default' | 'hover-project' | 'hover-link'>('default');
  const [hoverText, setHoverText] = useState('VIEW');
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Tighter springs — closer to native cursor feel
  const outerSpringX = useSpring(mouseX, { stiffness: 600, damping: 40, mass: 0.3 });
  const outerSpringY = useSpring(mouseY, { stiffness: 600, damping: 40, mass: 0.3 });

  const innerSpringX = useSpring(mouseX, { stiffness: 1200, damping: 50 });
  const innerSpringY = useSpring(mouseY, { stiffness: 1200, damping: 50 });

  useEffect(() => {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouch);
    if (hasTouch) return;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      const closestProject = target.closest('[data-cursor="project"]');
      const closestLink = target.closest('a, button, [role="button"], input, select, textarea');

      if (closestProject) {
        setCursorState('hover-project');
        setHoverText(closestProject.getAttribute('data-cursor-text') || 'VER');
      } else if (closestLink) {
        setCursorState('hover-link');
      } else {
        setCursorState('default');
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, [mouseX, mouseY, isVisible]);

  if (isTouchDevice || !isVisible) return null;

  const isProject = cursorState === 'hover-project';
  const isLink = cursorState === 'hover-link';

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999] flex items-center justify-center rounded-full"
        style={{
          x: outerSpringX,
          y: outerSpringY,
          translateX: '-50%',
          translateY: '-50%',
          width: isProject ? '80px' : isLink ? '45px' : '20px',
          height: isProject ? '80px' : isLink ? '45px' : '20px',
          border: isProject ? 'none' : '1.5px solid #1A1A1A',
          backgroundColor: isProject ? '#1A1A1A' : isLink ? 'rgba(26,26,26,0.08)' : 'transparent',
        }}
        animate={{ scale: isProject ? 1 : isLink ? 1.05 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <AnimatePresence>
          {isProject && (
            <motion.span
              key="hover-text"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="text-[9px] tracking-[0.25em] font-sans font-bold text-[#FAFAFA] text-center"
            >
              {hoverText}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[10000] rounded-full bg-[#1A1A1A]"
        style={{
          x: innerSpringX,
          y: innerSpringY,
          translateX: '-50%',
          translateY: '-50%',
          width: '4px',
          height: '4px',
        }}
        animate={{ scale: isProject ? 0 : isLink ? 1.5 : 1, opacity: isProject ? 0 : 0.8 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      />
    </>
  );
}
