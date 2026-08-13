export function WaitingScreen({ meetingTitle }: { meetingTitle: string }): JSX.Element {
  return (
    <div className="max-w-120 my-16 mx-auto p-6 text-center" data-testid="waiting-screen">
      <h1>Waiting for the teacher to admit you…</h1>
      <p>
        You&apos;ve requested to join <strong>{meetingTitle}</strong>. Hang tight — the teacher will let you in
        shortly.
      </p>
    </div>
  );
}
