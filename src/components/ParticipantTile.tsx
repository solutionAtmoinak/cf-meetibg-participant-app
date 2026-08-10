import { useEffect, useRef } from 'react';
import type { RTKParticipant } from '@cloudflare/realtimekit-react';
import { useFullscreen } from '../lib/useFullscreen.js';
import { useNetworkSpeed } from '../lib/useNetworkSpeed.js';

/**
 * Renders one remote participant's video/audio. In the webinar preset the
 * teacher is the only participant publishing media by default, so in
 * practice this is "view the teacher's screen/camera and hear their audio" —
 * but it renders whoever is actually publishing (e.g. a student promoted to
 * the stage), which is the more general and correct thing to do.
 */
export function ParticipantTile({ participant }: { participant: RTKParticipant }): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { containerRef, isFullscreen, toggleFullscreen } = useFullscreen<HTMLDivElement>();
  const networkSpeed = useNetworkSpeed(participant);

  useEffect(() => {
    // Remote audio playback is handled internally by the SDK's
    // AudioPlaybackManager once subscribed — only video needs a DOM element.
    const videoEl = videoRef.current;
    if (videoEl) participant.registerVideoElement(videoEl);
    return () => {
      if (videoEl) participant.deregisterVideoElement(videoEl);
    };
  }, [participant]);

  return (
    <div className="participant-tile" data-testid="teacher-tile" ref={containerRef}>
      <video ref={videoRef} autoPlay playsInline muted={false} />
      <div className="participant-tile-label">
        {participant.name}
        {!participant.videoEnabled && <span className="badge">camera off</span>}
        {participant.screenShareEnabled && <span className="badge">sharing screen</span>}
        {networkSpeed && (
          <span className="badge" title="Estimated data received from this participant">
            {networkSpeed}
          </span>
        )}
      </div>
      <button
        className="fullscreen-btn"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'View fullscreen'}
        data-testid="participant-fullscreen-toggle"
      >
        {isFullscreen ? '⤡' : '⛶'}
      </button>
    </div>
  );
}
