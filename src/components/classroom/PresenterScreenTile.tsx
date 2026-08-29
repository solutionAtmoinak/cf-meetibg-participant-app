import { useEffect, useRef } from 'react';
import { FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import { useMaximize } from '../../lib/useMaximize.js';

/**
 * RealtimeKit only auto-wires registerVideoElement() to the camera track —
 * screen share lives on a separate track (screenShareTracks.video) with no
 * equivalent helper, so it has to be bound to a <video> element manually.
 */
interface ScreenSharer {
  name: string;
  screenShareEnabled: boolean;
  screenShareTracks: { video?: MediaStreamTrack; audio?: MediaStreamTrack };
}

const badgeClass = 'text-[0.68rem] py-[0.12rem] px-[0.5rem] rounded-pill bg-white/15 text-white whitespace-nowrap shrink-0';

/** The active presenter's shared screen — always the primary/large stage per SINGLE_ACTIVE_HOST_PRESENTER.md. */
export function PresenterScreenTile({ sharer }: { sharer: ScreenSharer }): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { containerRef, isMaximized, toggleMaximize } = useMaximize<HTMLDivElement>();
  const track = sharer.screenShareTracks.video;
  // Screen-share audio plays automatically via the SDK's own audio element,
  // not this <video> — its absence here means the presenter's browser never
  // captured system/tab audio, not a playback bug.
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
    <div
      ref={containerRef}
      data-testid="presenter-screen-tile"
      className={
        isMaximized
          ? 'fixed inset-0 z-50 bg-black flex items-center justify-center'
          : 'relative w-full h-full flex items-center justify-center'
      }
    >
      {/* object-contain, never object-cover: shared teaching content (slides, code, documents) must never be cropped. */}
      <video ref={videoRef} autoPlay playsInline muted className="max-w-full max-h-full object-contain block" />
      <div className="absolute left-1/2 -translate-x-1/2 bottom-4 py-[0.45rem] px-[0.8rem] rounded-pill bg-black/70 text-white text-[0.82rem] font-medium flex gap-[0.5rem] items-center max-w-[calc(100%-2rem)]">
        <span className="truncate">{sharer.name} is sharing their screen</span>
        {!hasAudio && (
          <span className={badgeClass} title="No system/tab audio was captured for this share">
            no audio
          </span>
        )}
      </div>
      <button
        className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center bg-black/60 border border-white/25 text-white cursor-pointer transition-colors hover:bg-black/80"
        onClick={toggleMaximize}
        aria-label={isMaximized ? 'Restore shared screen' : 'Maximize shared screen'}
        aria-pressed={isMaximized}
        title={isMaximized ? 'Restore' : 'Maximize'}
        data-testid="screen-maximize-toggle"
      >
        {isMaximized ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
      </button>
    </div>
  );
}
