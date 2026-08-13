// Mirrors host-app/src/components/formStyles.ts so the join forms in both
// apps share one visual design — kept as a separate copy (not an import
// across apps) since each app builds and ships independently.
export const pageWrapClass =
  'min-h-full flex items-center justify-center px-4 py-8 bg-[radial-gradient(circle_at_20%_15%,rgba(124,92,255,0.16),transparent_45%),radial-gradient(circle_at_85%_80%,rgba(124,92,255,0.1),transparent_40%),var(--color-bg)]';
export const fieldLabelClass = 'flex flex-col gap-[0.35rem] mb-[0.9rem] text-[0.85rem] text-text-dim';
export const fieldInputClass =
  'py-[0.65rem] px-[0.8rem] text-[0.95rem] border border-border rounded-sm bg-panel-bg-soft text-text outline-none transition-[border-color,background] duration-150 ease-in-out focus:border-accent focus:bg-[rgba(124,92,255,0.08)] placeholder:text-text-faint disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-white/[0.03]';
export const sectionClass = 'bg-accent-soft rounded-lg shadow shadow-accent-hover p-6';
export const sectionHeadingClass = 'm-0 mb-[0.9rem] text-[0.95rem] font-semibold text-text flex items-center gap-2';
export const btnBaseClass =
  'w-full inline-flex items-center justify-center gap-[0.45rem] py-[0.65rem] px-[1.1rem] rounded-pill border text-[0.9rem] font-semibold transition-[background,transform,opacity,border-color] duration-150 ease-in-out active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer';
export const btnPrimaryClass = `${btnBaseClass} border-transparent bg-accent text-white hover:bg-accent-hover`;
export const btnSecondaryClass = `${btnBaseClass} border-border bg-panel-bg-soft text-text hover:border-border-strong hover:bg-white/7`;
export const backLinkClass = 'inline-block mb-4 text-[0.85rem] text-text-dim hover:text-text cursor-pointer bg-transparent border-none p-0';
