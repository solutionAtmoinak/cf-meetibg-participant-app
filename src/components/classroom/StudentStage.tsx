import { useEffect, useMemo, useState } from 'react';
import { useRealtimeKitMeeting, useRealtimeKitSelector } from '@cloudflare/realtimekit-react';
import { FiMic, FiMicOff } from 'react-icons/fi';
import { usePresenterStatus } from '../../lib/usePresenterStatus.js';
import { useConnectionQuality } from '../../lib/useConnectionQuality.js';
import { ConnectionBadge } from './ConnectionBadge.js';
import { PresenterAudio } from './PresenterAudio.js';
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
  // `useRealtimeKitSelector` compares successive selector results with `!==`,
  // and `participants.joined.toArray()` allocates a fresh array every call —
  // so selecting the array directly re-rendered this component (and the
  // <video> subtree under it) on *every* SDK event, including per-frame-ish
  // activeSpeaker and audio-level updates. On a modest student machine that
  // main-thread churn competes with the video decoder and shows up as
  // playback jank. Select a stable string signature of only the fields the
  // stage actually reads, and materialize the array only when it changes.
  // The track ids are part of the signature, not just the enabled flags, and
  // that is load-bearing — it is the difference between hearing the teacher
  // and not.
  //
  // The SDK sets `audioEnabled` from the socket's producer list the moment a
  // peer joins the media room, which happens BEFORE the WebRTC consumer for
  // that peer exists — so at that point `participant.audioTrack` is still
  // undefined. The real track is attached later, in processNewConsumer, which
  // then calls setAudioEnabled() again and emits a second 'audioUpdate'. The
  // React binding does re-run this selector on that event.
  //
  // But with only the boolean flags in the signature, that second pass
  // produced a byte-identical string (audioEnabled was already 1), the
  // selector's `!==` comparison saw no change, and no re-render happened. The
  // stage therefore kept rendering with `audioTrack === undefined` forever:
  // the mic icon showed "on" (it reads the flag) while PresenterAudio had
  // nothing to bind and the student heard silence. Same race for videoTrack
  // and screenShareTracks, which is why a share could stay black.
  //
  // Including the ids re-renders exactly when a track appears, changes, or
  // goes away — and still not on activeSpeaker/audio-level chatter, so the
  // playback-jank fix this selector exists for is preserved.
  const participantsSignature = useRealtimeKitSelector((m) =>
    m.participants.joined
      .toArray()
      .map(
        (p) =>
          `${p.id}:${p.name}:${p.videoEnabled ? 1 : 0}${p.screenShareEnabled ? 1 : 0}${p.audioEnabled ? 1 : 0}` +
          `:${p.audioTrack?.id ?? '-'}:${p.videoTrack?.id ?? '-'}` +
          `:${p.screenShareTracks?.video?.id ?? '-'}:${p.screenShareTracks?.audio?.id ?? '-'}`
      )
      .join('|')
  );
  const participants = useMemo(
    () => meeting.participants.joined.toArray(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meeting, participantsSignature]
  );
  const { activePresenterId } = usePresenterStatus(sessionId);
  // When the lock service can't be reached (not deployed yet, or down),
  // "who's presenting" is unknown rather than "nobody" — fall back to
  // whoever happens to be publishing so a real class isn't stuck on a
  // waiting screen. Once the service answers, this strict-by-id lookup
  // takes over and is the only thing that can ever put someone on stage.
  // The server's activePresenterId can go stale relative to what this
  // device currently sees — e.g. the presenting host's session id changes
  // on a reconnect, but the server-side lock still names the old id. Only a
  // teacher-preset participant can ever have video/screen-share enabled (see
  // SINGLE_ACTIVE_HOST_PRESENTER.md), so falling back to "whoever is
  // visibly publishing" when the named id isn't found can never surface a
  // student or an unauthorized publisher.
  // The presenter lock PREFERS a presenter; it must never be able to HIDE
  // one. The previous logic only fell back to "whoever is visibly publishing"
  // when the lock service was unreachable — so while the Worker returned 503
  // the class worked, and the moment the lock was fixed and began honestly
  // answering `activePresenterId: null`, a teacher with camera and screen
  // share live vanished behind "Waiting for the teacher...". The 503 had
  // become load-bearing.
  //
  // Use the named presenter when the lock names someone we can actually see,
  // otherwise show whoever is genuinely publishing. The lock goes stale in
  // normal operation (a host reconnects with a new peer id; KV is eventually
  // consistent) and none of that may blank the stage.
  //
  // This cannot surface the wrong person: students are barred from producing
  // by the STUDENT preset (permissions.media.*.canProduce = NOT_ALLOWED) and
  // by useReceiveOnlyGuard, so anyone publishing is a teacher. Self is
  // excluded explicitly anyway.
  const selfId = meeting.self.id;
  const namedPresenter = activePresenterId
    ? participants.find((p) => p.id === activePresenterId)
    : undefined;
  const visiblePublisher = participants.find(
    (p) => p.id !== selfId && (p.videoEnabled || p.screenShareEnabled || p.audioEnabled)
  );
  const presenter = namedPresenter ?? visiblePublisher;
  const [speaking, setSpeaking] = useState(false);
  const poorConnection = useConnectionQuality(presenter);

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
  // A teacher talking with the camera off is still teaching. Gating the whole
  // stage on hasVisual told those students "Waiting for the teacher…" — i.e.
  // that nobody was there — while the teacher was mid-sentence.
  const audioOnly = !hasVisual && (presenter?.audioEnabled ?? false);

  return (
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#161d33_0%,#0a0d16_70%)] overflow-hidden">
      {/* Mounted unconditionally, and outside the visual branch below, for two
          reasons: the teacher's voice must keep playing when their camera and
          screen are both off (the audio-only case), and on Safari the element
          has to exist before the student taps — a tap is what grants it
          permission to play, and one that lands while the stage is still
          waiting must count. Passing no presenter simply means no tracks yet. */}
      <PresenterAudio presenter={presenter} />

      {presenter && (hasVisual || audioOnly) ? (
        <>
          {screenOn ? (
            <PresenterScreenTile sharer={presenter} />
          ) : cameraOn ? (
            <PresenterCameraTile participant={presenter} />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
              <span
                className={`w-24 h-24 rounded-full bg-[linear-gradient(135deg,var(--color-accent),#4f8cff)] flex items-center justify-center text-white text-[2rem] font-bold transition-shadow duration-200 ${
                  speaking ? 'shadow-[0_0_0_10px_rgba(79,140,255,0.25)]' : ''
                }`}
              >
                {presenter.name.trim().slice(0, 1).toUpperCase() || '?'}
              </span>
              <p className="text-white text-[1rem] font-semibold">{presenter.name}</p>
              <p className="text-text-dim text-[0.9rem]" data-testid="audio-only-presenter">
                {speaking ? 'Speaking — camera is off' : 'Teaching with camera off'}
              </p>
            </div>
          )}
          {screenOn && cameraOn && <PresenterCameraTile participant={presenter} pip />}

          {/* The one label kept on the stage. It earns its place by carrying
              MIC STATUS — a teacher who is muted by accident is the single
              most common "we can't hear you" moment, and this is where a
              student sees it.
              It lives here rather than inside the tiles, so it is outside the
              maximized/fullscreen element and disappears by itself when a
              student goes fullscreen (z-20 under the tile's z-50, and not in
              the fullscreened subtree at all). Fullscreen therefore stays
              exactly what was asked for: presentation plus the restore
              button, nothing more. */}
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

      {/* Outside the branch above: a weak connection is worth flagging even
          while the stage is still waiting, since that wait may itself be the
          network rather than the teacher. */}
      {poorConnection && (
        <ConnectionBadge message="Adjusting to your network — the class continues, video may pause briefly." />
      )}
    </div>
  );
}
