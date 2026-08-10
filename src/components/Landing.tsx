import { useState } from 'react';
import { joinSession, BackendApiError } from '../lib/backendApi.js';
import { useToast } from '../lib/toast.js';

export interface JoinedState {
  sessionId: string;
  authToken: string;
  presetName: string;
  meetingTitle: string;
  name: string;
}

export function Landing({ onJoined }: { onJoined: (state: JoinedState) => void }): JSX.Element {
  const { notifyError, notifySuccess } = useToast();
  const [name, setName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleJoin(): Promise<void> {
    if (!name.trim()) return notifyError('Enter your name first');
    if (!sessionId.trim()) return notifyError('Enter a session id first');
    setBusy(true);
    try {
      const join = await joinSession(sessionId.trim(), name.trim());
      notifySuccess(`Joining "${join.meetingTitle}"`);
      onJoined({
        sessionId: sessionId.trim(),
        authToken: join.authToken,
        presetName: join.presetName,
        meetingTitle: join.meetingTitle,
        name: name.trim(),
      });
    } catch (err) {
      notifyError(err instanceof BackendApiError ? err.message : 'Failed to join session');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="landing">
      <h1>RealtimeKit QA — Participant</h1>
      <p className="subtitle">Student / viewer test harness. No account needed — just a name.</p>

      <label className="field">
        Your name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bob" data-testid="name-input" />
      </label>

      <label className="field">
        Session id
        <input
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="session id from your teacher"
          data-testid="session-id-input"
        />
      </label>

      <button onClick={handleJoin} disabled={busy} data-testid="join-session-button">
        {busy ? 'Joining…' : 'Join Classroom'}
      </button>
    </div>
  );
}
