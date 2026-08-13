import { useEffect, useState } from 'react';
import { useRealtimeKitMeeting } from '@cloudflare/realtimekit-react';
import { FiVolumeX } from 'react-icons/fi';

/**
 * Browsers block autoplay of the SDK's internal remote-audio element unless
 * a user gesture unlocks it. RealtimeKit surfaces that as `autoplayError` on
 * `meeting.self` and expects the app to retry via `playAudio()` from an
 * actual click — otherwise the presenter's mic/screen-share audio never
 * plays even though everything negotiated correctly.
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
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 pt-[0.55rem] pr-[0.6rem] pb-[0.55rem] pl-4 rounded-pill bg-warning text-[#221200] text-[0.85rem] font-medium shadow-float"
      role="alert"
    >
      <FiVolumeX size={16} />
      <span>Sound is blocked by your browser.</span>
      <button
        onClick={enableSound}
        data-testid="enable-sound"
        className="bg-black/85 text-white border-none font-semibold py-[0.4rem] px-[0.8rem] rounded-pill cursor-pointer text-[0.8rem]"
      >
        Click to enable sound
      </button>
    </div>
  );
}
