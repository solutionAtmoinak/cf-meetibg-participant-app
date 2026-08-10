export function WaitingScreen({ meetingTitle }: { meetingTitle: string }): JSX.Element {
  return (
    <div className="waiting-screen" data-testid="waiting-screen">
      <h1>Waiting for the teacher to admit you…</h1>
      <p>
        You&apos;ve requested to join <strong>{meetingTitle}</strong>. Hang tight — the teacher will let you in
        shortly.
      </p>
    </div>
  );
}
