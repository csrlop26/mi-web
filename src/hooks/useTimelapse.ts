import { useState, useEffect } from 'react';

export function useTimelapse(
  totalSteps: number,
  isActive: boolean,
  isAutoplay: boolean,
  intervalMs: number = 1600,
  onComplete?: () => void
) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setStep(0);
      return;
    }

    // Autoplay
    if (isAutoplay) {
      const interval = setInterval(() => {
        setStep((prev) => {
          if (prev >= totalSteps) {
            clearInterval(interval);
            if (onComplete) onComplete();
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
      return () => clearInterval(interval);
    }


    // Navegación manual con flechas de teclado (útil para depurar y revisar flujo)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setStep((prev) => Math.min(prev + 1, totalSteps));
      } else if (e.key === 'ArrowLeft') {
        setStep((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalSteps, isActive, isAutoplay, onComplete]);

  return { step, setStep };
}
