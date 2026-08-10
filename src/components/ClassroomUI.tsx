import { useRealtimeKitMeeting } from '@cloudflare/realtimekit-react';
import { useEffect, useRef, useState } from 'react';
import { useReportedAction, useToast } from '../lib/toast.js';
import { ChatPanel } from './ChatPanel.js';
import { EnableSoundBanner } from './EnableSoundBanner.js';
import type { JoinedState } from './Landing.js';
import { StageControls } from './StageControls.js';
import { TeacherView } from './TeacherView.js';
import { WaitingScreen } from './WaitingScreen.js';

export function ClassroomUI({ joined, onLeft }: { joined: JoinedState; onLeft: () => void }): JSX.Element {
  const { meeting } = useRealtimeKitMeeting();
  const { notifyError, notifySuccess } = useToast();
  const reported = useReportedAction();
  const [waiting, setWaiting] = useState(false);
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
    void meeting.join();
  }, [meeting]);

  const leave = reported('You left the session', async () => {
    await meeting.leave();
    onLeft();
  });

  if (waiting) {
    return <WaitingScreen meetingTitle={joined.meetingTitle} />;
  }

  return (
    <div className="classroom participant-classroom">
      <EnableSoundBanner />
      <div className="panel-header">
        <h1>{joined.meetingTitle}</h1>
        <button onClick={leave} className="danger" data-testid="leave-session">
          Leave
        </button>
      </div>
      <TeacherView />
      <StageControls />
      <ChatPanel />
    </div>
  );
}
