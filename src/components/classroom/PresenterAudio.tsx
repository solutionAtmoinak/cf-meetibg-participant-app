import { useCallback, useEffect, useRef, useState } from 'react';
import { useRealtimeKitMeeting } from '@cloudflare/realtimekit-react';
import type { RTKParticipant } from '@cloudflare/realtimekit-react';
import { FiVolumeX } from 'react-icons/fi';

/**
 * The student's only audio sink — deliberately owned by this app rather than
 * by the SDK.
 *
 * RealtimeKit will play remote audio itself, but ONLY if you pass
 * modules:{experimentalAudioPlayback:true} to initMeeting. We do not, on
 * purpose. That module routes audio through one shared player fed by
 * `addParticipantTrack(participantId, track)` for *every* participant the SDK
 * sees — the app has no say in whose audio ends up in it. Turning it on made
 * a student hear their own microphone and started an echo loop.
 *
 * This component instead binds exactly one source: the active presenter's
 * tracks, with an explicit guard that the presenter is not self. A student
 * hearing themselves is therefore not "prevented", it is impossible — there
 * is no code path that could ever put a student's own track into an element.
 *
 * Two separate elements because they are two separate tracks: the teacher's
 * microphone (participant.audioTrack) and any system/tab audio captured with
 * their screen share (screenShareTracks.audio). The SDK's own module keys
 * those under different ids for the same reason; playing both here keeps a
 * shared video's soundtrack audible alongside the teacher's voice.
 */
export function PresenterAudio({ presenter }: { presenter: RTKParticipant }): JSX.Element | null {
  const { meeting } = useRealtimeKitMeeting();
  const micRef = useRef<HTMLAudioElement>(null);
  const screenRef = useRef<HTMLAudioElement>(null);
  const [blocked, setBlocked] = useState(false);

  // Hard guard. `presenter` is derived from the participant list, and a
  // student never has camera or screen on, so this should be unreachable —
  // but this is the exact failure that caused the echo, so it is enforced
  // rather than assumed.
  const isSelf = presenter.id === meeting.self.id;

  const play = useCallback((el: HTMLAudioElement | null): void => {
    if (!el || !el.srcObject) return;
    void el
      .play()
      .then(() => setBlocked(false))
      .catch(() => {
        // Autoplay policy refused until a user gesture. Surface the prompt;
        // the gesture listener below also retries on its own.
        setBlocked(true);
      });
  }, []);

  const bind = useCallback(
    (el: HTMLAudioElement | null, track: MediaStreamTrack | undefined): void => {
      if (!el) return;
      if (!track) {
        el.srcObject = null;
        return;
      }
      const stream = new MediaStream();
      stream.addTrack(track);
      el.srcObject = stream;
      play(el);
    },
    [play]
  );

  const micTrack = !isSelf && presenter.audioEnabled ? presenter.audioTrack : undefined;
  const rawScreenTrack = !isSelf && presenter.screenShareEnabled ? presenter.screenShareTracks.audio : undefined;
  // Never play the same track through both elements. Two elements carrying
  // one voice a few tens of milliseconds apart is indistinguishable from an
  // echo — which is exactly what was reported. Compared by track id, since
  // the SDK can hand back a different wrapper for the same underlying track.
  const screenTrack = rawScreenTrack && rawScreenTrack.id !== micTrack?.id ? rawScreenTrack : undefined;

  useEffect(() => {
    bind(micRef.current, micTrack);
    const el = micRef.current;
    return () => {
      if (el) el.srcObject = null;
    };
  }, [bind, micTrack]);

  useEffect(() => {
    bind(screenRef.current, screenTrack);
    const el = screenRef.current;
    return () => {
      if (el) el.srcObject = null;
    };
  }, [bind, screenTrack]);

  // Any first gesture retries playback, whether or not the prompt is showing.
  // A student who never notices the banner still gets sound back on their
  // first click anywhere.
  useEffect(() => {
    const onGesture = (): void => {
      play(micRef.current);
      play(screenRef.current);
    };
    const opts = { capture: true } as const;
    document.addEventListener('pointerdown', onGesture, opts);
    document.addEventListener('keydown', onGesture, opts);
    document.addEventListener('touchstart', onGesture, opts);
    return () => {
      document.removeEventListener('pointerdown', onGesture, opts);
      document.removeEventListener('keydown', onGesture, opts);
      document.removeEventListener('touchstart', onGesture, opts);
    };
  }, [play]);

  if (isSelf) return null;

  return (
    <>
      {/* Never muted: these elements exist solely to make the teacher audible.
          The <video> tiles stay muted precisely so audio lives only here. */}
      <audio ref={micRef} autoPlay playsInline data-testid="presenter-mic-audio" />
      <audio ref={screenRef} autoPlay playsInline data-testid="presenter-screen-audio" />

      {blocked && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 pt-[0.55rem] pr-[0.6rem] pb-[0.55rem] pl-4 rounded-pill bg-warning text-[#221200] text-[0.85rem] font-medium shadow-float"
          role="alert"
        >
          <FiVolumeX size={16} />
          <span>Tap to turn on class audio.</span>
          <button
            onClick={() => {
              play(micRef.current);
              play(screenRef.current);
            }}
            data-testid="enable-sound"
            className="bg-black/85 text-white border-none font-semibold py-[0.4rem] px-[0.8rem] rounded-pill cursor-pointer text-[0.8rem]"
          >
            Enable sound
          </button>
        </div>
      )}
    </>
  );
}
