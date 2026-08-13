import { useEffect, useRef, useState } from 'react';

/**
 * Maximize a tile without touching its media: this only ever changes the
 * container's CSS position/sizing, never unmounts or remounts the <video>
 * inside it, so toggling never stops, republishes, or resubscribes the
 * underlying track (SINGLE_ACTIVE_HOST_PRESENTER.md).
 *
 * Prefers the real Fullscreen API; if it's unavailable or the browser denies
 * the request (some mobile browsers, iframes without `allowfullscreen`,
 * etc.), falls back to an in-page "maximized" CSS state that covers the
 * viewport without leaving the document — restored the same way, including
 * on Escape, which the Fullscreen API doesn't fire for the fallback.
 */
export function useMaximize<T extends HTMLElement>(): {
  containerRef: React.RefObject<T>;
  isMaximized: boolean;
  toggleMaximize: () => void;
} {
  const containerRef = useRef<T>(null);
  const [browserFullscreen, setBrowserFullscreen] = useState(false);
  const [fallbackMaximized, setFallbackMaximized] = useState(false);

  useEffect(() => {
    const onChange = (): void => setBrowserFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (!fallbackMaximized) return;
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setFallbackMaximized(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [fallbackMaximized]);

  const toggleMaximize = (): void => {
    const el = containerRef.current;
    if (!el) return;

    if (browserFullscreen) {
      void document.exitFullscreen();
      return;
    }
    if (fallbackMaximized) {
      setFallbackMaximized(false);
      return;
    }
    if (document.fullscreenEnabled) {
      el.requestFullscreen().catch(() => setFallbackMaximized(true));
    } else {
      setFallbackMaximized(true);
    }
  };

  return { containerRef, isMaximized: browserFullscreen || fallbackMaximized, toggleMaximize };
}
