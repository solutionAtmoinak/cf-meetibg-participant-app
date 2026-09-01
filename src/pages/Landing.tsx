import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { FaGraduationCap } from 'react-icons/fa6';
import { FiLogIn } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { errorMessage } from '../lib/errorMessage.js';
import { maskId } from '../lib/mask.js';
import { storeSelfParticipantId } from '../lib/participantSession.js';
import { joinSession } from '../api/sessionApi.js';
import { useToast } from '../lib/toast.js';
import type { JoinedState } from '../types.js';
import {
  brandLockupClass,
  brandMarkClass,
  brandNameClass,
  brandRoleClass,
  brandTextWrapClass,
  btnPrimaryClass,
  btnSpinnerClass,
  cardBodyClass,
  cardHeaderClass,
  fieldHintClass,
  fieldInputClass,
  fieldLabelClass,
  fieldLabelTextClass,
  pageColumnClass,
  pageFootnoteClass,
  pageWrapClass,
  sectionClass,
  sectionHeadingClass,
  sectionSubtitleClass,
} from '../components/common/formStyles.js';

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
      <div className={pageColumnClass}>
        <div className={brandLockupClass}>
          <span className={brandMarkClass}>
            <FaGraduationCap size={18} />
          </span>
          <span className={brandTextWrapClass}>
            <span className={brandNameClass}>Live Classroom</span>
            <span className={brandRoleClass}>Student</span>
          </span>
        </div>

        <section className={sectionClass}>
          <header className={cardHeaderClass}>
            <h2 className={sectionHeadingClass}>Join your classroom</h2>
            <p className={sectionSubtitleClass}>
              Enter the session id your teacher gave you to take your seat.
            </p>
          </header>
          <form onSubmit={joinByFormSubmit} className={cardBodyClass}>
            <label className={fieldLabelClass}>
              <span className={fieldLabelTextClass}>Your name</span>
              <input
                name="name"
                defaultValue={urlName || undefined}
                disabled={Boolean(urlName)}
                placeholder="Bob"
                data-testid="name-input"
                className={fieldInputClass}
              />
              <span className={fieldHintClass}>How your teacher sees you in the class list.</span>
            </label>

            <label className={fieldLabelClass}>
              <span className={fieldLabelTextClass}>User id</span>
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
              <span className={fieldLabelTextClass}>Session id</span>
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

            <button type="submit" className={btnPrimaryClass} disabled={busy} data-testid="join-session-button">
              {busy ? (
                <>
                  <span className={btnSpinnerClass} />
                  Joining…
                </>
              ) : (
                <>
                  <FiLogIn size={16} />
                  Join Classroom
                </>
              )}
            </button>
          </form>
        </section>

        <p className={pageFootnoteClass}>
          You&apos;ll watch and listen only — your camera and microphone are never used.
        </p>
      </div>
    </div>
  );
}
