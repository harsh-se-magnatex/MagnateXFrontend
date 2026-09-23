'use client';

import { useState } from 'react';
import { ExternalLink, Eye, Images } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type {
  BudgetPlanResponse,
  BudgetPlanWeekView,
} from '@/src/service/api/analyticService';

const money = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const shortDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
const range = (from: string, to: string) =>
  `${shortDate(from)}–${shortDate(to)}`;
const publishedDate = (date: string) =>
  new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

type WeekPost = BudgetPlanWeekView['posts'][number];

function PostPreview({ post }: { post: WeekPost }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const recommendation = post.recommendation;
  const isVideo = post.format === 'video' || post.format === 'reel';
  const previewUrl = isVideo ? post.videoUrl || post.mediaUrl : post.mediaUrl;

  return (
    <article className="rounded-xl border border-default bg-default p-3">
      <div className="flex gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-element text-[10px] uppercase text-secondary">
          {previewUrl && !failed ? (
            isVideo ? (
              <video
                src={previewUrl}
                poster={post.mediaUrl}
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
                onError={() => setFailed(true)}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.mediaUrl}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setFailed(true)}
              />
            )
          ) : (
            post.format
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-secondary">
              Posted {publishedDate(post.publishedAt)}
            </span>
            {recommendation?.kind === 'super' ? (
              <Badge variant="outline">Super boost</Badge>
            ) : recommendation?.kind === 'last-week' ? (
              <Badge variant="outline">Reserve boost</Badge>
            ) : recommendation ? (
              <Badge variant="outline">Weekly boost</Badge>
            ) : null}
          </div>

          <p className="line-clamp-3 text-sm text-default">{post.caption}</p>

          {recommendation ? (
            <div className="space-y-1">
              <p className="font-semibold text-default">
                Suggested boost: {money(recommendation.amount)}
              </p>
              <p className="text-xs text-secondary">
                {money(recommendation.dailyAmount)}/day for{' '}
                {recommendation.days} days
              </p>
              {recommendation.reserveAmount > 0 ? (
                <p className="text-xs text-secondary">
                  {money(recommendation.weeklyAmount)} from this week +{' '}
                  {money(recommendation.reserveAmount)} from the super-post
                  reserve
                </p>
              ) : null}
              <p className="text-xs text-secondary">
                {recommendation.rationale}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="font-semibold text-default">
                Suggested boost: ₹0 for now
              </p>
              <p className="text-xs text-secondary">
                The post stays visible here and can be reviewed again after more
                performance data arrives.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!previewUrl || failed}
              onClick={() => setOpen((value) => !value)}
            >
              <Eye className="size-4" />
              {open ? 'Hide preview' : 'Preview'}
            </Button>
            {post.permalinkUrl ? (
              <Button size="sm" variant="outline" asChild>
                <a
                  href={post.permalinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-4" />
                  Open social post
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {open && previewUrl && !failed ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-default bg-element">
          {isVideo ? (
            <video
              src={previewUrl}
              poster={post.mediaUrl}
              controls
              playsInline
              className="max-h-96 w-full object-contain"
              onError={() => setFailed(true)}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.mediaUrl}
              alt="Post preview"
              className="max-h-96 w-full object-contain"
              onError={() => setFailed(true)}
            />
          )}
        </div>
      ) : null}

      {failed ? (
        <p className="mt-2 text-xs text-secondary">
          The saved media preview is no longer available. Use “Open social post”
          to view the current post on the platform.
        </p>
      ) : null}
    </article>
  );
}

function WeekDialog({ week }: { week: BudgetPlanWeekView }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`rounded-xl border p-3 text-left transition duration-150 hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success ${week.status === 'this-week' ? 'border-success bg-success' : 'border-default bg-element'}`}
        >
          <p className="text-xs font-semibold text-default">
            Week {week.index} · {range(week.from, week.to)}
          </p>
          <p className="mt-1 text-xs text-secondary">
            {week.posts.length} published ·{' '}
            {week.plannedPostsEstimated ? '~' : ''}
            {week.plannedPosts} planned
          </p>
          <p className="mt-1 text-xs text-default">
            Weekly box {money(week.boxAmount)}
          </p>
          <p className="text-xs text-secondary">
            {money(week.suggested)} suggested · {money(week.moneyLeft)} left
          </p>
          {week.rolledIn > 0 ? (
            <p className="text-xs text-success">
              +{money(week.rolledIn)} rolled in
            </p>
          ) : null}
          {week.reserveSuggested > 0 ? (
            <p className="text-xs text-success">
              +{money(week.reserveSuggested)} super boost
            </p>
          ) : null}
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-success">
            <Images className="size-3.5" /> View posts
          </p>
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Week {week.index} · {range(week.from, week.to)}
          </DialogTitle>
          <DialogDescription>
            {week.rolledIn > 0
              ? `${money(week.rolledIn)} of unused money from completed weeks is available here. Suggestions are rebuilt when analytics refreshes, so an older post can still receive money later.`
              : week.status === 'done'
                ? 'Unused money from this completed week is now available in the current week. Its posts remain eligible when suggestions refresh.'
                : `${money(week.moneyLeft)} is currently available for boost suggestions.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-element p-3">
            <p className="text-xs text-secondary">Weekly budget</p>
            <p className="font-semibold text-default">
              {money(week.boxAmount)}
            </p>
            {week.rolledIn > 0 ? (
              <p className="text-xs text-success">
                + {money(week.rolledIn)} rollover
              </p>
            ) : null}
          </div>
          <div className="rounded-xl bg-element p-3">
            <p className="text-xs text-secondary">Weekly suggestions</p>
            <p className="font-semibold text-default">
              {money(week.suggested)}
            </p>
          </div>
          <div className="rounded-xl bg-element p-3">
            <p className="text-xs text-secondary">Super-post money</p>
            <p className="font-semibold text-default">
              {money(week.reserveSuggested)}
            </p>
          </div>
        </div>

        {week.posts.length ? (
          <div className="space-y-2">
            {week.posts.map((post) => (
              <PostPreview key={post.postId} post={post} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-default bg-element p-4 text-sm text-secondary">
            No posts were published during this week.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function MonthlyBudgetCard({
  data,
  save,
}: {
  data: BudgetPlanResponse;
  save: (amount: number) => Promise<void>;
}) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const amount = Number(value);
  const valid =
    Number.isInteger(amount) &&
    amount >= data.minBudget &&
    amount <= data.maxBudget;

  if (!data.plan)
    return (
      <section className="rounded-xl border border-default bg-default p-4 space-y-3">
        <h2 className="text-section text-default">
          Ad budget · {data.monthLabel}
        </h2>
        <p className="text-sm text-secondary">
          Set one advertising budget for this plan period. The budget, weekly
          boxes, and post suggestions all use the same dates.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-1">
            <span className="text-xs text-secondary">Plan budget (INR)</span>
            <Input
              type="number"
              min={data.minBudget}
              max={data.maxBudget}
              step={50}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={!valid || saving}>Set budget</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Lock {money(amount)} for this plan period?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  The allocation will cover {data.monthLabel} and cannot be
                  changed during this period.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await save(amount);
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    );

  const plan = data.plan;
  const pots = [
    {
      label: 'Always-on',
      amount: plan.split.alwaysOnAmount,
      note: `${money(plan.split.alwaysOnDaily)}/day`,
    },
    { label: 'Weekly boosts', amount: plan.split.weeklyPoolAmount, note: '' },
    {
      label: 'Super-post reserve',
      amount: plan.split.reserveAmount,
      note: `${money(plan.split.reserveLeft)} left`,
    },
  ];

  return (
    <section className="rounded-xl border border-default bg-default p-4 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-section text-default">
            Ad budget · {range(plan.startDate, plan.expiresAt)}
          </h2>
          <p className="text-lg font-semibold text-default">
            {money(plan.monthlyBudget)}
          </p>
        </div>
        <Badge variant="outline">Plan-period budget</Badge>
      </header>

      <div className="space-y-2">
        <div className="flex h-3 overflow-hidden rounded-xl bg-element">
          {pots.map((pot) => (
            <div
              key={pot.label}
              className="bg-success border-r border-default last:border-r-0"
              style={{
                width: `${(pot.amount / plan.monthlyBudget) * 100}%`,
                opacity:
                  pot.label === 'Always-on'
                    ? 0.55
                    : pot.label === 'Weekly boosts'
                      ? 0.8
                      : 1,
              }}
            />
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {pots.map((pot) => (
            <div key={pot.label} className="text-xs">
              <span className="font-medium text-default">
                {pot.label} {money(pot.amount)}
              </span>
              {pot.note ? (
                <span className="block text-secondary">{pot.note}</span>
              ) : null}
            </div>
          ))}
        </div>
        <p className="text-xs text-secondary">{plan.split.explanation}</p>
      </div>

      <div>
        <p className="mb-2 text-xs text-secondary">
          Select a week to review every published post and its boost amount.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {plan.weeks.map((week) => (
            <WeekDialog key={week.index} week={week} />
          ))}
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <p className="font-semibold text-default">
          Left for the plan: {money(plan.leftForMonth)}
        </p>
        <p className="text-secondary">
          Unused money from completed weeks rolls into the current week. Every
          analytics refresh rebuilds suggestions across all posts in the plan,
          including posts from earlier weeks.
        </p>
        <p className="text-secondary">
          Run the follower campaign at {money(plan.split.alwaysOnDaily)}/day
          across {range(plan.startDate, plan.expiresAt)}.
        </p>
      </div>
    </section>
  );
}
