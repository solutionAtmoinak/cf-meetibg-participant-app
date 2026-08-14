// The only backend call the participant app ever needs to make. There is
// intentionally no createSession, end, or recording export here — those are
// host-only actions, and this file is the participant app's entire surface
// for talking to the backend.
import axios from 'axios';
import { getAppConfig } from './apiConfig.js';
import type { JoinResult, WorkerMeeting } from './apiTypes.js';

export async function joinSession(sessionId: string, name: string, userId: string): Promise<JoinResult> {
  const { backendUrl } = await getAppConfig();
  const { data: sessionData } = await axios.get<{ session: WorkerMeeting }>(
    `${backendUrl}/api/sessions/${encodeURIComponent(sessionId)}`
  );
  const { data } = await axios.post<{
    authToken: string;
    participantId: string;
    presetName: string;
    rejoined: boolean;
  }>(
    `${backendUrl}/api/sessions/${encodeURIComponent(sessionId)}/join`,
    // custom_participant_id is required by the Worker so it can recognize a
    // returning user instead of minting a fresh RealtimeKit participant on
    // every join — the caller supplies it (from a form field), not us.
    { name, custom_participant_id: userId }
  );
  return {
    authToken: data.authToken,
    participantId: data.participantId,
    presetName: data.presetName,
    meetingTitle: sessionData.session.title,
    rejoined: data.rejoined,
  };
}
