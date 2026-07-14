import { useEffect, useState, useRef } from 'react';

export default function CustomCursor() {
  const [cursorState, setCursorState] = useState<'default' | 'active' | 'active-edge'>('default');
  const [hoverText, setHoverText] = useState('');
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const posRef = useRef({ x: -100, y: -100, currentX: -100, currentY: -100 });
  const cursorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouch);
    if (hasTouch) return;

    const handleMouseMove = (e: MouseEvent) => {
      posRef.current.x = e.clientX;
      posRef.current.y = e.clientY;
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const closestCursorText = target.closest('[data-cursor-text]');
      if (closestCursorText) {
        setHoverText(closestCursorText.getAttribute('data-cursor-text') || '');
        // Edge detection to prevent clipping on the right
        if (e.clientX > window.innerWidth - 130) {
          setCursorState('active-edge');
        } else {
          setCursorState('active');
        }
      } else {
        setCursorState('default');
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
    window.addEventListener('mouseover', handleMouseOver);

    // Anim frame loop for smooth cursor tracking
    let animId: number;
    const updatePosition = () => {
      const pos = posRef.current;
      // smooth interpolation
      pos.currentX += (pos.x - pos.currentX) * 0.15;
      pos.currentY += (pos.y - pos.currentY) * 0.15;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${pos.currentX}px, ${pos.currentY}px, 0)`;
      }

      animId = requestAnimationFrame(updatePosition);
    };
    updatePosition();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      window.removeEventListener('mouseover', handleMouseOver);
      cancelAnimationFrame(animId);
    };
  }, [isVisible]);

  if (isTouchDevice || !isVisible) return null;

  return (
    <div
      ref={cursorRef}
      className="cursor-wrap fixed top-0 left-0 pointer-events-none z-[9999]"
      data-cursor={cursorState === 'default' ? '' : cursorState}
    >
      {/* Outer Rectangular Bubble with revealed text — solid chip with a
          bright border/shadow so it stays legible over both light and dark
          sections (text-blending a labeled chip goes illegible, so only the
          plain dot below uses true color inversion). */}
      <div className="cursor-bubble bg-[#0A0A09] border border-white/25 px-4 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.35)] flex items-center justify-center min-w-[70px]">
        <span className="cursor-bubble__text font-sans text-[8px] tracking-[0.25em] font-bold text-[#EAE7E2] uppercase block whitespace-nowrap">
          {hoverText}
        </span>
      </div>

      {/* Tiny precise pointer dot — same difference-blend trick */}
      {cursorState === 'default' && (
        <div
          className="w-2 h-2 bg-white rounded-full absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300"
          style={{ mixBlendMode: 'difference' }}
        />
      )}
    </div>
  );
}
