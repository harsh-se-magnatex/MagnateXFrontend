'use client';

import { cn } from '@/lib/utils';

type GradeRow = {
  label: string;
  grade: string;
  tone: 'good' | 'mid' | 'bad';
  note: string;
};

const GRADE_ROWS: GradeRow[] = [
  {
    label: 'Posting consistency',
    grade: 'D',
    tone: 'mid',
    note: 'Only two posts in three weeks',
  },
  { label: 'Reach', grade: 'F', tone: 'bad', note: '18 total reach' },
  {
    label: 'Content variety',
    grade: 'C',
    tone: 'good',
    note: 'Two formats used so far',
  },
];

const TONE_CLASS: Record<GradeRow['tone'], string> = {
  good: 'bg-success text-success',
  mid: 'bg-warning text-warning',
  bad: 'bg-danger text-danger',
};

/**
 * A small illustrative preview of the Analytics grading report, so
 * "Analytics" stops being the one feature nobody can picture from a
 * one-line bullet. Numbers are deliberately un-flattering placeholders,
 * not a real account's data.
 */
export function AnalyticsReportTeaser() {
  return (
    <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-default bg-default p-5 transition-[background-color,border-color] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:border-strong hover:bg-default sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gradient-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Example
          </span>
          <h4 className="text-sm font-bold text-default">Not your real data</h4>
        </div>
        <span className="font-(--font-dm-sans) text-xs text-secondary">
          3-week window
        </span>
      </div>

      <div className="mt-4 divide-y divide-border/40 border-t border-default">
        {GRADE_ROWS.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2.5 text-sm"
          >
            <span className="font-(--font-dm-sans) text-secondary">
              {row.label}
            </span>
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-extrabold',
                TONE_CLASS[row.tone]
              )}
            >
              {row.grade}
            </span>
            <span className="text-right font-(--font-dm-sans) text-xs text-secondary/80">
              {row.note}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div className="rounded-xl border border-default bg-background/40 p-3 transition-expo hover:border-strong hover:bg-background/60">
          <p className="text-[11px] font-bold uppercase tracking-wide text-preview">
            Recreate the winner
          </p>
          <p className="mt-1.5 font-(--font-dm-sans) text-xs leading-relaxed text-secondary">
            Your best-performing post, reframed and run again.
          </p>
        </div>
        <div className="rounded-xl border border-default bg-background/40 p-3 transition-expo hover:border-strong hover:bg-background/60">
          <p className="text-[11px] font-bold uppercase tracking-wide text-preview">
            Plug a content gap
          </p>
          <p className="mt-1.5 font-(--font-dm-sans) text-xs leading-relaxed text-secondary">
            A format or angle you haven&apos;t tried yet.
          </p>
        </div>
      </div>
    </div>
  );
}
