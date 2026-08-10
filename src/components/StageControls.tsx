import { useEffect } from 'react';
import { useRealtimeKitMeeting, useRealtimeKitSelector } from '@cloudflare/realtimekit-react';
import { useReportedAction, useToast } from '../lib/toast.js';

export function StageControls(): JSX.Element {
  const { meeting } = useRealtimeKitMeeting();
  const reported = useReportedAction();
  const { notifySuccess, notifyError } = useToast();
  const stageStatus = useRealtimeKitSelector((m) => m.stage.status);
  const audioEnabled = useRealtimeKitSelector((m) => m.self.audioEnabled);
  const videoEnabled = useRealtimeKitSelector((m) => m.self.videoEnabled);

  useEffect(() => {
    const onApproved = (): void => {
      notifySuccess("You're approved to speak — joining the stage");
      meeting.stage.join().catch((err: unknown) => {
        notifyError(`Failed to join the stage: ${err instanceof Error ? err.message : String(err)}`);
      });
    };
    const onRejected = (): void => notifyError('Your request to speak was denied');
    meeting.stage.on('stageRequestApproved', onApproved);
    meeting.stage.on('stageRequestRejected', onRejected);
    return () => {
      meeting.stage.off('stageRequestApproved', onApproved);
      meeting.stage.off('stageRequestRejected', onRejected);
    };
  }, [meeting, notifySuccess, notifyError]);

  const raiseHand = reported('Hand raised — waiting for the teacher', async () => {
    await meeting.stage.requestAccess();
  });

  const lowerHand = reported('Request withdrawn', async () => {
    await meeting.stage.cancelRequestAccess();
  });

  const toggleAudio = reported(audioEnabled ? 'Microphone muted' : 'Microphone on', async () => {
    if (audioEnabled) await meeting.self.disableAudio();
    else await meeting.self.enableAudio();
  });

  const toggleVideo = reported(videoEnabled ? 'Camera stopped' : 'Camera on', async () => {
    if (videoEnabled) await meeting.self.disableVideo();
    else await meeting.self.enableVideo();
  });

  return (
    <section className="panel" aria-label="Raise hand and stage controls">
      <h2>Participation</h2>
      <p>
        Status: <strong data-testid="stage-status">{stageStatus}</strong>
      </p>
      <div className="button-row">
        {stageStatus === 'OFF_STAGE' && (
          <button onClick={raiseHand} data-testid="raise-hand">
            ✋ Raise Hand
          </button>
        )}
        {stageStatus === 'REQUESTED_TO_JOIN_STAGE' && (
          <button onClick={lowerHand} data-testid="lower-hand">
            Lower Hand
          </button>
        )}
        {stageStatus === 'ON_STAGE' && (
          <>
            <button onClick={toggleAudio} data-testid="toggle-audio">
              {audioEnabled ? 'Mute Mic' : 'Unmute Mic'}
            </button>
            <button onClick={toggleVideo} data-testid="toggle-video">
              {videoEnabled ? 'Stop Camera' : 'Share Camera'}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
