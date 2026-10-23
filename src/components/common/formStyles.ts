// Mirrors host-app/src/components/common/formStyles.ts so the join forms in
// both apps share one visual design — kept as a separate copy (not an import
// across apps) since each app builds and ships independently.
/**
 * The visual language for every screen outside the classroom — the join and
 * create forms, plus the connecting and waiting states that share their page
 * ground.
 *
 * What was wrong before is worth recording, because it is what made the forms
 * look unfinished rather than merely plain. The card was `bg-accent-soft`, a
 * translucent blue, sitting on the blue page background: two blues a few
 * percent apart do not read as separate surfaces, so the card had no edge and
 * the page flattened into a single wash. The submit button then used the
 * SECONDARY style, so the one action on the screen looked exactly like the
 * input fields above it.
 *
 * The replacement is the classic arrangement rather than anything novel: a
 * tinted ground, one white card lifted off it by a hairline border and a
 * layered shadow, recessed fields inside that card, and a single saturated
 * accent spent only on the primary action. Depth comes from the surface stack
 * — ground, card, field — which is what makes a form read as a considered
 * product instead of a rectangle with inputs on it.
 */

/** Clean, flat page ground with no radial gradients — just the neutral bg. */
export const pageWrapClass =
  'min-h-full flex flex-col items-center justify-center px-4 py-10 bg-bg';

/** Constrains the card. */
export const pageColumnClass = 'w-full max-w-104';

/*
 * Brand lockup, above the card.
 */
export const brandLockupClass = 'flex items-center gap-3 mb-5 px-1';
export const brandMarkClass =
  'flex items-center justify-center w-10 h-10 rounded-md bg-accent text-white shrink-0';
export const brandTextWrapClass = 'flex flex-col leading-tight min-w-0';
export const brandNameClass = 'text-[1.05rem] font-semibold text-text';
export const brandRoleClass = 'text-[0.85rem] text-text-dim';

/*
 * The card.
 */
export const sectionClass = 'rounded-lg border border-border bg-surface shadow-card overflow-hidden';
export const cardHeaderClass = 'px-6 pt-6 pb-4 border-b border-border';
export const sectionHeadingClass = 'm-0 text-[1.2rem] font-semibold text-text';
export const sectionSubtitleClass = 'm-0 mt-1.5 text-[0.95rem] leading-relaxed text-text-dim';
/** Owns the rhythm between fields, so no field has to carry its own margin. */
export const cardBodyClass = 'px-6 py-5 flex flex-col gap-4';

/*
 * Fields.
 */
export const fieldLabelClass = 'flex flex-col gap-1.5';
export const fieldLabelTextClass = 'text-[0.9rem] font-medium text-text-dim';
export const fieldInputClass =
  'w-full h-12 px-4 text-[1rem] rounded-md border border-border bg-field text-text outline-none transition-[border-color,box-shadow,background] duration-150 ease-in-out placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:bg-surface focus:shadow-[0_0_0_3px_var(--color-accent-soft)] disabled:cursor-not-allowed disabled:text-text-faint disabled:bg-field';
/** Sits under a field to explain it before the teacher gets it wrong, rather than after. */
export const fieldHintClass = 'text-[0.85rem] leading-snug text-text-faint';

export const btnBaseClass =
  'w-full inline-flex items-center justify-center gap-2 h-12 px-5 rounded-md border text-[1rem] font-semibold transition-[background,border-color] duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer';
export const btnPrimaryClass = `${btnBaseClass} border-transparent bg-accent text-white hover:bg-accent-hover`;
export const btnSecondaryClass = `${btnBaseClass} border-border bg-surface text-text hover:border-border-strong hover:bg-panel-bg-soft`;
/** In-button activity, so a slow join looks like progress and not a dead click. */
export const btnSpinnerClass = 'w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin-slow shrink-0';

export const backLinkClass =
  'inline-flex items-center gap-1.5 mb-4 py-1.5 px-2.5 -ml-2.5 rounded-md bg-transparent border-none text-[0.95rem] font-medium text-text-dim cursor-pointer transition-colors hover:text-text hover:bg-panel-bg-soft';

export const pageFootnoteClass = 'mt-5 px-2 text-center text-[0.85rem] leading-relaxed text-text-faint';

/*
 * Status screens (connecting, waiting, ended) — same card, centred content.
 */
export const statusCardClass =
  'w-full max-w-100 rounded-lg border border-border bg-surface shadow-card px-8 py-10 flex flex-col items-center gap-4 text-center';
export const statusBadgeClass = 'flex items-center justify-center w-14 h-14 rounded-full bg-accent-soft text-accent';
export const statusTitleClass = 'm-0 text-[1.25rem] font-semibold text-text';
export const statusBodyClass = 'm-0 max-w-76 text-[1rem] leading-relaxed text-text-dim';
