import { FiClock } from 'react-icons/fi';
import { PulsingDots } from '../common/Loader.js';
import {
  pageWrapClass,
  statusBadgeClass,
  statusBodyClass,
  statusCardClass,
  statusTitleClass,
} from '../common/formStyles.js';

export function WaitingScreen({ meetingTitle }: { meetingTitle: string }): JSX.Element {
  return (
    // Centred on the full page rather than pinned 4rem from the top: this is
    // the whole screen while it shows, so it should sit where the eye already
    // is, on the same ground and card as every other pre-classroom state.
    <div className={pageWrapClass} data-testid="waiting-screen">
      <div className={statusCardClass}>
        <span className={statusBadgeClass}>
          <FiClock size={24} />
        </span>
        <h1 className={statusTitleClass}>Waiting for the host to admit you…</h1>
        <p className={statusBodyClass}>
          You&apos;ve requested to join <strong className="font-semibold text-text">{meetingTitle}</strong>. Hang tight
          — the host will let you in shortly.
        </p>
        <PulsingDots />
      </div>
    </div>
  );
}
