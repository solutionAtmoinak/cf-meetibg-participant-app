import { useEffect, useRef } from 'react';
import { useRealtimeKitMeeting } from '@cloudflare/realtimekit-react';

type MediaKind = 'audio' | 'video' | 'screenshare';

/**
 * Students are watchers. They must never capture or publish microphone,
 * camera or screen — not for a moment, not on a reconnect, not because a
 * preset says otherwise. Media flows one way only: teacher -> student.
 *
 * Three layers:
 *  1. `defaults: { audio: false, video: false }` at initMeeting (see
 *     pages/Classroom.tsx) stops capture before getUserMedia ever runs.
 *  2. This guard re-silences on every 'roomJoined', which — unlike a one-shot
 *     inline handler — also covers RECONNECTS, where the SDK re-applies
 *     preset defaults.
 *  3. This guard watches the self media events and turns anything off the
 *     instant it reports itself on, closing the race where a preset
 *     auto-publishes *after* join has already been handled.
 *
 * The authoritative control is still the RealtimeKit STUDENT preset:
 *   permissions.media.audio.canProduce       = 'NOT_ALLOWED'
 *   permissions.media.video.canProduce       = 'NOT_ALLOWED'
 *   permissions.media.screenshare.canProduce = 'NOT_ALLOWED'
 * With those set the server refuses a student's media outright and this is
 * only belt-and-braces.
 *
 * ─── Why this is more careful than it looks ─────────────────────────────────
 *
 * `meeting.self.disable*()` throws SYNCHRONOUSLY on misuse — not as a
 * rejected promise — so `disableAudio().catch(...)` never attaches a handler,
 * the error escapes to the React error boundary, and the whole classroom
 * unmounts with "[ERR1100] {Self} Internal exception". It also rejects
 * re-entrancy ("Unsupported concurrent calls on method:
 * meeting.self.disableAudio"), and React 18 StrictMode double-invokes effects
 * in development, which triggers exactly that.
 *
 * So every call here is:
 *   (a) inside try/catch within an async function, so a synchronous throw is
 *       converted into a caught rejection,
 *   (b) skipped entirely unless the track is actually on — which, once the
 *       preset forbids producing, is the normal path, and
 *   (c) guarded by a per-kind in-flight flag so two invocations can never
 *       overlap.
 */
export function useReceiveOnlyGuard(): void {
  const { meeting } = useRealtimeKitMeeting();
  const inFlightRef = useRef<Partial<Record<MediaKind, boolean>>>({});

  useEffect(() => {
    let cancelled = false;
    const inFlight = inFlightRef.current;

    const disableOnce = async (
      kind: MediaKind,
      isOn: () => boolean,
      disable: () => Promise<void>
    ): Promise<void> => {
      if (cancelled) return;
      if (!isOn()) return;
      if (inFlight[kind]) return;
      inFlight[kind] = true;
      try {
        await disable();
      } catch {
        // Benign: already off, not permitted by the preset, or the SDK's own
        // re-entrancy guard. The desired state is "off", and it is off.
      } finally {
        inFlight[kind] = false;
      }
    };

    const silenceAudio = (): Promise<void> =>
      disableOnce('audio', () => meeting.self.audioEnabled, () => meeting.self.disableAudio());
    const silenceVideo = (): Promise<void> =>
      disableOnce('video', () => meeting.self.videoEnabled, () => meeting.self.disableVideo());
    const silenceScreen = (): Promise<void> =>
      disableOnce('screenshare', () => meeting.self.screenShareEnabled, () => meeting.self.disableScreenShare());

    const silence = (): void => {
      void silenceAudio();
      void silenceVideo();
      void silenceScreen();
    };

    silence();

    const onRoomJoined = (): void => silence();
    const onAudioUpdate = (p: { audioEnabled: boolean }): void => {
      if (p?.audioEnabled) void silenceAudio();
    };
    const onVideoUpdate = (p: { videoEnabled: boolean }): void => {
      if (p?.videoEnabled) void silenceVideo();
    };
    const onScreenShareUpdate = (p: { screenShareEnabled: boolean }): void => {
      if (p?.screenShareEnabled) void silenceScreen();
    };

    meeting.self.on('roomJoined', onRoomJoined);
    meeting.self.on('audioUpdate', onAudioUpdate);
    meeting.self.on('videoUpdate', onVideoUpdate);
    meeting.self.on('screenShareUpdate', onScreenShareUpdate);

    return () => {
      cancelled = true;
      meeting.self.off('roomJoined', onRoomJoined);
      meeting.self.off('audioUpdate', onAudioUpdate);
      meeting.self.off('videoUpdate', onVideoUpdate);
      meeting.self.off('screenShareUpdate', onScreenShareUpdate);
    };
  }, [meeting]);
}
