import { useEffect, useRef, useState } from 'react';

const POLL_INTERVAL_MS = 2000;

/**
 * Structural shape shared by RTKParticipant.producers (ProducerState[],
 * remote peers we're receiving from) and RTKSelf.producers (Producer[],
 * what we're sending — no `.consumer`, so it just yields no stats). Kept
 * minimal so this hook works for either without importing SDK-internal
 * types that aren't publicly exported.
 */
interface NetworkSpeedSource {
  producers: readonly {
    consumer?: { getStats?: () => Promise<RTCStatsReport> };
  }[];
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec >= 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  return `${Math.max(0, Math.round(bytesPerSec / 1024))} KB/s`;
}

/**
 * Estimates data received from a participant by polling WebRTC inbound-rtp
 * stats across their audio/video consumers. A rate needs two samples, so
 * this returns null on mount and whenever the participant currently has no
 * active consumers to sample (e.g. camera+mic both off, or it's our own
 * outgoing share — we don't consume our own stream).
 */
export function useNetworkSpeed(participant: NetworkSpeedSource): string | null {
  const [speed, setSpeed] = useState<string | null>(null);
  const lastBytesRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    lastBytesRef.current = null;
    lastTimeRef.current = null;
    setSpeed(null);

    const poll = async (): Promise<void> => {
      const reports = await Promise.all(
        participant.producers.map(async (p) => {
          try {
            return (await p.consumer?.getStats?.()) ?? null;
          } catch {
            return null;
          }
        })
      );
      if (cancelled) return;

      let totalBytes = 0;
      let sawStats = false;
      for (const report of reports) {
        if (!report) continue;
        report.forEach((stat: RTCInboundRtpStreamStats) => {
          if (stat.type === 'inbound-rtp' && typeof stat.bytesReceived === 'number') {
            totalBytes += stat.bytesReceived;
            sawStats = true;
          }
        });
      }

      if (!sawStats) {
        lastBytesRef.current = null;
        lastTimeRef.current = null;
        setSpeed(null);
        return;
      }

      const now = performance.now();
      if (lastBytesRef.current !== null && lastTimeRef.current !== null) {
        const elapsedSec = (now - lastTimeRef.current) / 1000;
        const deltaBytes = totalBytes - lastBytesRef.current;
        if (elapsedSec > 0 && deltaBytes >= 0) {
          setSpeed(formatSpeed(deltaBytes / elapsedSec));
        }
      }
      lastBytesRef.current = totalBytes;
      lastTimeRef.current = now;
    };

    void poll();
    const interval = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [participant]);

  return speed;
}
