import { useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { RealtimeKitProvider, useRealtimeKitClient } from '@cloudflare/realtimekit-react';
import { FiVideo } from 'react-icons/fi';
import type { JoinedState } from '../types.js';
import { ClassroomUI } from '../components/classroom/ClassroomUI.js';
import { Loader, PulsingDots } from '../components/common/Loader.js';
import { pageWrapClass } from '../components/common/formStyles.js';
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
    // The literal "Connecting…" is kept verbatim: e2e/participant.spec.ts
    // asserts on that exact text to prove the join handed off to the SDK.
    return (
      <div className={pageWrapClass} data-testid="connecting-screen">
        <div className="flex flex-col items-center gap-4 text-center p-8">
          <span className="relative flex items-center justify-center w-20 h-20">
            <Loader size={80} className="absolute inset-0" />
            <span className="flex items-center justify-center w-14 h-14 rounded-full bg-accent-soft text-accent">
              <FiVideo size={26} />
            </span>
          </span>
          <h1 className="m-0 text-[1.15rem] font-semibold text-text">Connecting…</h1>
          <p className="m-0 max-w-80 text-[0.9rem] leading-relaxed text-text-dim">
            Setting up your classroom — this usually takes a few seconds.
          </p>
          <PulsingDots />
        </div>
      </div>
    );
  }

  return (
    <RealtimeKitProvider value={meeting}>
      <ClassroomUI joined={joined} onLeft={onLeft} />
    </RealtimeKitProvider>
  );
}
