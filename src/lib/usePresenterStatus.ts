import { useEffect, useState } from 'react';
import { getPresenterStatus } from '../api/presenterApi.js';

const POLL_MS = 4000;

export interface PresenterStatusResult {
  activePresenterId: string | null;
  /** True when the lock service couldn't be reached — "unknown", not "nobody". */
  unavailable: boolean;
}

/**
 * Who is the authoritative active presenter right now, per the server's
 * PresenterLock (see SINGLE_ACTIVE_HOST_PRESENTER.md). The student stage
 * must be derived from this id, not from whichever remote track happens to
 * arrive first — that's what keeps a standby host's stray track (or two
 * hosts racing) from ever reaching the stage.
 */
export function usePresenterStatus(sessionId: string): PresenterStatusResult {
  const [result, setResult] = useState<PresenterStatusResult>({ activePresenterId: null, unavailable: false });

  useEffect(() => {
    let cancelled = false;
    const tick = async (): Promise<void> => {
      const status = await getPresenterStatus(sessionId);
      if (cancelled) return;
      const next: PresenterStatusResult = {
        activePresenterId: status.activePresenterId,
        unavailable: Boolean(status.unavailable),
      };
      // Returning a fresh object every poll re-rendered the whole stage — and
      // with it the <video> subtree — every POLL_MS regardless of whether
      // anything had actually changed. Keep the previous reference when the
      // answer is the same.
      setResult((prev) =>
        prev.activePresenterId === next.activePresenterId && prev.unavailable === next.unavailable ? prev : next
      );
    };
    void tick();
    const interval = setInterval(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionId]);

  return result;
}
