// Shared so every control in the student toolbar — including popover triggers
// like VolumeMenu, which live in their own file — stays visually identical.
// Mirrors host-app/src/components/classroom/controlStyles.ts.
export const controlBtnBase =
  'relative flex items-center justify-center rounded-full border cursor-pointer shrink-0 transition-[background,transform,border-color] duration-150 ease-in-out active:scale-[0.95] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none w-[46px] h-[46px] max-[720px]:w-[42px] max-[720px]:h-[42px]';

export const controlBtnDefault = `${controlBtnBase} border-border bg-panel-bg-soft text-text hover:border-border-strong hover:bg-accent-soft`;
export const controlBtnOn = `${controlBtnBase} border-accent bg-accent text-white hover:bg-accent-hover`;
export const controlBtnDanger = `${controlBtnBase} border-danger bg-danger text-white hover:bg-danger-hover`;
/** Sound is being refused by the browser — needs the student's attention. */
export const controlBtnAlert = `${controlBtnBase} border-warning bg-warning text-white hover:brightness-110`;

export const controlDividerClass = 'w-px self-stretch my-1 mx-[0.15rem] bg-border shrink-0';
export const countBadgeAlertClass =
  'absolute -top-[3px] -right-[3px] min-w-[17px] h-[17px] px-[3px] rounded-pill bg-danger border border-danger text-white text-[0.62rem] font-bold flex items-center justify-center';
