import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

const VOLUME_KEY = 'rtk:class-volume';
const MUTED_KEY = 'rtk:class-muted';

/**
 * Shared control over the one thing a student can actually adjust: how loud
 * the teacher is.
 *
 * The <audio> elements live in PresenterAudio (they must, so that only the
 * presenter's tracks can ever reach a sink), but the controls belong in the
 * bottom bar next to chat and leave. This context is the seam between them —
 * PresenterAudio applies `volume`/`muted` to its elements and reports whether
 * the browser is actually refusing to play; VolumeMenu renders the UI.
 *
 * Preference is persisted: a student who turns the class down because they're
 * in a shared room should not have it snap back to full every time the teacher
 * toggles a track.
 */
export interface AudioControl {
  /** 0..1 */
  volume: number;
  muted: boolean;
  /** True only when a real audible track exists AND the element is paused. */
  blocked: boolean;
  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
  toggleMuted: () => void;
  /** Called by PresenterAudio with the observed element state. */
  reportBlocked: (b: boolean) => void;
  /** PresenterAudio registers how to retry playback; the UI can invoke it. */
  registerRetry: (fn: () => void) => void;
  retry: () => void;
}

const AudioControlContext = createContext<AudioControl | null>(null);

function readNumber(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 && n <= 1 ? n : fallback;
  } catch {
    return fallback;
  }
}

function readBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw === 'true';
  } catch {
    return fallback;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode / blocked storage — in-memory state still drives this session.
  }
}

export function AudioControlProvider({ children }: { children: ReactNode }): JSX.Element {
  const [volume, setVolumeState] = useState(() => readNumber(VOLUME_KEY, 1));
  const [muted, setMutedState] = useState(() => readBool(MUTED_KEY, false));
  const [blocked, setBlocked] = useState(false);
  const retryRef = useRef<(() => void) | null>(null);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    write(VOLUME_KEY, String(clamped));
    // Dragging the slider up off zero is an unmute in every player the
    // student has ever used; making them also click the speaker would feel
    // broken.
    if (clamped > 0) {
      setMutedState(false);
      write(MUTED_KEY, 'false');
    }
  }, []);

  const setMuted = useCallback((m: boolean) => {
    setMutedState(m);
    write(MUTED_KEY, String(m));
  }, []);

  const toggleMuted = useCallback(() => {
    setMutedState((m) => {
      write(MUTED_KEY, String(!m));
      return !m;
    });
  }, []);

  const registerRetry = useCallback((fn: () => void) => {
    retryRef.current = fn;
  }, []);

  const retry = useCallback(() => {
    retryRef.current?.();
  }, []);

  const value = useMemo<AudioControl>(
    () => ({
      volume,
      muted,
      blocked,
      setVolume,
      setMuted,
      toggleMuted,
      reportBlocked: setBlocked,
      registerRetry,
      retry,
    }),
    [volume, muted, blocked, setVolume, setMuted, toggleMuted, registerRetry, retry]
  );

  return <AudioControlContext.Provider value={value}>{children}</AudioControlContext.Provider>;
}

export function useAudioControl(): AudioControl {
  const ctx = useContext(AudioControlContext);
  if (!ctx) throw new Error('useAudioControl must be used within an AudioControlProvider');
  return ctx;
}
