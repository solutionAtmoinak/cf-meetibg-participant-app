/**
 * Messages the teacher's app broadcasts to the room.
 *
 * Why a broadcast at all, when ending a class already produces
 * roomLeft('ended')? Because the teacher's `kickAll()` — the call the SDK
 * turns into that event — is gated on the teacher preset's `kickParticipant`
 * permission. Without it nothing reaches the students, and they keep looking
 * at "Waiting for the teacher to share their camera or screen…" after the
 * class is over. Broadcasting needs no permission on either end, so it always
 * gets through.
 */

/**
 * MUST stay in sync with host-app/src/lib/sessionTeardown.ts, which sends it.
 * The two apps are separate repos, so nothing enforces this but this comment.
 */
export const CLASS_ENDED_BROADCAST = 'classroom:session-ended';
