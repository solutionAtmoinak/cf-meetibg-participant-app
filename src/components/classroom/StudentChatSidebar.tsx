import { useEffect, useMemo, useRef, useState } from 'react';
import { useRealtimeKitMeeting, useRealtimeKitSelector } from '@cloudflare/realtimekit-react';
import { FiX, FiSend } from 'react-icons/fi';
import { HiOutlineSpeakerphone } from 'react-icons/hi';
import { useReportedAction } from '../../lib/toast.js';
import { roleLabel } from '../../lib/roleLabel.js';

interface ChatMessageLike {
  id: string;
  type: string;
  displayName: string;
  peerId?: string;
  userId?: string;
  message?: string;
  time: Date;
}

// z-[45]: above the floating bottom control bar (z-30) and alert banners
// (z-40) so the drawer — and its message input at the bottom — is never
// covered by them, on mobile in particular.
const sidePanelBase =
  'absolute top-4 bottom-4 right-4 z-[45] w-[min(360px,88vw)] bg-panel-bg-solid border border-border rounded-lg shadow-panel flex flex-col overflow-hidden transition-[transform,opacity] duration-[220ms] ease-in-out max-[720px]:top-[0.6rem] max-[720px]:bottom-[0.6rem] max-[720px]:right-[0.6rem] max-[720px]:w-[calc(100vw-1.2rem)]';
const sidePanelOpen = sidePanelBase;
const sidePanelClosed = `${sidePanelBase} translate-x-[calc(100%+2rem)] opacity-0 pointer-events-none`;
// No text "Teacher"/"Student" badges — a blue name background is the
// teacher signal on its own, and self vs. other is carried by bubble
// alignment/color instead.
const teacherNameClass = 'py-[0.05rem] px-[0.4rem] rounded-pill bg-accent-soft text-accent-hover font-semibold shrink-0';

/** Restyled per participant-screen.png as a docked-looking panel; same chat feature as before (send/receive text, receive announcements), nothing added or removed. */
export function StudentChatSidebar({
  open,
  onClose,
  selfParticipantId,
}: {
  open: boolean;
  onClose: () => void;
  selfParticipantId: string | null;
}): JSX.Element {
  const { meeting } = useRealtimeKitMeeting();
  const reported = useReportedAction();
  const selfId = useRealtimeKitSelector((m) => m.self.id);
  const selfUserId = useRealtimeKitSelector((m) => m.self.userId);
  const rawParticipants = useRealtimeKitSelector((m) => m.participants.joined.toArray());
  // Multi-signal self-exclusion (id / userId / Worker-assigned participant
  // id) — self shows up in `joined` here too, and `id` alone doesn't
  // reliably match `meeting.self.id`, which was inflating the online count.
  const participants = useMemo(
    () => rawParticipants.filter((p) => p.id !== selfId && p.id !== selfParticipantId && p.userId !== selfUserId),
    [rawParticipants, selfId, selfParticipantId, selfUserId]
  );
  const [messages, setMessages] = useState<ChatMessageLike[]>(meeting.chat.messages as ChatMessageLike[]);
  const [draft, setDraft] = useState('');
  const chatLogRef = useRef<HTMLUListElement>(null);

  // ChatMessage carries userId (not peerId) for the sender — matches
  // Participant.userId, RealtimeKit's stable per-person id. Self is always
  // a student in participant-app, structurally — only host-app ever
  // connects as a teacher.
  const senderRole = (userId: string | undefined): 'Teacher' | 'Student' =>
    userId === meeting.self.userId ? 'Student' : roleLabel(participants.find((p) => p.userId === userId) ?? { isHost: false });

  useEffect(() => {
    const onUpdate = (): void => setMessages([...(meeting.chat.messages as ChatMessageLike[])]);
    meeting.chat.on('chatUpdate', onUpdate);
    return () => {
      meeting.chat.off('chatUpdate', onUpdate);
    };
  }, [meeting]);

  useEffect(() => {
    const el = chatLogRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const sendChat = reported('Message sent', async () => {
    if (!draft.trim()) throw new Error('Type a message first');
    await meeting.chat.sendTextMessage(draft.trim());
    setDraft('');
  });

  return (
    <aside className={open ? sidePanelOpen : sidePanelClosed} aria-label="Class chat" aria-hidden={!open}>
      <div className="flex items-center justify-between gap-2 pt-4 px-4 pb-3 shrink-0 border-b border-border">
        <div>
          <h2 className="m-0 text-base font-semibold">Class chat</h2>
          <span className="flex items-center gap-[0.35rem] text-[0.76rem] text-text-dim mt-[0.15rem]">
            <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
            {participants.length + 1} Online
          </span>
        </div>
        <button
          className="inline-flex items-center justify-center w-7.5 h-7.5 rounded-sm border-none bg-transparent text-text-dim cursor-pointer shrink-0 transition-[background,color] duration-150 ease-in-out hover:bg-panel-bg-soft hover:text-text"
          onClick={onClose}
          aria-label="Close chat panel"
          data-testid="close-chat"
        >
          <FiX />
        </button>
      </div>

      <ul ref={chatLogRef} className="list-none px-4 m-0 flex-1 overflow-y-auto flex flex-col gap-[0.65rem] py-3" data-testid="chat-log">
        {messages.length === 0 && <li className="py-5 px-3 text-center text-text-dim text-[0.85rem]">No messages yet.</li>}
        {messages.map((m) =>
          m.type === 'custom' ? (
            <li
              key={m.id}
              className="self-center max-w-full flex items-start gap-2 py-[0.6rem] px-[0.85rem] rounded-md bg-[rgba(180,83,9,0.10)] border border-[rgba(180,83,9,0.30)] text-warning text-[0.85rem]"
            >
              <HiOutlineSpeakerphone size={16} className="shrink-0 mt-[0.15rem] text-warning" />
              <span>
                <strong>{m.displayName}:</strong> {m.message}
              </span>
            </li>
          ) : (
            (() => {
              // Matched purely by participant id (userId) — peerId is
              // per-connection and was failing to recognize the sender's own
              // messages as self.
              const isSelf = m.userId === meeting.self.userId;
              const role = senderRole(m.userId);
              const bubbleClass = isSelf
                ? 'bg-success text-white rounded-br-[4px]'
                : 'bg-panel-bg-soft border border-border text-text rounded-bl-[4px]';
              return (
                <li key={m.id} className={`flex flex-col max-w-[85%] ${isSelf ? 'self-end items-end' : 'self-start items-start'}`}>
                  <span className={`text-[0.72rem] mb-[0.2rem] px-[0.2rem] ${role === 'Teacher' ? teacherNameClass : 'text-text-dim'}`}>
                    {m.displayName}
                  </span>
                  <span className={`py-2 px-[0.8rem] rounded-md text-[0.87rem] leading-[1.35] wrap-break-word ${bubbleClass}`}>{m.message}</span>
                </li>
              );
            })()
          )
        )}
      </ul>

      <div className="shrink-0 pt-3 px-4 pb-4 border-t border-border">
        <div className="flex gap-2 items-center">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void sendChat();
            }}
            placeholder="Type a message..."
            data-testid="chat-input"
            className="flex-1 py-[0.6rem] px-[0.9rem] border border-border rounded-pill bg-panel-bg-soft text-text outline-none text-[0.88rem] transition-[border-color] duration-150 ease-in-out focus:border-accent"
          />
          <button
            className="w-9.5 h-9.5 rounded-full border-none bg-accent text-white flex items-center justify-center cursor-pointer shrink-0 transition-[background] duration-150 ease-in-out hover:bg-accent-hover disabled:bg-accent-soft disabled:text-accent disabled:cursor-not-allowed disabled:pointer-events-none"
            onClick={sendChat}
            disabled={!draft.trim()}
            aria-label="Send message"
            data-testid="send-chat"
          >
            <FiSend size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
