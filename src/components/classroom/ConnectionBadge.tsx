import { FiWifiOff } from 'react-icons/fi';

/**
 * Responsive placement, and the two breakpoints are deliberately different
 * positions rather than the same box scaled down:
 *
 * - Desktop: top-right, clear of the presenter name tag on the left.
 * - Narrow: the top corners are crowded (name tag, standby banner), so it
 *   moves to sit just above the control bar and centers itself, where there's
 *   nothing to collide with.
 */
const badgeClass =
  'absolute z-30 flex items-center gap-2 rounded-md bg-warning text-white font-medium shadow-float ' +
  'top-[4.75rem] right-4 py-2 px-3 text-[0.78rem] max-w-[min(20rem,55vw)] ' +
  'max-[720px]:top-auto max-[720px]:right-auto max-[720px]:bottom-[6.25rem] max-[720px]:left-1/2 ' +
  'max-[720px]:-translate-x-1/2 max-[720px]:w-max max-[720px]:max-w-[calc(100vw-1.5rem)] ' +
  'max-[720px]:text-[0.72rem] max-[720px]:py-[0.4rem] max-[720px]:px-[0.6rem]';

export function ConnectionBadge({ message }: { message: string }): JSX.Element {
  return (
    <div className={badgeClass} role="status" data-testid="poor-connection-warning">
      <FiWifiOff size={14} className="shrink-0" />
      <span>{message}</span>
    </div>
  );
}
