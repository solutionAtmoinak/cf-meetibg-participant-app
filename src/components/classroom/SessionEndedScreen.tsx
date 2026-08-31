import { FiCheckCircle, FiLogIn, FiSlash, FiUserX, FiWifiOff } from 'react-icons/fi';
import type { IconType } from 'react-icons';

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
    title: 'Class has ended',
    detail: 'Your teacher has finished the session. See you in the next class.',
  },
  kicked: {
    Icon: FiUserX,
    tone: 'warning',
    title: 'You have left this class',
    detail: 'Your teacher removed you from the session. Ask them for a new link if you need to rejoin.',
  },
  rejected: {
    Icon: FiSlash,
    tone: 'warning',
    title: 'Entry not approved',
    detail: 'Your teacher did not admit you to this class. Check the session ID with them and try again.',
  },
  disconnected: {
    Icon: FiWifiOff,
    tone: 'warning',
    title: 'Connection lost',
    detail: 'We could not keep the class connected. Check your network, then rejoin to continue.',
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
  const badgeClass =
    tone === 'accent'
      ? 'flex items-center justify-center w-16 h-16 rounded-full bg-accent-soft text-accent'
      : 'flex items-center justify-center w-16 h-16 rounded-full bg-warning/15 text-warning';

  return (
    <div className="h-screen w-full flex items-center justify-center px-4 bg-bg" data-testid="session-ended-screen">
      <div
        className="flex flex-col items-center gap-4 text-center max-w-100 w-full p-8 rounded-lg border border-border bg-panel-bg-solid shadow-panel"
        role="status"
        data-exit-kind={kind}
      >
        <span className={badgeClass}>
          <Icon size={26} />
        </span>
        <h1 className="m-0 text-[1.15rem] font-semibold text-text">{title}</h1>
        {meetingTitle && <p className="m-0 text-[0.9rem] font-medium text-text">{meetingTitle}</p>}
        <p className="m-0 text-[0.9rem] leading-relaxed text-text-dim">{detail}</p>
        <button
          onClick={onBack}
          className="mt-1 inline-flex items-center justify-center gap-2 py-[0.6rem] px-5 rounded-pill border-none bg-accent text-white text-[0.9rem] font-semibold cursor-pointer transition-colors hover:bg-accent-hover"
          data-testid="back-to-join"
        >
          <FiLogIn size={16} />
          Back to join page
        </button>
      </div>
    </div>
  );
}
