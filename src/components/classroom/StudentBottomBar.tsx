import { useRealtimeKitMeeting, useRealtimeKitSelector } from '@cloudflare/realtimekit-react';
import { FiMessageSquare, FiLogOut } from 'react-icons/fi';
import { FaRegHandPaper } from 'react-icons/fa';
import { useReportedAction } from '../../lib/toast.js';
import { VolumeMenu } from './VolumeMenu.js';
import {
  controlBtnDefault,
  controlBtnOn,
  controlBtnDanger,
  controlDividerClass,
  countBadgeAlertClass,
} from './controlStyles.js';

/**
 * Icon-only floating control bar matching host-app's visual language.
 * Raise-hand is a plain chat ping (see raiseHand below) — no RealtimeKit
 * stage/permission APIs involved, since those require preset-level
 * permissions this deployment doesn't reliably grant (ERR2001 Permission
 * denied on getAccessRequests). No camera, screen-share, or mic control for
 * students — participant-app is receive-only end to end.
 */
export function StudentBottomBar({
  chatOpen,
  onToggleChat,
  unreadChatCount,
  onLeave,
}: {
  chatOpen: boolean;
  onToggleChat: () => void;
  unreadChatCount: number;
  onLeave: () => Promise<void>;
}): JSX.Element {
  const { meeting } = useRealtimeKitMeeting();
  const reported = useReportedAction();
  const selfName = useRealtimeKitSelector((m) => m.self.name);

  // Purely a social signal — a normal chat message, not a stage request.
  // The host sees it appear in chat like any other message; there's nothing
  // server-side to grant or deny.
  const raiseHand = reported('Hand raised', async () => {
    await meeting.chat.sendTextMessage(`✋ ${selfName} raised hand`);
  });

  const leave = reported('You left the session', onLeave);

  return (
    <div
      className="absolute left-1/2 bottom-4 -translate-x-1/2 z-30 flex items-center gap-2 bg-panel-bg border border-border rounded-pill p-2 shadow-float backdrop-blur-lg max-w-[calc(100vw-1rem)] overflow-x-auto max-[720px]:bottom-[0.6rem] max-[720px]:p-[0.4rem] max-[720px]:gap-[0.35rem]"
      role="toolbar"
      aria-label="Classroom controls"
    >
      <button className={controlBtnDefault} onClick={raiseHand} title="Raise hand" data-testid="raise-hand">
        <FaRegHandPaper size={17} />
      </button>

      <VolumeMenu />

      <div className={controlDividerClass} />

      <button
        className={chatOpen ? controlBtnOn : controlBtnDefault}
        onClick={onToggleChat}
        title="Chat"
        aria-pressed={chatOpen}
        data-testid="toggle-chat-panel"
      >
        <FiMessageSquare size={19} />
        {unreadChatCount > 0 && <span className={countBadgeAlertClass}>{unreadChatCount}</span>}
      </button>

      <div className={controlDividerClass} />

      <button className={controlBtnDanger} onClick={leave} title="Leave class" data-testid="leave-session">
        <FiLogOut size={19} />
      </button>
    </div>
  );
}
