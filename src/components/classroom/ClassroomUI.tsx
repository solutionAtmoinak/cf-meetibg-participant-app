import { useRealtimeKitMeeting } from '@cloudflare/realtimekit-react';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '../../lib/toast.js';
import type { JoinedState } from '../../types.js';
import { StudentTopBar } from './StudentTopBar.js';
import { StudentStage } from './StudentStage.js';
import { StudentBottomBar } from './StudentBottomBar.js';
import { StudentChatSidebar } from './StudentChatSidebar.js';
import { WaitingScreen } from './WaitingScreen.js';
import { SessionEndedScreen } from './SessionEndedScreen.js';
import type { ExitKind } from './SessionEndedScreen.js';
import { useReceiveOnlyGuard } from '../../lib/useReceiveOnlyGuard.js';
import { AudioControlProvider } from '../../lib/audioControl.js';
import { CLASS_ENDED_BROADCAST } from '../../lib/classroomEvents.js';

export function ClassroomUI({ joined, onLeft }: { joined: JoinedState; onLeft: () => void }): JSX.Element {
  const { meeting } = useRealtimeKitMeeting();
  const { notifyError } = useToast();
  // Students never capture or publish anything. Enforced continuously, not
  // just once on join — see useReceiveOnlyGuard.
  useReceiveOnlyGuard();
  const [waiting, setWaiting] = useState(false);
  // Non-null once the class is over for this student, whatever the reason.
  // Replaces "navigate away + toast", which left them on the join page with
  // an error for what is usually a perfectly normal end of lesson.
  const [exit, setExit] = useState<ExitKind | null>(null);
  // Closed by default: the stage is what a student joins for, and on a phone
  // an open sidebar covers most of it. The unread badge on the chat button
  // still surfaces new messages.
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const hasLeftRef = useRef(false);
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    hasLeftRef.current = false;
    const leaveOnce = (): void => {
      if (hasLeftRef.current) return;
      hasLeftRef.current = true;
      // Force the SDK to tear down its transports so a wedged reconnect loop
      // doesn't keep retrying (and spamming the console) after we navigate away.
      void meeting.leave().catch(() => { });
      onLeft();
    };
    // A media failure often arrives moments BEFORE roomLeft('ended') when a
    // teacher ends the class - the transport dies as a consequence of the room
    // closing. Declaring "connection lost" immediately would mislabel a normal
    // ending as a fault, so hold briefly and let roomLeft win if it is coming.
    let mediaFailTimer = 0;
    const MEDIA_FAIL_GRACE_MS = 2500;

    // Show a terminal screen instead of navigating away. Tears the SDK down
    // the same way leaveOnce does, but keeps the student here so they can
    // read what happened.
    const exitWith = (kind: ExitKind): void => {
      if (hasLeftRef.current) return;
      hasLeftRef.current = true;
      window.clearTimeout(mediaFailTimer);
      void meeting.leave().catch(() => { });
      setExit(kind);
    };

    const onWaitlisted = (): void => setWaiting(true);
    // Keeping a student off air is no longer this handler's job — it lost the
    // race against presets that auto-publish *after* join, and its unguarded
    // disable*().catch() let a synchronous SDK throw unmount the classroom.
    // useReceiveOnlyGuard now enforces it continuously and safely.
    const onRoomJoined = (): void => setWaiting(false);
    // The SDK's LeaveRoomState is 'kicked' | 'ended' | 'left' | 'rejected' |
    // 'connected-meeting' | 'disconnected' | 'failed' | 'stageLeft'. The old
    // handler named only three and dumped the rest into
    // notifyError(`Disconnected from session (…)`) — so a class ending on
    // anything but the exact string 'ended' told the student something had
    // gone wrong. Every state is now mapped deliberately.
    const onRoomLeft = (payload: { state: string }): void => {
      switch (payload.state) {
        case 'left':
        case 'stageLeft':
        case 'connected-meeting':
          // The student's own doing (or an internal transition) — no
          // announcement needed, just go back.
          leaveOnce();
          return;
        case 'ended':
          exitWith('ended');
          return;
        case 'kicked':
          exitWith('kicked');
          return;
        case 'rejected':
          exitWith('rejected');
          return;
        default:
          exitWith('disconnected');
      }
    };
    // ICE/TURN failures on the media (audio/video) transport surface here,
    // not via 'roomLeft' — the SDK retries internally forever without ever
    // emitting a room-level event, so left unhandled this spins silently
    // except for console spam. Catch it and bail out instead.
    const onMediaState = (update: { state: string }): void => {
      if (update.state !== 'failed') return;
      if (hasLeftRef.current || mediaFailTimer) return;
      mediaFailTimer = window.setTimeout(() => exitWith('disconnected'), MEDIA_FAIL_GRACE_MS);
    };
    // Backstop for the class ending. The teacher's kickAll() is what normally
    // gets us here (the SDK turns it into roomLeft('ended') above), but that
    // call is gated on the teacher preset's `kickParticipant` permission —
    // without it students were left staring at "waiting for the teacher" long
    // after the class was over. Broadcasting is ungated on both ends, so the
    // teacher always has a way to say so.
    const onBroadcast = (payload: { type: string }): void => {
      if (payload.type !== CLASS_ENDED_BROADCAST) return;
      exitWith('ended');
    };
    meeting.self.on('waitlisted', onWaitlisted);
    meeting.self.on('roomJoined', onRoomJoined);
    meeting.self.on('roomLeft', onRoomLeft);
    meeting.participants.on('broadcastedMessage', onBroadcast);
    meeting.meta.on('mediaConnectionUpdate', onMediaState);

    // Circuit breaker: when ICE can never succeed (e.g. TURN unreachable),
    // the SDK's internal reconnect loop retries with only a ~10ms delay and
    // leaks a socket listener per attempt (visible as
    // MaxListenersExceededWarning), never reaching a terminal state that
    // 'mediaConnectionUpdate' would report. Left unchecked this can freeze
    // the tab. Detect the repeated uncaught TransportConnectionError
    // rejections directly and force a leave before it runs away.
    let transportErrorCount = 0;
    let windowStartedAt = Date.now();
    const TRANSPORT_ERROR_THRESHOLD = 4;
    const TRANSPORT_ERROR_WINDOW_MS = 2000;
    const onUnhandledRejection = (event: PromiseRejectionEvent): void => {
      const reason = event.reason as { name?: string } | undefined;
      if (reason?.name !== 'TransportConnectionError') return;
      const now = Date.now();
      if (now - windowStartedAt > TRANSPORT_ERROR_WINDOW_MS) {
        windowStartedAt = now;
        transportErrorCount = 0;
      }
      transportErrorCount += 1;
      if (transportErrorCount < TRANSPORT_ERROR_THRESHOLD) return;
      exitWith('disconnected');
    };
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.clearTimeout(mediaFailTimer);
      meeting.self.off('waitlisted', onWaitlisted);
      meeting.self.off('roomJoined', onRoomJoined);
      meeting.self.off('roomLeft', onRoomLeft);
      meeting.participants.off('broadcastedMessage', onBroadcast);
      meeting.meta.off('mediaConnectionUpdate', onMediaState);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting]);

  useEffect(() => {
    if (hasJoinedRef.current) return;
    hasJoinedRef.current = true;
    meeting.join().catch((err: unknown) => {
      // A validly-formatted but expired/invalid/revoked authToken fails
      // here (server-side rejection) rather than at initMeeting — no
      // 'roomLeft' event fires for this since the room was never joined, so
      // without an explicit catch this was an unhandled rejection that left
      // the classroom UI stuck.
      if (hasLeftRef.current) return;
      hasLeftRef.current = true;
      notifyError(`Failed to join the session: ${err instanceof Error ? err.message : String(err)}`);
      onLeft();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting]);

  useEffect(() => {
    if (chatOpen) setUnreadChatCount(0);
  }, [chatOpen]);

  useEffect(() => {
    const onChatUpdate = (): void => {
      if (!chatOpen) setUnreadChatCount((count) => count + 1);
    };
    meeting.chat.on('chatUpdate', onChatUpdate);
    return () => {
      meeting.chat.off('chatUpdate', onChatUpdate);
    };
  }, [meeting, chatOpen]);

  const leave = async (): Promise<void> => {
    await meeting.leave();
    onLeft();
  };

  // Checked before `waiting`, and before the stage: once the room is gone the
  // stage would otherwise keep showing "Waiting for the teacher to share their
  // camera or screen…", because all it can see is that the presenter left the
  // participant list. That was the bug — "still waiting" and an error toast,
  // for a class that had simply finished.
  if (exit) {
    return <SessionEndedScreen kind={exit} meetingTitle={joined.meetingTitle} onBack={onLeft} />;
  }

  if (waiting) {
    // No audio sink needed here: there is no presenter to listen to yet.
    // PresenterAudio mounts with the presenter on the stage and owns both
    // playback and the autoplay prompt.
    return <WaitingScreen meetingTitle={joined.meetingTitle} />;
  }

  return (
    // The provider spans the stage and the toolbar because the two halves of
    // the volume control live in each: PresenterAudio owns the only <audio>
    // elements (so that only the presenter's tracks can ever reach a sink),
    // while the control the student actually touches belongs in the bottom bar.
    <AudioControlProvider>
      <div className="relative h-screen w-full overflow-hidden bg-bg">
        <StudentTopBar meetingTitle={joined.meetingTitle} />
        <StudentStage sessionId={joined.sessionId} />
        <StudentChatSidebar open={chatOpen} onClose={() => setChatOpen(false)} selfParticipantId={joined.participantId} />
        <StudentBottomBar
          chatOpen={chatOpen}
          onToggleChat={() => setChatOpen((v) => !v)}
          unreadChatCount={unreadChatCount}
          onLeave={leave}
        />
      </div>
    </AudioControlProvider>
  );
}
