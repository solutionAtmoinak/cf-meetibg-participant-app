import { useEffect } from 'react';
import { RealtimeKitProvider, useRealtimeKitClient } from '@cloudflare/realtimekit-react';
import type { JoinedState } from './Landing.js';
import { ClassroomUI } from './ClassroomUI.js';
import { useToast } from '../lib/toast.js';

export function Classroom({ joined, onLeft }: { joined: JoinedState; onLeft: () => void }): JSX.Element {
  const [meeting, initMeeting] = useRealtimeKitClient();
  const { notifyError } = useToast();

  useEffect(() => {
    initMeeting({ authToken: joined.authToken }).catch((err: unknown) => {
      notifyError(`Failed to initialize RealtimeKit session: ${err instanceof Error ? err.message : String(err)}`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined.authToken]);

  if (!meeting) {
    return <div className="loading">Connecting to RealtimeKit…</div>;
  }

  return (
    <RealtimeKitProvider value={meeting}>
      <ClassroomUI joined={joined} onLeft={onLeft} />
    </RealtimeKitProvider>
  );
}
