import { useEffect, useState } from 'react';
import { useRealtimeKitMeeting, useRealtimeKitSelector } from '@cloudflare/realtimekit-react';
import { FiMic, FiMicOff } from 'react-icons/fi';
import { usePresenterStatus } from '../../lib/usePresenterStatus.js';
import { PresenterScreenTile } from './PresenterScreenTile.js';
import { PresenterCameraTile } from './PresenterCameraTile.js';

/**
 * The one-to-many presentation stage: derived strictly from the
 * authoritative activePresenterId (SINGLE_ACTIVE_HOST_PRESENTER.md), never
 * from "whichever remote track shows up first". A standby host's stray
 * track, a second host, or any student can never end up here.
 */
export function StudentStage({ sessionId }: { sessionId: string }): JSX.Element {
  const { meeting } = useRealtimeKitMeeting();
  const participants = useRealtimeKitSelector((m) => m.participants.joined.toArray());
  const { activePresenterId, unavailable } = usePresenterStatus(sessionId);
  // When the lock service can't be reached (not deployed yet, or down),
  // "who's presenting" is unknown rather than "nobody" — fall back to
  // whoever happens to be publishing so a real class isn't stuck on a
  // waiting screen. Once the service answers, this strict-by-id lookup
  // takes over and is the only thing that can ever put someone on stage.
  const presenter = activePresenterId
    ? participants.find((p) => p.id === activePresenterId)
    : unavailable
      ? participants.find((p) => p.videoEnabled || p.screenShareEnabled)
      : undefined;
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSpeaking(false);
    if (!presenter) return;
    const onActiveSpeaker = (payload: { peerId: string }): void => setSpeaking(payload.peerId === presenter.id);
    meeting.participants.on('activeSpeaker', onActiveSpeaker);
    return () => {
      meeting.participants.off('activeSpeaker', onActiveSpeaker);
    };
  }, [meeting, presenter]);

  const screenOn = presenter?.screenShareEnabled ?? false;
  const cameraOn = presenter?.videoEnabled ?? false;
  const hasVisual = screenOn || cameraOn;

  return (
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#161d33_0%,#0a0d16_70%)] overflow-hidden">
      {presenter && hasVisual ? (
        <>
          {screenOn ? <PresenterScreenTile sharer={presenter} /> : <PresenterCameraTile participant={presenter} />}
          {screenOn && cameraOn && <PresenterCameraTile participant={presenter} pip />}

          <div
            className="absolute top-[4.75rem] left-4 z-20 flex items-center gap-2 py-2 px-3 rounded-md bg-black/55 border border-white/15 backdrop-blur-sm max-[720px]:top-[4.5rem] max-[720px]:left-3"
            data-testid="presenter-name-tag"
          >
            <span className="w-9 h-9 rounded-full bg-[linear-gradient(135deg,var(--color-accent),#4f8cff)] flex items-center justify-center text-white text-[0.85rem] font-bold shrink-0">
              {presenter.name.trim().slice(0, 1).toUpperCase() || '?'}
            </span>
            <span className="flex flex-col min-w-0">
              <span className="text-white text-[0.9rem] font-semibold leading-tight truncate max-w-[40vw]">{presenter.name}</span>
              <span className="flex items-center gap-1 text-[0.72rem] text-text-dim leading-tight">
                {presenter.audioEnabled ? <FiMic size={11} /> : <FiMicOff size={11} />}
                {presenter.audioEnabled && speaking ? 'Speaking' : presenter.audioEnabled ? 'Mic on' : 'Muted'}
              </span>
            </span>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-center px-6">
          <p className="text-text-dim text-[0.95rem]" data-testid="waiting-for-teacher">
            Waiting for the teacher to share their camera or screen…
          </p>
        </div>
      )}
    </div>
  );
}
