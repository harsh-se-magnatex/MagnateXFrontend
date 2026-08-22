'use client';

import { cn } from '@/lib/utils';

type GradeRow = {
  label: string;
  grade: string;
  tone: 'good' | 'mid' | 'bad';
  note: string;
};

const GRADE_ROWS: GradeRow[] = [
  { label: 'Posting consistency', grade: 'D', tone: 'mid', note: 'Only two posts in three weeks' },
  { label: 'Reach', grade: 'F', tone: 'bad', note: '18 total reach' },
  { label: 'Content variety', grade: 'C', tone: 'good', note: 'Two formats used so far' },
];

const TONE_CLASS: Record<GradeRow['tone'], string> = {
  good: 'bg-emerald-500/15 text-emerald-400',
  mid: 'bg-amber-500/15 text-amber-400',
  bad: 'bg-rose-500/15 text-rose-400',
};

/**
 * A small illustrative preview of the Analytics grading report, so
 * "Analytics" stops being the one feature nobody can picture from a
 * one-line bullet. Numbers are deliberately un-flattering placeholders,
 * not a real account's data.
 */
export function AnalyticsReportTeaser() {
  return (
    <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-border/60 bg-card/60 p-5 transition-[background-color,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-primary-purple/30 hover:bg-card/80 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gradient-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Example
          </span>
          <h4 className="text-sm font-bold text-foreground">
            Not your real data
          </h4>
        </div>
        <span className="font-(--font-dm-sans) text-xs text-muted-foreground">
          3-week window
        </span>
      </div>

      <div className="mt-4 divide-y divide-border/40 border-t border-border/40">
        {GRADE_ROWS.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2.5 text-sm"
          >
            <span className="font-(--font-dm-sans) text-muted-foreground">{row.label}</span>
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-extrabold',
                TONE_CLASS[row.tone]
              )}
            >
              {row.grade}
            </span>
            <span className="text-right font-(--font-dm-sans) text-xs text-muted-foreground/80">
              {row.note}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div className="rounded-xl border border-border/50 bg-background/40 p-3 transition-colors duration-300 hover:border-primary-purple/30 hover:bg-background/60">
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary-purple">
            Recreate the winner
          </p>
          <p className="mt-1.5 font-(--font-dm-sans) text-xs leading-relaxed text-muted-foreground">
            Your best-performing post, reframed and run again.
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-background/40 p-3 transition-colors duration-300 hover:border-primary-purple/30 hover:bg-background/60">
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary-purple">
            Plug a content gap
          </p>
          <p className="mt-1.5 font-(--font-dm-sans) text-xs leading-relaxed text-muted-foreground">
            A format or angle you haven&apos;t tried yet.
          </p>
        </div>
      </div>
    </div>
  );
}
