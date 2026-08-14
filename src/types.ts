// Shared shape handed off to the classroom once a join succeeds — used by
// pages/Landing.tsx, pages/Classroom.tsx, and components/classroom/ClassroomUI.tsx.
export interface JoinedState {
  sessionId: string;
  authToken: string;
  presetName: string;
  meetingTitle: string;
  name: string;
  participantId: string;
}
