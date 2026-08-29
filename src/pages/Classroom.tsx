import { useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { RealtimeKitProvider, useRealtimeKitClient } from '@cloudflare/realtimekit-react';
import type { JoinedState } from '../types.js';
import { ClassroomUI } from '../components/classroom/ClassroomUI.js';
import { useToast } from '../lib/toast.js';

export function Classroom(): JSX.Element {
  const [meeting, initMeeting] = useRealtimeKitClient();
  const { notifyError } = useToast();
  const navigate = useNavigate();
  const { state } = useLocation();
  const joined = state as JoinedState | null;
  const onLeft = () => navigate('/');

  useEffect(() => {
    if (!joined) return;
    initMeeting({
      authToken: joined.authToken,
      // Students are receive-only (see ClassroomUI's onRoomJoined) — never
      // let the preset auto-capture the mic/camera on join. Capturing and
      // immediately disabling still spins up getUserMedia and an encoder,
      // which is wasted CPU/bandwidth that hurts stream playback quality.
      defaults: { audio: false, video: false },
    }).catch((err: unknown) => {
      // A malformed/expired/invalid authToken fails right here, before any
      // room connection exists — `meeting` never gets set, so without this
      // the UI would otherwise sit stuck on "Connecting…" forever. Bounce
      // back to the join screen instead.
      notifyError(`Failed to initialize session: ${err instanceof Error ? err.message : String(err)}`);
      navigate('/');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined?.authToken]);

  if (!joined) {
    return <Navigate to="/" replace />;
  }

  if (!meeting) {
    return <div className="p-8 text-center">Connecting…</div>;
  }

  return (
    <RealtimeKitProvider value={meeting}>
      <ClassroomUI joined={joined} onLeft={onLeft} />
    </RealtimeKitProvider>
  );
}
