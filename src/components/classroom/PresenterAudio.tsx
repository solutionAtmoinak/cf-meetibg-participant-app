import { useCallback, useEffect, useRef, useState } from 'react';
import { useRealtimeKitMeeting } from '@cloudflare/realtimekit-react';
import type { RTKParticipant } from '@cloudflare/realtimekit-react';
import { useAudioControl } from '../../lib/audioControl.js';

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
 * NOTHING HERE CAPTURES ANYTHING. These are playback sinks only: they consume
 * the teacher's inbound tracks. The student's microphone and camera are never
 * opened — see useReceiveOnlyGuard and the STUDENT preset.
 *
 * Two separate elements because they are two separate tracks: the teacher's
 * microphone (participant.audioTrack) and any system/tab audio captured with
 * their screen share (screenShareTracks.audio). The SDK's own module keys
 * those under different ids for the same reason; playing both here keeps a
 * shared video's soundtrack audible alongside the teacher's voice.
 *
 * ─── Why the streams are persistent (Safari) ────────────────────────────────
 *
 * Each element gets ONE MediaStream for its whole lifetime, assigned to
 * srcObject once on mount. Track changes add/remove tracks on that stream
 * instead of assigning a new one.
 *
 * This matters on Safari far more than on Chrome. Safari grants permission to
 * play to the *element*, in response to a user gesture. Replacing srcObject
 * with a fresh MediaStream — which the previous version did on every track
 * change — resets that, so the teacher toggling their mic, or a screen share
 * starting, silently re-blocked audio and put the prompt back up. Mutating a
 * stream the element is already playing does not.
 *
 * For the same reason the elements mount with the classroom rather than with
 * the presenter: a tap that lands before the teacher starts speaking still
 * unlocks playback, so audio is already permitted when the track arrives.
 */
export function PresenterAudio({ presenter }: { presenter?: RTKParticipant }): JSX.Element {
  const { meeting } = useRealtimeKitMeeting();
  const micRef = useRef<HTMLAudioElement>(null);
  const screenRef = useRef<HTMLAudioElement>(null);
  // Created once, never replaced. See the note above. Lazily, because a
  // useRef argument is evaluated on every render — passing `new MediaStream()`
  // directly would allocate one per render and throw them all away.
  const micStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  micStreamRef.current ??= new MediaStream();
  screenStreamRef.current ??= new MediaStream();
  // Stable for the component's lifetime, so effects can close over them
  // directly instead of re-reading a nullable ref.
  const micStream = micStreamRef.current;
  const screenStream = screenStreamRef.current;
  const [blocked, setBlocked] = useState(false);
  const { volume, muted, reportBlocked, registerRetry } = useAudioControl();

  // Hard guard. `presenter` is derived from the participant list, and a
  // student never has camera or screen on, so this should be unreachable —
  // but this is the exact failure that caused the echo, so it is enforced
  // rather than assumed.
  const isSelf = presenter != null && presenter.id === meeting.self.id;

  // Per-element, because there are two of them. A single shared boolean was
  // last-writer-wins: the screen-audio element (usually trackless, and happy
  // to reject) could stamp `blocked = true` over a mic element that was
  // playing perfectly, which is why the banner sat there while the student
  // could hear the teacher fine.
  const blockedRef = useRef<{ mic: boolean; screen: boolean }>({ mic: false, screen: false });

  const attemptPlay = useCallback((which: 'mic' | 'screen', el: HTMLAudioElement | null): void => {
    if (!el) return;
    // Deliberately no `!el.srcObject` bail-out. The old version had one, and
    // on Safari it wasted the gesture: a student who tapped before the teacher
    // spoke got no play() call at all, and the later bind() — running outside
    // any gesture — was refused. Attempting play on the (possibly empty)
    // persistent stream is what actually unlocks the element.
    //
    // Blocked-ness is judged from the ELEMENT afterwards, never from whether
    // the promise resolved. The gesture listener below fires on every tap, so
    // play() is called constantly; overlapping calls reject with AbortError
    // even while audio is playing perfectly, and treating that as "blocked"
    // is what pinned the banner on screen. `el.paused` cannot lie.
    const settle = (): void => {
      const stream = el.srcObject as MediaStream | null;
      const hasTrack = (stream?.getAudioTracks().length ?? 0) > 0;
      blockedRef.current[which] = hasTrack && el.paused;
      setBlocked(blockedRef.current.mic || blockedRef.current.screen);
    };
    void el.play().then(settle, settle);
  }, []);

  /** Reconcile one element's persistent stream with the track it should carry. */
  const syncTrack = useCallback(
    (
      which: 'mic' | 'screen',
      el: HTMLAudioElement | null,
      stream: MediaStream,
      track: MediaStreamTrack | undefined
    ): void => {
      if (!el) return;
      const existing = stream.getAudioTracks();
      if (track && existing.length === 1 && existing[0]?.id === track.id) {
        // Already carrying exactly this track — don't disturb playback.
        if (el.paused) attemptPlay(which, el);
        return;
      }
      existing.forEach((t) => stream.removeTrack(t));
      if (track) stream.addTrack(track);
      attemptPlay(which, el);
    },
    [attemptPlay]
  );

  // Attach the persistent streams once. srcObject is never assigned again.
  useEffect(() => {
    if (micRef.current) micRef.current.srcObject = micStream;
    if (screenRef.current) screenRef.current.srcObject = screenStream;
  }, [micStream, screenStream]);

  // The student's volume/mute choice, driven from the bottom bar. Applied to
  // both elements so a shared video's soundtrack and the teacher's voice move
  // together — one "class volume", not two.
  useEffect(() => {
    for (const el of [micRef.current, screenRef.current]) {
      if (!el) continue;
      el.volume = volume;
      el.muted = muted;
    }
  }, [volume, muted]);

  // Let the bottom bar retry playback. A muted element is always allowed to
  // play, so unmuting is itself a reliable way out of an autoplay block —
  // which is why the volume control doubles as the fix for it.
  useEffect(() => {
    registerRetry(() => {
      attemptPlay('mic', micRef.current);
      attemptPlay('screen', screenRef.current);
    });
  }, [registerRetry, attemptPlay]);

  // Muted is a deliberate choice, not a failure: never nag about silence the
  // student asked for.
  const showBlocked = blocked && !muted;

  useEffect(() => {
    reportBlocked(showBlocked);
  }, [reportBlocked, showBlocked]);

  // Playback state can change without us calling play() — a track ending, the
  // OS interrupting audio, Safari pausing on a route change. Watch the
  // elements directly so the banner reflects reality rather than the last
  // thing we tried.
  useEffect(() => {
    const els: Array<['mic' | 'screen', HTMLAudioElement | null]> = [
      ['mic', micRef.current],
      ['screen', screenRef.current],
    ];
    const cleanups: Array<() => void> = [];
    for (const [which, el] of els) {
      if (!el) continue;
      const update = (): void => {
        const stream = el.srcObject as MediaStream | null;
        const hasTrack = (stream?.getAudioTracks().length ?? 0) > 0;
        blockedRef.current[which] = hasTrack && el.paused;
        setBlocked(blockedRef.current.mic || blockedRef.current.screen);
      };
      el.addEventListener('play', update);
      el.addEventListener('playing', update);
      el.addEventListener('pause', update);
      cleanups.push(() => {
        el.removeEventListener('play', update);
        el.removeEventListener('playing', update);
        el.removeEventListener('pause', update);
      });
    }
    return () => cleanups.forEach((fn) => fn());
  }, []);

  // Read straight off the participant rather than from props-at-render-time.
  //
  // The SDK attaches a remote participant's audioTrack in processNewConsumer,
  // *after* it has already flipped audioEnabled from the socket's producer
  // list — so there is a window where audioEnabled is true and audioTrack is
  // still undefined. Binding once from a render that landed inside that
  // window leaves the element empty forever, which is silence with a lit mic
  // icon. Subscribing to the participant's own 'audioUpdate' /
  // 'screenShareUpdate' events closes it: the SDK emits both with the track
  // attached, so this re-binds the moment the track actually exists,
  // independent of whether the stage above happened to re-render.
  const [{ micTrack, screenTrack }, setTracks] = useState<{
    micTrack?: MediaStreamTrack;
    screenTrack?: MediaStreamTrack;
  }>({});

  useEffect(() => {
    if (!presenter || isSelf) {
      setTracks((prev) => (prev.micTrack || prev.screenTrack ? {} : prev));
      return;
    }
    const readTracks = (): void => {
      const mic = presenter.audioEnabled ? presenter.audioTrack : undefined;
      const rawScreen = presenter.screenShareEnabled ? presenter.screenShareTracks?.audio : undefined;
      // Never play the same track through both elements. Two elements
      // carrying one voice a few tens of milliseconds apart is
      // indistinguishable from an echo — which is exactly what was reported.
      // Compared by id, since the SDK can hand back a different wrapper for
      // the same underlying track.
      const screen = rawScreen && rawScreen.id !== mic?.id ? rawScreen : undefined;
      setTracks((prev) =>
        prev.micTrack?.id === mic?.id && prev.screenTrack?.id === screen?.id
          ? prev // no identity change — don't re-render, don't restart audio
          : { micTrack: mic, screenTrack: screen }
      );
    };

    readTracks();
    presenter.on('audioUpdate', readTracks);
    presenter.on('screenShareUpdate', readTracks);
    return () => {
      presenter.off('audioUpdate', readTracks);
      presenter.off('screenShareUpdate', readTracks);
    };
  }, [presenter, isSelf]);

  useEffect(() => {
    syncTrack('mic', micRef.current, micStream, micTrack);
  }, [syncTrack, micStream, micTrack]);

  useEffect(() => {
    syncTrack('screen', screenRef.current, screenStream, screenTrack);
  }, [syncTrack, screenStream, screenTrack]);

  // Any gesture anywhere retries playback, whether or not the prompt is
  // showing. A student who never notices the banner still gets sound on their
  // first tap — and on Safari that tap is what grants the element permission
  // for the rest of the lesson.
  useEffect(() => {
    const onGesture = (): void => {
      attemptPlay('mic', micRef.current);
      attemptPlay('screen', screenRef.current);
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
  }, [attemptPlay]);

  return (
    <>
      {/* Playback sinks only — never muted, and never a capture source. The
          <video> tiles stay muted precisely so audio lives only here. */}
      <audio ref={micRef} autoPlay playsInline data-testid="presenter-mic-audio" />
      <audio ref={screenRef} autoPlay playsInline data-testid="presenter-screen-audio" />

      {/* No banner. It used to sit here and, being driven by a single
          shared boolean, pinned itself on screen while audio played fine.
          The state is now reported to the toolbar instead: VolumeMenu turns
          amber when playback is genuinely refused, and opening it spends a
          user gesture retrying. The document-wide gesture listener above
          also recovers sound on the first tap anywhere, so a student never
          has to find a control to get audio back. */}
    </>
  );
}
