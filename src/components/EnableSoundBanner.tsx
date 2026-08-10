import { useEffect, useState } from 'react';
import { useRealtimeKitMeeting } from '@cloudflare/realtimekit-react';

/**
 * Browsers block autoplay of the SDK's internal remote-audio element unless
 * a user gesture unlocks it. RealtimeKit surfaces that as `autoplayError` on
 * `meeting.self` and expects the app to retry via `playAudio()` from an
 * actual click — otherwise mic/screen-share audio never plays even though
 * everything negotiated correctly.
 */
export function EnableSoundBanner(): JSX.Element | null {
  const { meeting } = useRealtimeKitMeeting();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const onAutoplayError = (): void => setBlocked(true);
    meeting.self.on('autoplayError', onAutoplayError);
    return () => {
      meeting.self.off('autoplayError', onAutoplayError);
    };
  }, [meeting]);

  if (!blocked) return null;

  const enableSound = (): void => {
    void meeting.self.playAudio().then(() => setBlocked(false));
  };

  return (
    <div className="sound-banner" role="alert">
      <span>Sound is blocked by your browser.</span>
      <button onClick={enableSound} data-testid="enable-sound">
        Click to enable sound
      </button>
    </div>
  );
}
