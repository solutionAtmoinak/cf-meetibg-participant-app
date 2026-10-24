/**
 * Turns the signals the SDK and browser already produce into a 1-5 "signal
 * bars" level, like a phone's. Nothing here measures anything itself:
 *
 * - Quality comes from the SDK's own `mediaScoreUpdate` event — the same
 *   score RealtimeKit's stock <rtk-network-indicator> reads (it shows
 *   Math.round(score / 2) bars). The stock widget is not used directly because
 *   it hides itself when the connection is good and only has three levels;
 *   this one is always visible and has five.
 * - Ping comes from WebRTC stats (round-trip time of the media path) when the
 *   teacher is publishing, otherwise from timing a tiny request to the Worker.
 */

export type SignalLevel = 1 | 2 | 3 | 4 | 5;

export interface NetworkHealth {
  /** null until there is anything to judge (nobody publishing, no ping yet). */
  level: SignalLevel | null;
  pingMs: number | null;
  /** Packet loss on the media stream, percent. */
  lossPct: number | null;
  fps: number | null;
  width: number | null;
  height: number | null;
  bitrateKbps: number | null;
}

export const EMPTY_HEALTH: NetworkHealth = {
  level: null,
  pingMs: null,
  lossPct: null,
  fps: null,
  width: null,
  height: null,
  bitrateKbps: null,
};

/** Red -> yellow -> green, level 1 to 5. */
export const LEVEL_COLORS: Readonly<Record<SignalLevel, string>> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#84cc16',
  5: '#22c55e',
};

export const LEVEL_LABELS: Readonly<Record<SignalLevel, string>> = {
  1: 'Very poor',
  2: 'Poor',
  3: 'Fair',
  4: 'Good',
  5: 'Excellent',
};

/**
 * The score's scale isn't documented in the installed typings (its type lives
 * in a devDependency of the SDK that consumers never receive). Normalize the
 * two plausible conventions — 0-10 and 0-100 — onto 0-10, as the existing
 * connection-quality hooks do.
 */
export function normalizeScore(raw: number): number {
  return raw > 10 ? raw / 10 : raw;
}

export function scoreToLevel(rawScore: number): SignalLevel {
  const bars = Math.ceil(normalizeScore(rawScore) / 2);
  return Math.min(5, Math.max(1, bars)) as SignalLevel;
}

export function pingToLevel(ms: number): SignalLevel {
  if (ms <= 80) return 5;
  if (ms <= 150) return 4;
  if (ms <= 250) return 3;
  if (ms <= 400) return 2;
  return 1;
}

/** The weakest known signal wins; unknowns are ignored. */
export function worstLevel(levels: ReadonlyArray<SignalLevel | null>): SignalLevel | null {
  let worst: SignalLevel | null = null;
  for (const level of levels) {
    if (level !== null && (worst === null || level < worst)) worst = level;
  }
  return worst;
}

/** Fields read off the SDK's untyped `scoreStats` payload. */
export interface ScoreStatsLike {
  packetsLostPercentage?: number;
  framesPerSecond?: number;
  frameWidth?: number;
  frameHeight?: number;
  /** bits per second, averaged over the SDK's ~7s stats window. */
  bitrate?: number;
}

export interface ScoreSample {
  score: number;
  at: number;
  isVideo: boolean;
  stats: ScoreStatsLike | undefined;
}

/** A score older than this is a stream that has since stopped, not a live reading. */
export const SCORE_FRESH_MS = 20000;

/**
 * Folds the latest sample per stream, plus the current ping, into one reading.
 * Resolution/fps/bitrate are reported from the freshest VIDEO sample, since
 * that is what the class is actually watching.
 */
export function composeHealth(
  samples: Iterable<ScoreSample>,
  pingMs: number | null,
  pingFailed: boolean,
  now: number
): NetworkHealth {
  const fresh = [...samples].filter((s) => now - s.at <= SCORE_FRESH_MS);
  const scoreLevel = worstLevel(fresh.map((s) => scoreToLevel(s.score)));
  const pingLevel: SignalLevel | null = pingFailed ? 1 : pingMs === null ? null : pingToLevel(pingMs);

  const video = fresh.filter((s) => s.isVideo).sort((a, b) => b.at - a.at)[0];
  const stats = video?.stats;
  const num = (v: number | undefined): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const bitrate = num(stats?.bitrate);

  return {
    level: worstLevel([scoreLevel, pingLevel]),
    pingMs: pingFailed ? null : pingMs,
    lossPct: num(stats?.packetsLostPercentage),
    fps: num(stats?.framesPerSecond),
    width: num(stats?.frameWidth),
    height: num(stats?.frameHeight),
    bitrateKbps: bitrate === null ? null : Math.round(bitrate / 1000),
  };
}

export function sameHealth(a: NetworkHealth, b: NetworkHealth): boolean {
  return (
    a.level === b.level &&
    a.pingMs === b.pingMs &&
    a.lossPct === b.lossPct &&
    a.fps === b.fps &&
    a.width === b.width &&
    a.height === b.height &&
    a.bitrateKbps === b.bitrateKbps
  );
}
