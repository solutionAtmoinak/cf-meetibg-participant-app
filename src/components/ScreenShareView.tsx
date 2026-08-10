import { useEffect, useRef } from 'react';
import { useFullscreen } from '../lib/useFullscreen.js';
import { useNetworkSpeed } from '../lib/useNetworkSpeed.js';

/**
 * RealtimeKit only auto-wires registerVideoElement() to the camera track
 * (participant.videoTrack) — screen share lives on a separate track
 * (participant.screenShareTracks.video) with no equivalent helper, so it has
 * to be bound to a <video> element manually.
 */
interface ScreenSharer {
  name: string;
  screenShareEnabled: boolean;
  screenShareTracks: { video?: MediaStreamTrack; audio?: MediaStreamTrack };
  // Present on remote participants (ProducerState[], with a `.consumer` we
  // can read WebRTC receive stats from) and on `meeting.self` (Producer[],
  // our outgoing streams — no `.consumer`, so it just yields no stats).
  // Typed loosely since the two shapes share no properties.
  producers?: readonly unknown[];
}

type ConsumerLike = { consumer?: { getStats?: () => Promise<RTCStatsReport> } };

export function ScreenShareView({ sharer }: { sharer: ScreenSharer }): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { containerRef, isFullscreen, toggleFullscreen } = useFullscreen<HTMLDivElement>();
  const networkSpeed = useNetworkSpeed({ producers: (sharer.producers ?? []) as ConsumerLike[] });
  const track = sharer.screenShareTracks.video;
  // Screen-share audio is played automatically by the SDK's own audio
  // element, not this <video> — its absence here means the sharer's browser
  // never captured system/tab audio in the first place (e.g. "Window" share,
  // or the "Share audio" checkbox wasn't ticked), not a playback bug.
  const hasAudio = Boolean(sharer.screenShareTracks.audio);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (sharer.screenShareEnabled && track) {
      const stream = new MediaStream();
      stream.addTrack(track);
      videoEl.srcObject = stream;
    } else {
      videoEl.srcObject = null;
    }
    return () => {
      videoEl.srcObject = null;
    };
  }, [sharer.screenShareEnabled, track]);

  return (
    <div className="screen-share-tile" data-testid="screen-share-view" ref={containerRef}>
      <video ref={videoRef} autoPlay playsInline muted />
      <div className="participant-tile-label">
        {sharer.name} is sharing their screen
        {!hasAudio && (
          <span className="badge" title="The sharer's browser didn't capture any system/tab audio for this share">
            no audio captured
          </span>
        )}
        {networkSpeed && (
          <span className="badge" title="Estimated data received from this share">
            {networkSpeed}
          </span>
        )}
      </div>
      <button
        className="fullscreen-btn"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'View fullscreen'}
        data-testid="screen-share-fullscreen-toggle"
      >
        {isFullscreen ? '⤡' : '⛶'}
      </button>
    </div>
  );
}
