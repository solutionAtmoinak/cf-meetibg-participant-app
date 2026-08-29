import { useRealtimeKitMeeting } from '@cloudflare/realtimekit-react';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '../../lib/toast.js';
import type { JoinedState } from '../../types.js';
import { StudentTopBar } from './StudentTopBar.js';
import { StudentStage } from './StudentStage.js';
import { StudentBottomBar } from './StudentBottomBar.js';
import { StudentChatSidebar } from './StudentChatSidebar.js';
import { WaitingScreen } from './WaitingScreen';
import { useReceiveOnlyGuard } from '../../lib/useReceiveOnlyGuard.js';

export function ClassroomUI({ joined, onLeft }: { joined: JoinedState; onLeft: () => void }): JSX.Element {
  const { meeting } = useRealtimeKitMeeting();
  const { notifyError, notifySuccess } = useToast();
  // Students never capture or publish anything. Enforced continuously, not
  // just once on join — see useReceiveOnlyGuard.
  useReceiveOnlyGuard();
  const [waiting, setWaiting] = useState(false);
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
    const onWaitlisted = (): void => setWaiting(true);
    // Keeping a student off air is no longer this handler's job — it lost the
    // race against presets that auto-publish *after* join, and its unguarded
    // disable*().catch() let a synchronous SDK throw unmount the classroom.
    // useReceiveOnlyGuard now enforces it continuously and safely.
    const onRoomJoined = (): void => setWaiting(false);
    const onRoomLeft = (payload: { state: string }): void => {
      if (payload.state === 'kicked') notifyError('You were removed from the session');
      else if (payload.state === 'ended') notifySuccess('The session has ended');
      else if (payload.state === 'rejected') notifyError('The teacher denied your entry request');
      else notifyError(`Disconnected from session (${payload.state})`);
      leaveOnce();
    };
    // ICE/TURN failures on the media (audio/video) transport surface here,
    // not via 'roomLeft' — the SDK retries internally forever without ever
    // emitting a room-level event, so left unhandled this spins silently
    // except for console spam. Catch it and bail out instead.
    const onMediaState = (update: { state: string }): void => {
      if (update.state !== 'failed') return;
      notifyError('Lost connection to the session (network/TURN failure) — check your network and rejoin');
      leaveOnce();
    };
    meeting.self.on('waitlisted', onWaitlisted);
    meeting.self.on('roomJoined', onRoomJoined);
    meeting.self.on('roomLeft', onRoomLeft);
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
      notifyError('Lost connection to the session (network/TURN failure) — check your network and rejoin');
      leaveOnce();
    };
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      meeting.self.off('waitlisted', onWaitlisted);
      meeting.self.off('roomJoined', onRoomJoined);
      meeting.self.off('roomLeft', onRoomLeft);
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

  if (waiting) {
    // No audio sink needed here: there is no presenter to listen to yet.
    // PresenterAudio mounts with the presenter on the stage and owns both
    // playback and the autoplay prompt.
    return <WaitingScreen meetingTitle={joined.meetingTitle} />;
  }

  return (
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
  );
}
