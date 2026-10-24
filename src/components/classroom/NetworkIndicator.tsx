import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LEVEL_COLORS, LEVEL_LABELS, type NetworkHealth } from '../../lib/networkHealth.js';

const BAR_HEIGHTS = [5, 8, 11, 14, 17] as const;

const rowClass = 'flex items-baseline justify-between gap-4';

/**
 * Phone-style signal bars (1 red -> 5 green) with the ping beside them. Small
 * and passive on purpose: it informs without competing with the lesson.
 * Hover (or tap) for packet loss, resolution, frame rate and bitrate.
 *
 * The details are a real element, not a `title` attribute. A native tooltip is
 * torn down and re-shown by the browser every time its text changes, and these
 * numbers change every second or two while the teacher is publishing — which
 * showed up as the tooltip flickering. An element that updates in place does
 * not.
 *
 * It is portalled to <body> and positioned from the trigger's rect: the top
 * bar is its own z-30 stacking context, so a popover left inside it could
 * never rise above the z-40 sidebars no matter what z-index it was given.
 */
export function NetworkIndicator({ health }: { health: NetworkHealth }): JSX.Element {
  const { level } = health;
  const activeColor = level ? LEVEL_COLORS[level] : undefined;
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const summary = level ? `Connection ${LEVEL_LABELS[level].toLowerCase()}` : 'Measuring connection';

  const reposition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const POPOVER_WIDTH = 208;
    const MARGIN = 8;
    setPosition({
      left: Math.min(Math.max(MARGIN, rect.left), window.innerWidth - POPOVER_WIDTH - MARGIN),
      top: rect.bottom + 12,
    });
  }, []);

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  return (
    <span
      ref={triggerRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      className="flex items-center gap-[0.4rem] pl-2 border-l border-border text-[0.78rem] text-text-dim tabular-nums outline-none"
      tabIndex={0}
      role="status"
      aria-label={health.pingMs !== null ? `${summary}, ping ${health.pingMs} milliseconds` : summary}
      data-testid="network-indicator"
      data-level={level ?? 'unknown'}
    >
      <span className="flex items-end gap-[2px] h-[17px]" aria-hidden="true">
        {BAR_HEIGHTS.map((height, index) => {
          const lit = level !== null && index < level;
          return (
            <span
              key={height}
              className="w-[3px] rounded-[1px] transition-colors duration-300"
              style={{ height, backgroundColor: lit ? activeColor : 'var(--color-border)' }}
            />
          );
        })}
      </span>
      <span className="min-w-[2.6rem] max-[720px]:hidden">{health.pingMs !== null ? `${health.pingMs} ms` : '— ms'}</span>

      {open &&
        position &&
        createPortal(
          <div
            style={{ left: position.left, top: position.top }}
            className="pointer-events-none fixed z-50 w-52 rounded-md border border-border bg-panel-bg-solid shadow-float py-2 px-3 text-[0.75rem] leading-5 text-text tabular-nums"
            aria-hidden="true"
            data-testid="network-indicator-details"
          >
            <div className={rowClass}>
              <span className="text-text-dim">Connection</span>
              <span className="font-semibold" style={{ color: activeColor }}>
                {level ? LEVEL_LABELS[level] : 'Measuring…'}
              </span>
            </div>
            <div className={rowClass}>
              <span className="text-text-dim">Ping</span>
              <span>{health.pingMs !== null ? `${health.pingMs} ms` : '—'}</span>
            </div>
            {health.lossPct !== null && (
              <div className={rowClass}>
                <span className="text-text-dim">Packet loss</span>
                <span>{health.lossPct.toFixed(1)}%</span>
              </div>
            )}
            {health.width !== null && health.height !== null && (
              <div className={rowClass}>
                <span className="text-text-dim">Video</span>
                <span>
                  {health.width}x{health.height}
                  {health.fps !== null ? ` @ ${Math.round(health.fps)} fps` : ''}
                </span>
              </div>
            )}
            {health.bitrateKbps !== null && (
              <div className={rowClass}>
                <span className="text-text-dim">Bitrate</span>
                <span>{health.bitrateKbps} kbps</span>
              </div>
            )}
          </div>,
          document.body
        )}
    </span>
  );
}
