'use client';

import { cn } from '@/lib/utils';

const STUDIO_LINES = [
  'Create Post, Product Posts, Videos, Occasion Posts, Campaigns, Carousel Posts — all available, run whenever you choose',
  'You decide what to make and when',
  'Pick your own date and time for every post',
  'Full Media Library, Connected Accounts & Analytics',
] as const;

const AI_QUOTA: { qty: string; label: string }[] = [
  { qty: '5', label: 'Campaigns (5 days each)' },
  { qty: '7', label: 'AI posts — research → content type → angle → generate' },
  { qty: '2', label: 'Carousels (5 slides each)' },
  { qty: '2', label: 'Repeat your best post' },
  { qty: '1', label: 'Try something new' },
  { qty: '2', label: 'Videos (20s)' },
  { qty: '—', label: "Occasion posts for that week's festivals and awareness days" },
];

/**
 * Studio vs. AI, in plain terms. Sits between the feature grid and the
 * pricing cards so a visitor understands the two operating models before
 * they see numbers on /product#pricing.
 */
export function PlanComparison() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <article className="flex flex-col rounded-2xl border border-border/50 bg-card p-6 transition-[background-color,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-primary-blue/35 hover:bg-card/80 sm:p-7">
        <h3 className="text-lg font-extrabold text-foreground">Studio</h3>
        <p className="mt-1.5 font-(--font-dm-sans) text-sm text-muted-foreground">
          Every creative tool, on your schedule.
        </p>
        <ul className="mt-5 flex flex-1 flex-col gap-3">
          {STUDIO_LINES.map((line) => (
            <li key={line} className="flex gap-2.5 text-sm leading-snug text-muted-foreground">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-blue" />
              <span className="font-(--font-dm-sans)">{line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 border-t border-border/50 pt-4 font-(--font-dm-sans) text-xs text-muted-foreground">
          Best for teams who want the tools without handing over the calendar.
        </p>
      </article>

      <article
        className={cn(
          'flex flex-col rounded-2xl border p-6 transition-[background-color,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:p-7',
          'border-primary-purple/40 bg-linear-to-b from-primary-purple/[0.08] to-transparent bg-card',
          'hover:border-primary-purple/60'
        )}
      >
        <h3 className="text-lg font-extrabold text-foreground">AI</h3>
        <p className="mt-1.5 font-(--font-dm-sans) text-sm text-muted-foreground">
          Everything in Studio, plus a calendar that runs itself.
        </p>
        <table className="mt-5 w-full text-sm">
          <tbody>
            {AI_QUOTA.map((row) => (
              <tr key={row.label} className="border-t border-border/40 first:border-t-0">
                <td className="w-12 py-2 pr-3 text-right align-top font-(--font-dm-sans) font-bold tabular-nums text-foreground">
                  {row.qty}
                </td>
                <td className="py-2 align-top font-(--font-dm-sans) text-muted-foreground">
                  {row.label}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-5 border-t border-border/50 pt-4 font-(--font-dm-sans) text-xs text-muted-foreground">
          Every post is generated 2 days before it publishes, at your
          platform&apos;s best time. Choose Manual Review or Auto Approve for
          how it gets cleared.
        </p>
        <a
          href="#pricing"
          className="group/link mt-3 inline-flex items-center gap-1 font-(--font-dm-sans) text-xs font-semibold text-primary-purple transition-colors duration-200 hover:text-primary-purple-dark"
        >
          <span className="underline decoration-primary-purple/30 underline-offset-4 transition-colors duration-200 group-hover/link:decoration-primary-purple/70">
            Monthly allotment shown above · see exact pricing below
          </span>
          <span className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/link:translate-y-0.5">↓</span>
        </a>
      </article>
    </div>
  );
}
