import { useEffect, useRef } from 'react';
import type { RTKParticipant } from '@cloudflare/realtimekit-react';
import { FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import { useMaximize } from '../../lib/useMaximize.js';

/**
 * The active presenter's camera. Renders as the primary stage when there's
 * no screen share, or as a small secondary/PIP tile alongside the screen
 * share when both are live — per SINGLE_ACTIVE_HOST_PRESENTER.md, that's the
 * one-presenter rule's explicitly-allowed case, not a second presenter.
 */
export function PresenterCameraTile({
  participant,
  pip = false,
}: {
  participant: RTKParticipant;
  pip?: boolean;
}): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { containerRef, isMaximized, toggleMaximize } = useMaximize<HTMLDivElement>();
  // Maximizing the PIP camera should read like the full presenter tile, not
  // a giant cropped thumbnail.
  const expanded = !pip || isMaximized;

  useEffect(() => {
    // Remote audio playback is handled internally by the SDK's
    // AudioPlaybackManager once subscribed — only video needs a DOM element.
    //
    // registerVideoElement() binds whatever videoTrack is present *right
    // now* and doesn't get called again on its own — for a remote
    // participant that track can still be mid-subscription (unlike a local
    // self-view, which always has its track ready immediately), so
    // registering once on mount can permanently bind to "no track yet" and
    // stay black even after the camera comes on. Re-run registration
    // whenever videoEnabled flips or the track itself changes so a
    // just-arrived track actually gets picked up.
    const videoEl = videoRef.current;
    if (videoEl) participant.registerVideoElement(videoEl);
    return () => {
      if (videoEl) participant.deregisterVideoElement(videoEl);
    };
  }, [participant, participant.videoEnabled, participant.videoTrack?.id]);

  const positionClass = isMaximized
    ? // Stage colour, not black — see the note in PresenterScreenTile.
      'fixed inset-0 z-50 bg-stage flex items-center justify-center'
    : pip
      ? 'absolute z-20 bottom-4 left-4 w-[clamp(120px,20vw,200px)] aspect-4/3 rounded-md overflow-hidden border border-border-strong shadow-float bg-stage max-[720px]:w-[clamp(96px,30vw,140px)] max-[720px]:bottom-24'
      : 'relative w-full h-full flex items-center justify-center overflow-hidden bg-stage';

  return (
    <div ref={containerRef} data-testid="presenter-camera-tile" className={positionClass}>
      {/*
        Muted deliberately, and it costs the student no audio:
        registerVideoElement() wires only the video track (verified in the SDK
        bundle — Participant.updateVideo does `i.addTrack(this.videoTrack)`
        and never touches audioTrack). The teacher's sound is played by
        PresenterAudio, which owns the only <audio> elements in the app.
        Left unmuted, Chrome's autoplay policy rejects play() until a user
        gesture, which can strand this element and take the *video* down too.
      */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={expanded ? 'max-w-full max-h-full object-contain block' : 'w-full h-full object-cover block'}
      />
      {/* No name caption and no "camera off" badge, in either the full or PIP
          size. There is exactly one presenter on this stage, so labelling them
          told the student nothing they didn't already know while covering part
          of the picture. */}
      <button
        className={`absolute top-2 right-2 z-10 flex items-center justify-center rounded-full bg-panel-bg border border-border text-text cursor-pointer transition-colors hover:bg-panel-bg-solid hover:border-border-strong ${
          expanded && !pip ? 'w-9 h-9' : 'w-6 h-6'
        }`}
        onClick={toggleMaximize}
        aria-label={isMaximized ? 'Restore camera view' : 'Maximize camera view'}
        aria-pressed={isMaximized}
        title={isMaximized ? 'Restore' : 'Maximize'}
        data-testid="camera-maximize-toggle"
      >
        {isMaximized ? <FiMinimize2 size={expanded && !pip ? 16 : 12} /> : <FiMaximize2 size={expanded && !pip ? 16 : 12} />}
      </button>
    </div>
  );
}
