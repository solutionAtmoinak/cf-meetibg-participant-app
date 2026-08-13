import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinSession } from '../lib/sessionApi.js';
import { errorMessage } from '../lib/errorMessage.js';
import { useToast } from '../lib/toast.js';
import { storeSelfParticipantId } from '../lib/participantSession.js';

export interface JoinedState {
  sessionId: string;
  authToken: string;
  presetName: string;
  meetingTitle: string;
  name: string;
  participantId: string;
}

export function Landing(): JSX.Element {
  const navigate = useNavigate();
  const { notifyError, notifySuccess } = useToast();
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleJoin(): Promise<void> {
    if (!name.trim()) return notifyError('Enter your name first');
    if (!userId.trim()) return notifyError('Enter a user id first');
    if (!sessionId.trim()) return notifyError('Enter a session id first');
    setBusy(true);
    try {
      const join = await joinSession(sessionId.trim(), name.trim(), userId.trim());
      storeSelfParticipantId(sessionId.trim(), join.participantId);
      notifySuccess(`Joining "${join.meetingTitle}"`);
      const joined: JoinedState = {
        sessionId: sessionId.trim(),
        authToken: join.authToken,
        presetName: join.presetName,
        meetingTitle: join.meetingTitle,
        name: name.trim(),
        participantId: join.participantId,
      };
      navigate('/room', { state: joined });
    } catch (err) {
      notifyError(errorMessage(err, 'Failed to join session'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-105 my-16 mx-auto p-6">
      <h1>RealtimeKit QA — Participant</h1>
      <p className="opacity-70">Student / viewer test harness. No account needed — just a name.</p>

      <label className="flex flex-col gap-1 mb-3 text-[0.9rem]">
        Your name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bob"
          data-testid="name-input"
          className="p-2 text-base border border-border rounded"
        />
      </label>

      <label className="flex flex-col gap-1 mb-3 text-[0.9rem]">
        User id
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Stable id from your own system"
          data-testid="user-id-input"
          className="p-2 text-base border border-border rounded"
        />
      </label>

      <label className="flex flex-col gap-1 mb-3 text-[0.9rem]">
        Session id
        <input
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="session id from your teacher"
          data-testid="session-id-input"
          className="p-2 text-base border border-border rounded"
        />
      </label>

      <button
        onClick={handleJoin}
        disabled={busy}
        data-testid="join-session-button"
        className="rounded-md border border-border bg-accent px-[0.9rem] py-2 text-[0.9rem] text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? 'Joining…' : 'Join Classroom'}
      </button>
    </div>
  );
}
