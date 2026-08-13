// Persists the RealtimeKit participant id the Worker assigned this browser
// at /join, keyed by session — the most authoritative signal for "is this
// roster row me", since it comes straight from the server rather than from
// SDK getters (`meeting.self.id`) that have proven unreliable at matching
// the corresponding entry in `participants.joined` for this deployment.
const keyFor = (sessionId: string): string => `rtk:${sessionId}:participantId`;

export function storeSelfParticipantId(sessionId: string, participantId: string): void {
  try {
    sessionStorage.setItem(keyFor(sessionId), participantId);
  } catch {
    // Storage can be unavailable (private mode, quota) — the id still flows
    // through JoinedState in memory, so this is a best-effort persistence.
  }
}

export function getStoredSelfParticipantId(sessionId: string): string | null {
  try {
    return sessionStorage.getItem(keyFor(sessionId));
  } catch {
    return null;
  }
}
