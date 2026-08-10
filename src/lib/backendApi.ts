// Talks directly to the deployed `rtk-session` Cloudflare Worker
// (https://rtk-session.pritam-solutioninfotech.workers.dev) — a thin wrapper
// around Cloudflare RealtimeKit's REST API. There is no app-specific backend
// anymore; this file's job is just to match the Worker's routes and response
// shapes, not to invent its own contract.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'https://rtk-session.pritam-solutioninfotech.workers.dev';

export class BackendApiError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'BackendApiError';
    this.code = code;
  }
}

export interface JoinResult {
  authToken: string;
  presetName: string;
  meetingTitle: string;
}

interface WorkerMeeting {
  id: string;
  title: string;
  status: 'ACTIVE' | 'INACTIVE';
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
  } catch (err) {
    throw new BackendApiError('NETWORK_ERROR', `Could not reach backend: ${err instanceof Error ? err.message : String(err)}`);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new BackendApiError('INVALID_RESPONSE', 'Backend returned a non-JSON response');
  }

  const data = json as { success?: boolean; error?: unknown };
  if (!response.ok || data.success === false) {
    const message = typeof data.error === 'string' ? data.error : `Backend returned ${response.status}`;
    throw new BackendApiError('UNKNOWN_ERROR', message);
  }
  return json as T;
}

/**
 * The only backend call the participant app ever needs to make. There is
 * intentionally no createSession, end, or recording export here — those are
 * host-only actions, and this file is the participant app's entire surface
 * for talking to the backend.
 */
export async function joinSession(sessionId: string, name: string): Promise<JoinResult> {
  const sessionData = await call<{ session: WorkerMeeting }>(`/api/sessions/${encodeURIComponent(sessionId)}`);
  const data = await call<{ authToken: string; presetName: string }>(
    `/api/sessions/${encodeURIComponent(sessionId)}/join`,
    {
      method: 'POST',
      body: JSON.stringify({ name }),
    }
  );
  return { authToken: data.authToken, presetName: data.presetName, meetingTitle: sessionData.session.title };
}
