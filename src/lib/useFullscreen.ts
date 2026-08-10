import { useEffect, useRef, useState } from 'react';

/**
 * Wraps the Fullscreen API for a single tile element. `fullscreenchange`
 * fires for exits triggered outside our button too (Esc key, browser UI),
 * so state is derived from `document.fullscreenElement` rather than tracked
 * locally.
 */
export function useFullscreen<T extends HTMLElement>(): {
  containerRef: React.RefObject<T>;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
} {
  const containerRef = useRef<T>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = (): void => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = (): void => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen();
    }
  };

  return { containerRef, isFullscreen, toggleFullscreen };
}
