import { useEffect, useState } from 'react';
import { getAppConfig } from '../api/apiConfig.js';

/**
 * Round-trip time to the Worker's edge, for when there is no media path to
 * read it from (a teacher who isn't publishing yet, or a student, who never
 * can). It times an empty GET with the browser's own clock — any HTTP response
 * counts, including the Worker's 404 if /api/ping hasn't been deployed yet.
 *
 * Interval is the only cost lever: one tiny request per viewer per tick.
 */
const INTERVAL_MS = 5000;
/** Smoothing: new samples weigh 40%, so one slow request doesn't whip the bars. */
const EWMA_WEIGHT = 0.4;

export interface HttpPing {
  pingMs: number | null;
  /** The request itself failed — offline, or the Worker is unreachable. */
  failed: boolean;
}

export function useHttpPing(): HttpPing {
  const [state, setState] = useState<HttpPing>({ pingMs: null, failed: false });

  useEffect(() => {
    let cancelled = false;
    let smoothed: number | null = null;
    // The first request on a fresh connection also pays for DNS and TLS, so it
    // is measured but not shown — it would read as a spike on every join.
    let warm = false;

    const sample = async (): Promise<void> => {
      if (document.visibilityState !== 'visible') return;
      try {
        const { backendUrl } = await getAppConfig();
        if (!backendUrl) return;
        const startedAt = performance.now();
        await fetch(`${backendUrl}/api/ping?_=${Date.now()}`, { cache: 'no-store' });
        const elapsed = performance.now() - startedAt;
        if (!warm) {
          warm = true;
          return;
        }
        smoothed = smoothed === null ? elapsed : smoothed * (1 - EWMA_WEIGHT) + elapsed * EWMA_WEIGHT;
        if (!cancelled) setState({ pingMs: Math.round(smoothed), failed: false });
      } catch {
        smoothed = null;
        if (!cancelled) setState({ pingMs: null, failed: true });
      }
    };

    void sample();
    const second = setTimeout(() => void sample(), 800);
    const interval = setInterval(() => void sample(), INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(second);
      clearInterval(interval);
    };
  }, []);

  return state;
}
