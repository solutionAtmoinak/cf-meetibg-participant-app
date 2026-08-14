// Wire/domain types shared by sessionApi.ts and its callers.

export interface JoinResult {
  authToken: string;
  participantId: string;
  presetName: string;
  meetingTitle: string;
  rejoined: boolean;
}

// Shape returned by the Worker for a session/meeting resource.
export interface WorkerMeeting {
  id: string;
  title: string;
  status: 'ACTIVE' | 'INACTIVE';
}
