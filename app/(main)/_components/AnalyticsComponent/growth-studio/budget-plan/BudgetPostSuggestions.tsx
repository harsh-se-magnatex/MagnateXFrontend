'use client';

import { Badge } from '@/components/ui/badge';
import type {
  BudgetPickView,
  BudgetPlanResponse,
} from '@/src/service/api/analyticService';
const money = (n: number) => `₹${n.toLocaleString('en-IN')}`;
function PickRow({ pick }: { pick: BudgetPickView }) {
  return (
    <li className="rounded-xl border border-default bg-default p-3">
      <div className="flex gap-3">
        {pick.mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pick.mediaUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-element text-[10px] uppercase text-secondary">
            {pick.format}
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm text-default">
              {money(pick.amount)}
            </strong>
            <span className="text-xs text-secondary">
              · {money(pick.dailyAmount)}/day × {pick.days} days
            </span>
            {pick.kind !== 'good' ? (
              <Badge variant="outline">
                {pick.kind === 'super' ? 'Super post' : 'Last-week reserve'}
              </Badge>
            ) : null}
          </div>
          <p className="line-clamp-2 text-xs text-secondary">{pick.caption}</p>
          {pick.reserveAmount > 0 ? (
            <p className="text-xs text-secondary">
              {money(pick.weeklyAmount)} from week {pick.weekIndex} +{' '}
              {money(pick.reserveAmount)} from reserve
            </p>
          ) : null}
          <p className="text-xs text-default">
            {pick.ratioAtPick}× your usual engagement · Expected reach{' '}
            {pick.expectedReach.low.toLocaleString('en-IN')}–
            {pick.expectedReach.high.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-secondary">{pick.rationale}</p>
          <div className="flex justify-between gap-2 text-[11px] text-secondary">
            <span>Suggested {pick.suggestedDate}</span>
            {pick.permalinkUrl ? (
              <a
                className="text-success hover:underline"
                href={pick.permalinkUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View post
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}
export function BudgetPostSuggestions({ data }: { data: BudgetPlanResponse }) {
  if (!data.plan) return null;
  const plan = data.plan;
  const fresh = plan.picks.filter((p) => p.isNewToday);
  const earlier = plan.picks.filter((p) => !p.isNewToday);
  const relative = plan.lastRefreshAt
    ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
        Math.round(
          (new Date(plan.lastRefreshAt).getTime() - Date.now()) / 60000
        ),
        'minute'
      )
    : 'not yet';
  return (
    <section className="rounded-xl border border-default bg-default p-4 space-y-3">
      <header>
        <h2 className="text-section text-default">Where to put your money</h2>
        <p className="text-xs text-secondary">
          Updated {relative}. We check your published posts every day.
        </p>
      </header>
      {plan.nowAction ? (
        <div
          className={`rounded-xl border p-3 text-sm ${plan.nowAction.kind === 'boost' ? 'border-success bg-success text-default' : plan.nowAction.kind === 'waiting-data' ? 'border-warning bg-warning text-warning' : 'border-default bg-element text-default'}`}
        >
          {plan.nowAction.message}
        </div>
      ) : null}
      {!plan.picks.length ? (
        <p className="text-sm text-secondary">
          No post has earned money yet this month. We&apos;ll suggest one as
          soon as a post does clearly better than usual.
        </p>
      ) : null}
      {fresh.length ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-default">New today</h3>
          <ul className="space-y-2">
            {fresh.map((pick) => (
              <PickRow key={`${pick.postId}-${pick.suggestedAt}`} pick={pick} />
            ))}
          </ul>
        </div>
      ) : null}
      {earlier.length ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-default">
            Earlier this month
          </h3>
          <ul className="space-y-2">
            {earlier.map((pick) => (
              <PickRow key={`${pick.postId}-${pick.suggestedAt}`} pick={pick} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
