import { useEffect, useRef } from 'react';
import type { RTKParticipant } from '@cloudflare/realtimekit-react';
import { FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import { useMaximize } from '../../lib/useMaximize.js';
import { useNetworkSpeed } from '../../lib/useNetworkSpeed.js';

const badgeClass = 'text-[0.68rem] py-[0.12rem] px-[0.5rem] rounded-pill bg-white/15 text-white whitespace-nowrap shrink-0';

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
  const networkSpeed = useNetworkSpeed(participant);
  // Maximizing the PIP camera should read like the full presenter tile, not
  // a giant cropped thumbnail.
  const expanded = !pip || isMaximized;

  useEffect(() => {
    // Remote audio playback is handled internally by the SDK's
    // AudioPlaybackManager once subscribed — only video needs a DOM element.
    const videoEl = videoRef.current;
    if (videoEl) participant.registerVideoElement(videoEl);
    return () => {
      if (videoEl) participant.deregisterVideoElement(videoEl);
    };
  }, [participant]);

  const positionClass = isMaximized
    ? 'fixed inset-0 z-50 bg-black flex items-center justify-center'
    : pip
      ? 'absolute z-20 bottom-4 left-4 w-[clamp(120px,20vw,200px)] aspect-4/3 rounded-md overflow-hidden border border-border-strong shadow-float bg-black max-[720px]:w-[clamp(96px,30vw,140px)] max-[720px]:bottom-24'
      : 'relative w-full h-full flex items-center justify-center overflow-hidden bg-black';

  return (
    <div ref={containerRef} data-testid="presenter-camera-tile" className={positionClass}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className={expanded ? 'max-w-full max-h-full object-contain block' : 'w-full h-full object-cover block'}
      />
      {expanded ? (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-4 py-[0.45rem] px-[0.8rem] rounded-pill bg-black/70 text-white text-[0.82rem] font-medium flex gap-[0.5rem] items-center max-w-[calc(100%-2rem)]">
          <span className="truncate">{participant.name}</span>
          {!participant.videoEnabled && <span className={badgeClass}>camera off</span>}
          {networkSpeed && (
            <span className={badgeClass} title="Estimated data received">
              {networkSpeed}
            </span>
          )}
        </div>
      ) : (
        <div className="absolute bottom-0 left-0 right-0 py-1 px-2 bg-[linear-gradient(0deg,rgba(0,0,0,0.75),transparent)] text-white text-[0.68rem] font-medium truncate">
          {participant.name}
        </div>
      )}
      <button
        className={`absolute top-2 right-2 z-10 flex items-center justify-center rounded-full bg-black/60 border border-white/25 text-white cursor-pointer transition-colors hover:bg-black/80 ${
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
