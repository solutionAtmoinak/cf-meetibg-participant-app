import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { FaClock } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';
import { errorMessage } from '../lib/errorMessage.js';
import { maskId } from '../lib/mask.js';
import { storeSelfParticipantId } from '../lib/participantSession.js';
import { joinSession } from '../lib/sessionApi.js';
import { useToast } from '../lib/toast.js';
import { btnSecondaryClass, fieldInputClass, fieldLabelClass, pageWrapClass, sectionClass, sectionHeadingClass } from './formStyles.js';

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
  const [busy, setBusy] = useState(false);
  const autoSubmittedRef = useRef(false);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const urlUserId = params.get('userId') ?? '';
  const urlSessionId = params.get('sessionId') ?? '';
  const urlName = params.get('name') ?? '';

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

  function joinWith(name: string, userId: string, sessionId: string): void {
    if (!name.trim()) return notifyError('Enter your name first');
    if (!userId.trim()) return notifyError('Enter a user id first');
    if (!sessionId.trim()) return notifyError('Enter a session id first');

    void joinOperation({ sessionId: sessionId.trim(), name: name.trim(), userId: userId.trim() });
  }

  function joinByFormSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    joinWith(
      urlName || String(data.get('name') ?? ''),
      urlUserId || String(data.get('userId') ?? ''),
      urlSessionId || String(data.get('sessionId') ?? '')
    );
  }


  useEffect(() => {
    if (autoSubmittedRef.current) return;
    if (!urlName || !urlUserId || !urlSessionId) return;
    autoSubmittedRef.current = true;
    joinWith(urlName, urlUserId, urlSessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={pageWrapClass}>
      <div className="w-full max-w-120">
        <section className={sectionClass}>
          <h2 className={sectionHeadingClass}>
            <FaClock /> Join Your Classroom
          </h2>
          <form onSubmit={joinByFormSubmit}>
            <label className={fieldLabelClass}>
              Your name
              <input
                name="name"
                defaultValue={urlName || undefined}
                disabled={Boolean(urlName)}
                placeholder="Bob"
                data-testid="name-input"
                className={fieldInputClass}
              />
            </label>

            <label className={fieldLabelClass}>
              User id
              {urlUserId ? (
                <input value={maskId(urlUserId)} disabled readOnly data-testid="user-id-input" className={fieldInputClass} />
              ) : (
                <input
                  name="userId"
                  placeholder="System user id"
                  data-testid="user-id-input"
                  className={fieldInputClass}
                />
              )}
            </label>

            <label className={fieldLabelClass}>
              Session id
              {urlSessionId ? (
                <input value={maskId(urlSessionId)} disabled readOnly data-testid="session-id-input" className={fieldInputClass} />
              ) : (
                <input
                  name="sessionId"
                  placeholder="session id from your teacher"
                  data-testid="session-id-input"
                  className={fieldInputClass}
                />
              )}
            </label>

            <button type="submit" className={btnSecondaryClass} disabled={busy} data-testid="join-session-button">
              {busy ? 'Joining…' : 'Join Classroom'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
