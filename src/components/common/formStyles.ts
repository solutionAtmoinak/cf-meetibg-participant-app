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

/**
 * Two off-centre washes rather than one centred glow: an even vignette reads
 * as a gradient someone applied, whereas light falling from off-frame reads
 * as depth.
 */
export const pageWrapClass =
  'min-h-full flex flex-col items-center justify-center px-4 py-10 bg-[radial-gradient(circle_at_50%_-10%,rgba(37,99,235,0.15),transparent_55%),radial-gradient(circle_at_8%_105%,rgba(37,99,235,0.09),transparent_45%),var(--color-bg)]';

/** Constrains the card. Narrower than the old 30rem — a four-field form at full width reads as a spreadsheet. */
export const pageColumnClass = 'w-full max-w-104';

/*
 * Brand lockup, above the card.
 *
 * The page had no identity at all: it opened on an unlabelled box, so nothing
 * told a teacher which product they were in or which side of it. A mark plus
 * a role line costs one row and answers both.
 */
export const brandLockupClass = 'flex items-center gap-3 mb-5 px-1';
export const brandMarkClass =
  'flex items-center justify-center w-10 h-10 rounded-md bg-accent text-white shadow-[0_8px_18px_-6px_rgba(37,99,235,0.75)] shrink-0';
export const brandTextWrapClass = 'flex flex-col leading-tight min-w-0';
export const brandNameClass = 'text-[0.98rem] font-semibold tracking-[-0.01em] text-text';
export const brandRoleClass = 'text-[0.75rem] text-text-dim';

/*
 * The card. `overflow-hidden` so the header rule meets the rounded corners
 * cleanly instead of running past them.
 */
export const sectionClass = 'rounded-lg border border-border bg-surface shadow-card overflow-hidden';
export const cardHeaderClass = 'px-6 pt-6 pb-4 border-b border-border';
export const sectionHeadingClass = 'm-0 text-[1.05rem] font-semibold tracking-[-0.01em] text-text';
export const sectionSubtitleClass = 'm-0 mt-1 text-[0.82rem] leading-relaxed text-text-dim';
/** Owns the rhythm between fields, so no field has to carry its own margin. */
export const cardBodyClass = 'px-6 py-5 flex flex-col gap-4';

/*
 * Fields.
 *
 * Recessed (bg-field) against the white card, then inverting to white on
 * focus, so the active field is the brightest thing on the page. The focus
 * ring is a real ring rather than a border-colour swap: a 1px colour change
 * is close to invisible, and keyboard users get nothing from it.
 */
export const fieldLabelClass = 'flex flex-col gap-[0.4rem]';
export const fieldLabelTextClass = 'text-[0.78rem] font-medium tracking-[0.01em] text-text-dim';
export const fieldInputClass =
  'w-full h-11 px-3.5 text-[0.92rem] rounded-sm border border-border bg-field text-text outline-none transition-[border-color,box-shadow,background] duration-150 ease-in-out placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:bg-surface focus:shadow-[0_0_0_3px_var(--color-accent-soft)] disabled:cursor-not-allowed disabled:text-text-dim disabled:bg-[rgba(15,23,42,0.05)]';
/** Sits under a field to explain it before the teacher gets it wrong, rather than after. */
export const fieldHintClass = 'text-[0.72rem] leading-snug text-text-faint';

export const btnBaseClass =
  'w-full inline-flex items-center justify-center gap-2 h-11 px-5 rounded-pill border text-[0.9rem] font-semibold tracking-[0.01em] transition-[background,transform,box-shadow,border-color] duration-150 ease-in-out active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer';
/** Carries a coloured shadow, so the primary action looks lit rather than filled. */
export const btnPrimaryClass = `${btnBaseClass} border-transparent bg-accent text-white shadow-[0_10px_22px_-10px_rgba(37,99,235,0.95)] hover:bg-accent-hover hover:shadow-[0_12px_26px_-10px_rgba(37,99,235,1)]`;
export const btnSecondaryClass = `${btnBaseClass} border-border bg-surface text-text hover:border-border-strong hover:bg-accent-soft`;
/** In-button activity, so a slow join looks like progress and not a dead click. */
export const btnSpinnerClass = 'w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin-slow shrink-0';

export const backLinkClass =
  'inline-flex items-center gap-1.5 mb-4 py-1.5 px-2.5 -ml-2.5 rounded-pill bg-transparent border-none text-[0.82rem] font-medium text-text-dim cursor-pointer transition-colors hover:text-text hover:bg-accent-soft';

export const pageFootnoteClass = 'mt-5 px-2 text-center text-[0.75rem] leading-relaxed text-text-faint';

/*
 * Status screens (connecting, waiting, ended) — same card, centred content.
 * Shared so the moment between "join" and "in the room" belongs to the same
 * product as the form that preceded it.
 */
export const statusCardClass =
  'w-full max-w-100 rounded-lg border border-border bg-surface shadow-card px-8 py-10 flex flex-col items-center gap-4 text-center';
export const statusBadgeClass = 'flex items-center justify-center w-14 h-14 rounded-full bg-accent-soft text-accent';
export const statusTitleClass = 'm-0 text-[1.1rem] font-semibold tracking-[-0.01em] text-text';
export const statusBodyClass = 'm-0 max-w-76 text-[0.87rem] leading-relaxed text-text-dim';
