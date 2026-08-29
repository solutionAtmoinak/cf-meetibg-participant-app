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

/** The active presenter's shared screen — always the primary/large stage per SINGLE_ACTIVE_HOST_PRESENTER.md. */
export function PresenterScreenTile({ sharer }: { sharer: ScreenSharer }): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { containerRef, isMaximized, toggleMaximize } = useMaximize<HTMLDivElement>();
  const track = sharer.screenShareTracks.video;

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
          ? // Stage colour rather than pure black. The shared screen almost
            // never matches the student's aspect ratio, so there is always a
            // band above and below it; against black those bands read as two
            // hard bars framing the content, which is what looked wrong.
            // Matching the classroom background makes them read as page.
            'fixed inset-0 z-50 bg-bg flex items-center justify-center'
          : 'relative w-full h-full flex items-center justify-center'
      }
    >
      {/* object-contain, never object-cover: shared teaching content (slides, code, documents) must never be cropped. */}
      <video ref={videoRef} autoPlay playsInline muted className="max-w-full max-h-full object-contain block" />
      {/* Nothing is drawn over the shared screen. The only control is the
          maximize/restore button below — students are here to read the
          teacher's content, and a caption sitting on top of it (or in the
          letterbox band beside it) just competes with the lesson. */}
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
