import { FiClock } from 'react-icons/fi';
import { PulsingDots } from '../common/Loader.js';

export function WaitingScreen({ meetingTitle }: { meetingTitle: string }): JSX.Element {
  return (
    <div className="max-w-120 my-16 mx-auto p-6 text-center" data-testid="waiting-screen">
      <div className="flex flex-col items-center gap-4 p-8 rounded-lg border border-border bg-panel-bg-solid shadow-panel">
        <span className="flex items-center justify-center w-16 h-16 rounded-full bg-accent-soft text-accent">
          <FiClock size={26} />
        </span>
        <h1 className="m-0 text-[1.15rem] font-semibold text-text">Waiting for the teacher to admit you…</h1>
        <p className="m-0 text-[0.9rem] leading-relaxed text-text-dim">
          You&apos;ve requested to join <strong className="text-text">{meetingTitle}</strong>. Hang tight — the teacher
          will let you in shortly.
        </p>
        <PulsingDots />
      </div>
    </div>
  );
}
