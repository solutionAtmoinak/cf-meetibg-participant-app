/**
 * Human-facing role label for a participant. Prefers RealtimeKit's own
 * `isHost` flag, but that depends on the Cloudflare dashboard preset
 * actually being configured with the host role — if it isn't, `isHost` can
 * read false for a real teacher. Falling back to a teacher/host pattern in
 * the preset *name* (this project's own naming convention — see
 * mock-worker.mjs and CLAUDE_CODE_BUILD_PROMPT.md) catches that case too.
 * Either signal being true is enough to call someone a teacher; never show
 * the raw preset string itself to a user.
 */
export function roleLabel(participant: { isHost: boolean; presetName?: string }): 'Teacher' | 'Student' {
  const presetLooksLikeTeacher = Boolean(participant.presetName && /teacher|host/i.test(participant.presetName));
  return participant.isHost || presetLooksLikeTeacher ? 'Teacher' : 'Student';
}
