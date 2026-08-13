import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorMessage } from '../lib/errorMessage.js';
import { storeSelfParticipantId } from '../lib/participantSession.js';
import { joinSession } from '../lib/sessionApi.js';
import { useToast } from '../lib/toast.js';

export interface JoinedState {
  sessionId: string;
  authToken: string;
  presetName: string;
  meetingTitle: string;
  name: string;
  participantId: string;
}

export interface StudentJoinParams {
  sessionId: string;
  name: string;
  userId: string;
}

export function Landing(): JSX.Element {
  const navigate = useNavigate();
  const { notifyError, notifySuccess } = useToast();
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [busy, setBusy] = useState(false);

  async function joinOperation(params: StudentJoinParams): Promise<void> {
    setBusy(true);

    try {
      const join = await joinSession(params.sessionId, params.name, params.userId);
      storeSelfParticipantId(params.sessionId, join.participantId);
      notifySuccess(`Joining "${join.meetingTitle}"`);
      const joined: JoinedState = {
        sessionId: params.sessionId,
        authToken: join.authToken,
        presetName: join.presetName,
        meetingTitle: join.meetingTitle,
        name: params.name,
        participantId: join.participantId,
      };
      navigate('/room', { state: joined });
    } catch (err) {
      notifyError(errorMessage(err, 'Failed to join session'));
    } finally {
      setBusy(false);
    }
  }


  function joinByFormSubmit() {
    if (!name.trim()) return notifyError('Enter your name first');
    if (!userId.trim()) return notifyError('Enter a user id first');
    if (!sessionId.trim()) return notifyError('Enter a session id first');

    joinOperation({ sessionId: sessionId.trim(), name: name.trim(), userId: userId.trim() });
  }

  return (
    <section className='h-screen flex justify-center items-center'>
      <div className="max-w-105  p-6 bg-accent-soft rounded-lg shadow shadow-accent-hover">
        <h1 className='text-2xl'>Join Your Classroom</h1>
        <p className="text-text-dim mb-6">Student Join - Enter Your Name To join</p>

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
            placeholder="System user id"
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
          onClick={joinByFormSubmit}
          disabled={busy}
          data-testid="join-session-button"
          className="rounded-md border border-border bg-accent px-[0.9rem] py-2 text-[0.9rem] text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-4"
        >
          {busy ? 'Joining…' : 'Join Classroom'}
        </button>
      </div>
    </section>
  );
}
