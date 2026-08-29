import { useEffect, useRef, useState } from 'react';
import type { RTKParticipant } from '@cloudflare/realtimekit-react';

/**
 * Is the stream this student is receiving struggling?
 *
 * Screen share has no simulcast (see host-app's streamQuality.ts), so a
 * student on a weak link cannot be handed a lighter version — they lose
 * packets and the picture pauses. Nothing here fixes that, but leaving it
 * unexplained is its own problem: a frozen slide looks exactly like a teacher
 * who simply stopped talking.
 *
 * Two signals, because neither is sufficient alone:
 * - 'poorConnection' fires when a stream degrades, but the SDK has no
 *   matching "recovered" event, so on its own it would latch on forever.
 * - 'mediaScoreUpdate' keeps reporting, so a healthy score clears the badge
 *   as soon as the network settles instead of waiting out the timeout.
 */
const RECOVERY_MS = 15000;

/**
 * The score's scale isn't documented in the installed typings — the
 * ConsumerScoreStats type is publicly re-exported from
 * '@cloudflare/realtimekit-callstats', which the SDK lists only as a
 * devDependency - so consumers never receive it and the import can never
 * resolve (skipLibCheck is what keeps the build green). Do not try to fix
 * that by installing it; it would not tell us the numeric range anyway.
 * Normalize the two plausible conventions (mediasoup-style 0-10 and
 * percentage 0-100) onto a single 0-10 scale instead.
 */
function normalizeScore(raw: number): number {
  return raw > 10 ? raw / 10 : raw;
}

const POOR_AT_OR_BELOW = 5;

export function useConnectionQuality(participant: RTKParticipant | undefined): boolean {
  const [poor, setPoor] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearTimer = (): void => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };

    setPoor(false);
    clearTimer();
    if (!participant) return;

    const markPoor = (): void => {
      setPoor(true);
      clearTimer();
      // Fallback only, for when events stop arriving entirely.
      timerRef.current = setTimeout(() => setPoor(false), RECOVERY_MS);
    };

    const onPoorConnection = (): void => markPoor();

    const onScore = (payload: { score: number }): void => {
      const raw = payload?.score;
      if (typeof raw !== 'number' || Number.isNaN(raw)) return;
      if (normalizeScore(raw) > POOR_AT_OR_BELOW) {
        clearTimer();
        setPoor(false);
        return;
      }
      markPoor();
    };

    participant.on('poorConnection', onPoorConnection);
    participant.on('mediaScoreUpdate', onScore);
    return () => {
      participant.off('poorConnection', onPoorConnection);
      participant.off('mediaScoreUpdate', onScore);
      clearTimer();
    };
  }, [participant]);

  return poor;
}
