import { FaGraduationCap } from 'react-icons/fa';

export function StudentTopBar({ meetingTitle }: { meetingTitle: string }): JSX.Element {
  return (
    <div className="absolute top-4 left-4 z-30 pointer-events-none [&>*]:pointer-events-auto max-[720px]:top-[0.6rem] max-[720px]:left-[0.6rem]">
      <div className="flex items-center gap-2 bg-panel-bg border border-border rounded-pill py-[0.45rem] pr-[0.9rem] pl-[0.55rem] shadow-float backdrop-blur-md">
        <span className="w-7 h-7 rounded-full bg-[linear-gradient(135deg,var(--color-accent),#4f8cff)] flex items-center justify-center text-white text-[0.8rem] shrink-0">
          <FaGraduationCap />
        </span>
        <span className="text-[0.88rem] font-semibold text-text max-w-[45vw] overflow-hidden text-ellipsis whitespace-nowrap">
          {meetingTitle}
        </span>
      </div>
    </div>
  );
}
