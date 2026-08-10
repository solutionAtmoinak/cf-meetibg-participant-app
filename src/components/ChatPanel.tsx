import { useRealtimeKitMeeting } from '@cloudflare/realtimekit-react';
import { useEffect, useState } from 'react';
import { useReportedAction } from '../lib/toast.js';

interface ChatMessageLike {
  id: string;
  type: string;
  displayName: string;
  message?: string;
  time: Date;
}

export function ChatPanel(): JSX.Element {
  const { meeting } = useRealtimeKitMeeting();
  const reported = useReportedAction();
  const [messages, setMessages] = useState<ChatMessageLike[]>(meeting.chat.messages as ChatMessageLike[]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const onUpdate = (): void => setMessages([...(meeting.chat.messages as ChatMessageLike[])]);
    meeting.chat.on('chatUpdate', onUpdate);
    return () => {
      meeting.chat.off('chatUpdate', onUpdate);
    };
  }, [meeting]);

  const sendChat = reported('Message sent', async () => {
    if (!draft.trim()) throw new Error('Type a message first');
    await meeting.chat.sendTextMessage(draft.trim());
    setDraft('');
  });

  return (
    <section className="panel" aria-label="Chat and announcements">
      <h2>Chat &amp; Announcements</h2>
      <ul className="chat-log" data-testid="chat-log">
        {messages.map((m) => (
          <li key={m.id} className={m.type === 'custom' ? 'announcement' : 'chat-message'}>
            {m.type === 'custom' ? '📢 ' : ''}
            <strong>{m.displayName}:</strong> {m.message}
          </li>
        ))}
      </ul>
      <div className="chat-input-row">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          data-testid="chat-input"
        />
        <button onClick={sendChat} data-testid="send-chat">
          Send
        </button>
      </div>
    </section>
  );
}
