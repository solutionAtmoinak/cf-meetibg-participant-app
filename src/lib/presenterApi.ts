// Read-only presenter-lock status. Students never acquire/release/heartbeat
// the lock — that's host-app's job — this app only ever asks "who is the
// active presenter right now?" so it can filter the stage to their tracks.
// See SINGLE_ACTIVE_HOST_PRESENTER.md and apiConfig.ts for the Worker base URL.
import axios from 'axios';
import { BACKEND_URL } from './apiConfig.js';

export interface PresenterStatus {
  activePresenterId: string | null;
  epoch: number;
  /**
   * True when the request never reached a working presenter-lock endpoint
   * (network failure, 404 because the Worker hasn't been redeployed with
   * these routes yet, 5xx, or a malformed body) — the caller should treat
   * "who's presenting" as unknown rather than "nobody is", so a real
   * teacher session doesn't read as a permanent waiting screen.
   */
  unavailable?: boolean;
}

export async function getPresenterStatus(sessionId: string): Promise<PresenterStatus> {
  try {
    const { data, status } = await axios.get<PresenterStatus>(
      `${BACKEND_URL}/api/sessions/${encodeURIComponent(sessionId)}/presenter`,
      { validateStatus: () => true }
    );
    if (status >= 400 || typeof data !== 'object' || data === null || typeof data.activePresenterId === 'undefined') {
      return { activePresenterId: null, epoch: 0, unavailable: true };
    }
    return data;
  } catch {
    return { activePresenterId: null, epoch: 0, unavailable: true };
  }
}
