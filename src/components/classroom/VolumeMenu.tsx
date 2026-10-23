import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiVolume, FiVolume1, FiVolume2, FiVolumeX } from 'react-icons/fi';
import { useAudioControl } from '../../lib/audioControl.js';
import { controlBtnAlert, controlBtnDefault, controlBtnOn } from './controlStyles.js';

/**
 * The student's volume control — the only media control they get, and the
 * honest answer to "I can't hear the class".
 *
 * It also doubles as the escape hatch from a browser autoplay block. A muted
 * element is always allowed to play, so toggling mute is a reliable way to get
 * a refused element running again; opening this menu retries playback too.
 * That is why the trigger turns amber when sound is blocked — it points the
 * student at the control that fixes it, instead of a banner that just says
 * "tap somewhere".
 */
export function VolumeMenu(): JSX.Element {
  const { volume, muted, blocked, setVolume, toggleMuted, retry } = useAudioControl();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; bottom: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // The toolbar is `overflow-x-auto`, which per spec makes the block axis a
  // scroll container too — a popover rendered inside it would be clipped by
  // the toolbar's own bounds. Portal it to <body> and position from the
  // trigger's viewport rect. Same approach as host-app's QualityMenu.
  const reposition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const MENU_WIDTH = 232;
    const MARGIN = 8;
    const left = Math.min(
      Math.max(MARGIN, rect.left + rect.width / 2 - MENU_WIDTH / 2),
      window.innerWidth - MENU_WIDTH - MARGIN
    );
    setPosition({ left, bottom: window.innerHeight - rect.top + 10 });
  }, []);

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent): void => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', reposition);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', reposition);
    };
  }, [open, reposition]);

  const Icon = muted || volume === 0 ? FiVolumeX : volume < 0.34 ? FiVolume : volume < 0.67 ? FiVolume1 : FiVolume2;

  const triggerClass = blocked ? controlBtnAlert : open ? controlBtnOn : controlBtnDefault;
  const percent = Math.round(volume * 100);

  return (
    <>
      <button
        ref={triggerRef}
        className={triggerClass}
        onClick={() => {
          // Opening is a user gesture, which is exactly what a blocked
          // element needs, so spend it rather than waiting for the student to
          // find the right control.
          if (blocked) retry();
          setOpen((v) => !v);
        }}
        title={blocked ? 'Sound is blocked — tap to turn it on' : 'Class volume'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Class volume"
        data-testid="volume-menu"
      >
        <Icon size={19} />
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            role="dialog"
            aria-label="Class volume"
            className="fixed z-50 w-58 p-3 rounded-md bg-panel-bg-solid border border-border shadow-panel"
            style={{ left: position.left, bottom: position.bottom }}
            data-testid="volume-menu-panel"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[0.78rem] font-semibold text-text">Class volume</span>
              <span className="text-[0.72rem] text-text-dim tabular-nums">{muted ? 'Muted' : `${percent}%`}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  toggleMuted();
                  // Unmuting a refused element is the fix; muting one that is
                  // playing needs no retry, and retry() is harmless either way.
                  retry();
                }}
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center border border-border bg-panel-bg-soft text-text cursor-pointer transition-colors hover:bg-accent-soft"
                title={muted ? 'Unmute class audio' : 'Mute class audio'}
                aria-pressed={muted}
                data-testid="toggle-mute"
              >
                {muted ? <FiVolumeX size={16} /> : <FiVolume2 size={16} />}
              </button>

              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={muted ? 0 : percent}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
                className="flex-1 accent-accent cursor-pointer"
                aria-label="Volume"
                data-testid="volume-slider"
              />
            </div>

            {blocked && (
              <button
                onClick={() => retry()}
                className="mt-3 w-full py-[0.45rem] rounded-pill bg-accent text-white text-[0.8rem] font-semibold border-none cursor-pointer hover:bg-accent-hover"
                data-testid="enable-sound"
              >
                Turn on sound
              </button>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
