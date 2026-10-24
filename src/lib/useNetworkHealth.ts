import { useEffect, useRef, useState } from 'react';
import { useRealtimeKitMeeting } from '@cloudflare/realtimekit-react';
import { useHttpPing } from './useHttpPing.js';
import {
  EMPTY_HEALTH,
  composeHealth,
  sameHealth,
  type NetworkHealth,
  type ScoreSample,
  type ScoreStatsLike,
} from './networkHealth.js';

const TICK_MS = 1000;

/**
 * Live network reading for this student's incoming stream.
 *
 * The SDK emits `mediaScoreUpdate` on `meeting.participants` for every remote
 * stream this student consumes. Only the teacher can publish (the student
 * preset forbids it), so those scores are the quality of the class stream as
 * this student receives it. Ping is a timed request to the Worker — a student
 * has no outgoing media path to read a round-trip time from.
 */
export function useNetworkHealth(): NetworkHealth {
  const { meeting } = useRealtimeKitMeeting();
  const http = useHttpPing();
  const [health, setHealth] = useState<NetworkHealth>(EMPTY_HEALTH);
  const samplesRef = useRef(new Map<string, ScoreSample>());
  const httpRef = useRef(http);
  httpRef.current = http;

  useEffect(() => {
    const onScore = (payload: { kind: string; isScreenshare: boolean; score: number; scoreStats?: unknown }): void => {
      if (typeof payload?.score !== 'number' || Number.isNaN(payload.score)) return;
      samplesRef.current.set(`${payload.kind}:${payload.isScreenshare ? 'screen' : 'cam'}`, {
        score: payload.score,
        at: Date.now(),
        isVideo: payload.kind === 'video',
        stats: payload.scoreStats as ScoreStatsLike | undefined,
      });
    };
    meeting.participants.on('mediaScoreUpdate', onScore);

    const compose = (): void => {
      const { pingMs, failed } = httpRef.current;
      const next = composeHealth(samplesRef.current.values(), pingMs, failed, Date.now());
      setHealth((prev) => (sameHealth(prev, next) ? prev : next));
    };

    compose();
    const timer = setInterval(compose, TICK_MS);
    return () => {
      meeting.participants.off('mediaScoreUpdate', onScore);
      clearInterval(timer);
    };
  }, [meeting]);

  return health;
}
