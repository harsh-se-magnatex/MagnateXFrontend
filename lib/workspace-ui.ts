/** Shared semantic styles for authorized workspace pages (dark theme). */

/** Shared easing for workspace motion — matches the CSS primitives in globals.css. */
const EASE = 'duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]';

export const workspaceInputClass =
  `w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground hover:border-primary-purple/35 focus:border-primary-purple focus:outline-none focus:ring-4 focus:ring-primary-purple/20 focus:bg-muted/70 transition-all ${EASE}`;

export const workspaceInputClassSm =
  `w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-foreground placeholder:text-muted-foreground shadow-sm hover:border-primary-purple/35 focus:border-primary-purple focus:outline-none focus:ring-4 focus:ring-primary-purple/20 focus:bg-muted/70 transition-all ${EASE}`;

export const workspacePageTitleClass =
  'font-[family-name:var(--font-display)] text-4xl font-normal tracking-tight text-foreground leading-tight';

export const workspacePageDescriptionClass =
  'mt-2 text-base text-muted-foreground max-w-2xl';

export const workspacePageDescriptionSmClass =
  'mt-2 text-sm text-muted-foreground';

export const workspaceSectionTitleClass =
  'text-lg font-semibold text-foreground';

export const workspaceSectionTitleLgClass =
  'text-xl font-semibold text-foreground';

export const workspaceSectionLabelClass =
  'mb-1.5 block text-sm font-semibold text-foreground';

export const workspaceMutedLabelClass =
  'text-xs font-semibold uppercase tracking-widest text-muted-foreground';

export const workspaceModalClass =
  'rounded-2xl border border-border bg-card text-foreground shadow-xl';

/** `group` is what lets the icon badge inside animate off the card's hover. */
export const workspaceSectionCardClass =
  'group glass-card rounded-3xl border border-border p-6 sm:p-8';

export const workspacePanelClass =
  'group glass-card rounded-2xl border border-border';

export const workspaceTabListClass =
  'flex gap-1 p-1 rounded-2xl bg-muted border border-border';

export const workspaceTabActiveClass =
  'bg-card text-foreground shadow-sm ring-1 ring-border';

export const workspaceTabInactiveClass =
  'text-muted-foreground hover:text-foreground';

export const workspaceTableRowHoverClass = 'hover:bg-accent/40';

export const workspaceOutlineButtonClass =
  'rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent transition-all shadow-sm active:scale-95';


export const workspacePrimaryButtonClass =
  'w-full rounded-xl bg-gradient-action px-4 py-3 text-sm font-semibold text-white transition-all shadow-md shadow-primary-purple/30 hover:brightness-105 active:scale-95 disabled:opacity-50 disabled:hover:brightness-100';

/** Alias for primary CTAs (Generate, Create, Save, etc.) */
export const workspaceActionButtonClass = workspacePrimaryButtonClass;

/**
 * Icon badge. Sits inside section headers, so it animates off the *card's*
 * hover (`group-hover`) rather than its own — the badge is a 36px target
 * and hovering it exactly is not something anyone does deliberately.
 * Requires `group` on the containing card, which the section headers using
 * this already have.
 */
export const workspaceIconBadgeClass =
  `p-2 rounded-lg bg-gradient-to-br from-primary-purple/25 to-primary-blue/15 text-primary ring-1 ring-primary-purple/25 shadow-sm shadow-primary-purple/20 transition-all ${EASE} group-hover:scale-105 group-hover:-rotate-3 group-hover:ring-primary-purple/50 group-hover:shadow-md group-hover:shadow-primary-purple/30`;
