import { FiCheckCircle, FiLogIn, FiSlash, FiUserX, FiWifiOff } from 'react-icons/fi';
import type { IconType } from 'react-icons';
import {
  btnPrimaryClass,
  pageWrapClass,
  statusBadgeClass,
  statusBodyClass,
  statusCardClass,
  statusTitleClass,
} from '../common/formStyles.js';

/**
 * Why a screen and not a toast.
 *
 * When a class ended, the student was left looking at "Waiting for the teacher
 * to share their camera or screen…" with an error toast floating over it — the
 * stage had no idea the room was gone, it just saw the presenter disappear
 * from the participant list. So the app said "still waiting" and "something
 * went wrong" at the same time, when the truth was simply that the lesson had
 * finished.
 *
 * A finished class is a normal, successful outcome and reads as one here.
 * Only genuine faults (removed, not admitted, connection lost) carry a warning
 * tone, and even those explain the next step rather than showing an error code.
 */
export type ExitKind = 'ended' | 'kicked' | 'rejected' | 'disconnected';

interface ExitCopy {
  Icon: IconType;
  /** Accent for a normal ending, warning for the ones needing attention. */
  tone: 'accent' | 'warning';
  title: string;
  detail: string;
}

const COPY: Record<ExitKind, ExitCopy> = {
  ended: {
    Icon: FiCheckCircle,
    tone: 'accent',
    title: 'Session Ended',
    detail: 'The host has finished this session. Thank you for joining.',
  },
  kicked: {
    Icon: FiUserX,
    tone: 'warning',
    title: 'Disconnected from Session',
    detail: 'You have been removed from this session by the host.',
  },
  rejected: {
    Icon: FiSlash,
    tone: 'warning',
    title: 'Entry Not Approved',
    detail: 'The host did not admit you to this session. Please verify your invite and try again.',
  },
  disconnected: {
    Icon: FiWifiOff,
    tone: 'warning',
    title: 'Connection Lost',
    detail: 'We could not keep the session connected. Please check your network and try rejoining.',
  },
};

export function SessionEndedScreen({
  kind,
  meetingTitle,
  onBack,
}: {
  kind: ExitKind;
  meetingTitle: string;
  onBack: () => void;
}): JSX.Element {
  const { Icon, tone, title, detail } = COPY[kind];
  // Same badge geometry as every other status screen; only the tone changes,
  // so a finished class and a fault read as the same kind of moment rather
  // than two different screens.
  const badgeClass =
    tone === 'accent' ? statusBadgeClass : 'flex items-center justify-center w-14 h-14 rounded-full bg-warning/15 text-warning';

  return (
    <div className={`h-screen ${pageWrapClass}`} data-testid="session-ended-screen">
      <div className={statusCardClass} role="status" data-exit-kind={kind}>
        <span className={badgeClass}>
          <Icon size={24} />
        </span>
        <span className="flex flex-col gap-1">
          <h1 className={statusTitleClass}>{title}</h1>
          {meetingTitle && <p className="m-0 text-[0.85rem] font-medium text-text-dim">{meetingTitle}</p>}
        </span>
        <p className={statusBodyClass}>{detail}</p>
        <button onClick={onBack} className={`${btnPrimaryClass} mt-1`} data-testid="back-to-join">
          <FiLogIn size={16} />
          Back to join page
        </button>
      </div>
    </div>
  );
}
