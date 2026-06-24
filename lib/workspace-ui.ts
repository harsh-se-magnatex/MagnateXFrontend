/** Shared semantic styles for authorized workspace pages (dark theme). */

export const workspaceInputClass =
  'w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all';

export const workspaceInputClassSm =
  'w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm';

export const workspacePageTitleClass =
  'text-3xl font-bold tracking-tight text-foreground leading-tight';

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

export const workspaceSectionCardClass =
  'glass-card rounded-3xl border border-border p-6 sm:p-8';

export const workspacePanelClass =
  'glass-card rounded-2xl border border-border';

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

export const workspaceIconBadgeClass =
  'p-2 rounded-lg bg-primary/10 text-primary';
