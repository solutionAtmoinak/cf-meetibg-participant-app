/**
 * The student app has three different "there is nothing to show yet" moments
 * — connecting to the session, sitting in the waiting room, and waiting for
 * the teacher to go live. They live in three unrelated components, so these
 * indicators are shared here to stop each one inventing its own animation.
 *
 * The split is semantic, and the two are not interchangeable:
 *   <Loader/>      — we are doing work right now (connecting).
 *   <PulsingDots/> — we are waiting on another person (the teacher).
 *
 * Both are purely presentational: no state, no effects, nothing to clean up,
 * so they are safe to mount inside branches that re-render often.
 */

/** A blue ring spinning against a faint accent track. */
export function Loader({ size = 40, className = '' }: { size?: number; className?: string }): JSX.Element {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block rounded-full border-accent-soft border-t-accent animate-spin-slow ${className}`}
      // Sized inline so one component covers both the small inline case and
      // the large hero ring; the ring thickness tracks the diameter so it
      // never looks like a hairline at 80px or a donut at 20px.
      style={{
        width: size,
        height: size,
        borderStyle: 'solid',
        borderWidth: Math.max(2, Math.round(size / 16)),
      }}
    />
  );
}

/** Three blue dots rising in sequence — the calmer, "hang tight" indicator. */
export function PulsingDots({ className = '' }: { className?: string }): JSX.Element {
  // Staggered so the three dots read as a wave rather than one blinking bar.
  const delays = ['0s', '0.15s', '0.3s'];
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} aria-hidden="true">
      {delays.map((delay) => (
        <span
          key={delay}
          className="w-2 h-2 rounded-full bg-accent animate-rise"
          style={{ animationDelay: delay }}
        />
      ))}
    </span>
  );
}
