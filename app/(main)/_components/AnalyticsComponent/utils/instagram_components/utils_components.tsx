import { ComponentType, type ReactNode } from 'react';
import { InstagramPost } from '../../../types';
import { ExternalLink, ImageIcon } from 'lucide-react';
import {
  DeltaBadge,
  formatCompact,
  NudgeDudBadge,
} from '../facebook_components/util_component';
import { formatWatchSeconds } from '../utils_functions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useTimestampFormatter,
  type TimestampInput,
} from '@/lib/user-timezone';

export function IgMetricTile({
  label,
  value,
  icon: Icon,
  delta,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  /** Signed % change vs the previous 7-day window. Pass `null` for "n/a". */
  delta?: number | null;
}) {
  return (
    <div className="rounded-xl border border-default bg-default p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-secondary">{label}</p>
        <Icon className="h-5 w-5 shrink-0 text-preview" aria-hidden />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <p className="text-2xl font-semibold tabular-nums text-default">
          {value}
        </p>
        {delta !== undefined ? <DeltaBadge pct={delta} /> : null}
      </div>
      {delta !== undefined ? (
        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-secondary">
          vs last week
        </p>
      ) : null}
    </div>
  );
}

export function InstagramMediaCard({
  post,
  rank,
  onExpand,
  classification,
}: {
  post: InstagramPost;
  rank: number;
  onExpand?: (post: InstagramPost) => void;
  /** Nudge/Dud classification (computed in the parent against the cohort). */
  classification?: 'nudge' | 'dud';
}) {
  const fmtTimestamp = useTimestampFormatter();
  const preview = post.caption?.trim().slice(0, 140) || 'No caption';
  const ellipsis = post.caption && post.caption.length > 140 ? '…' : '';
  const isStory = post.mediaType === 'STORY';

  return (
    <article className="overflow-hidden rounded-xl border border-default bg-default transition-">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-stretch">
        {post.mediaUrl ? (
          <button
            type="button"
            onClick={() => onExpand?.(post)}
            className="group relative h-36 w-full shrink-0 cursor-zoom-in overflow-hidden rounded-full border-0 bg-element p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:h-auto sm:w-40"
            aria-label="Open media preview"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.mediaUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-200"
            />
          </button>
        ) : (
          <div className="flex h-36 w-full shrink-0 items-center justify-center rounded-lg bg-element text-secondary sm:h-auto sm:w-40">
            <ImageIcon className="h-10 w-10" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-secondary">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-preview text-preview">
              {rank}
            </span>
            <span className="rounded-md bg-element px-1.5 py-0.5 font-mono text-[10px] uppercase text-default">
              {post.mediaType}
            </span>
            {fmtTimestamp(post.timestamp as TimestampInput, {
              style: 'date',
            })}
            {classification ? <NudgeDudBadge kind={classification} /> : null}
            {post.permalink ? (
              <a
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-preview underline-offset-2 hover:underline"
              >
                Open
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            ) : null}
          </div>
          <p className="mt-2 line-clamp-3 text-sm text-default">
            {preview}
            {ellipsis}
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-secondary">
            <div>
              <dt className="inline text-secondary">Likes </dt>
              <dd className="inline font-medium tabular-nums text-default">
                {formatCompact(post.likes)}
              </dd>
            </div>
            <div>
              <dt className="inline text-secondary">Comments </dt>
              <dd className="inline font-medium tabular-nums text-default">
                {formatCompact(post.comments)}
              </dd>
            </div>
            <div>
              <dt className="inline text-secondary">Saved </dt>
              <dd className="inline font-medium tabular-nums text-default">
                {formatCompact(post.saved)}
              </dd>
            </div>
            <div>
              <dt className="inline text-secondary">Shares </dt>
              <dd className="inline font-medium tabular-nums text-default">
                {formatCompact(post.shares)}
              </dd>
            </div>
            <div>
              <dt className="inline text-secondary">Score </dt>
              <dd className="inline font-medium tabular-nums text-default">
                {formatCompact(post.engagementScore)}
              </dd>
            </div>
            <div>
              <dt className="inline text-secondary">Rate </dt>
              <dd className="inline font-medium tabular-nums text-default">
                {Number(post.engagementRate).toFixed(1)}%
              </dd>
            </div>
            <div>
              <dt className="inline text-secondary">Reach </dt>
              <dd className="inline font-medium tabular-nums text-default">
                {formatCompact(post.reach)}
              </dd>
            </div>
            <div>
              <dt className="inline text-secondary">Views </dt>
              <dd className="inline font-medium tabular-nums text-default">
                {formatCompact(post.views)}
              </dd>
            </div>
            {post.mediaType === 'REELS' && post.avgWatchTime > 0 ? (
              <div>
                <dt className="inline text-secondary">Avg watch </dt>
                <dd className="inline font-medium tabular-nums text-default">
                  {formatWatchSeconds(post.avgWatchTime)}
                </dd>
              </div>
            ) : null}
            {isStory ? (
              <>
                <div>
                  <dt className="inline text-secondary">Replies </dt>
                  <dd className="inline font-medium tabular-nums text-default">
                    {formatCompact(post.replies)}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-secondary">Fwd taps </dt>
                  <dd className="inline font-medium tabular-nums text-default">
                    {formatCompact(post.tapsForward)}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-secondary">Back taps </dt>
                  <dd className="inline font-medium tabular-nums text-default">
                    {formatCompact(post.tapsBack)}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-secondary">Exits </dt>
                  <dd className="inline font-medium tabular-nums text-default">
                    {formatCompact(post.exits)}
                  </dd>
                </div>
              </>
            ) : null}
            {post.isSharedToFeed ? (
              <div className="w-full text-[10px] uppercase tracking-wide text-preview">
                Shared to feed
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </article>
  );
}

export function InstagramMediaDialog({
  post,
  open,
  onOpenChange,
  aiFooter,
}: {
  post: InstagramPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aiFooter?: ReactNode;
}) {
  if (!post?.mediaUrl) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-h-[90vh] max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl lg:max-w-3xl"
      >
        <div className="max-h-[inherit] overflow-y-auto">
          <div className="flex max-h-[min(70vh,720px)] items-center justify-center bg-background/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.mediaUrl}
              alt=""
              className="h-auto max-h-[min(70vh,720px)] w-full object-contain"
            />
          </div>
          <DialogHeader className="gap-2 border-t border-default p-4 text-left sm:p-5">
            <DialogTitle className="text-base text-default">
              {post.mediaType} · Instagram
            </DialogTitle>
            <DialogDescription className="sr-only">
              Media preview and performance metrics for this Instagram post.
            </DialogDescription>
            {post.permalink ? (
              <a
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1 text-xs font-medium text-preview hover:underline"
              >
                View on Instagram
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            ) : null}
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-default">
              {post.caption?.trim() || 'No caption'}
            </p>
            {aiFooter}
          </DialogHeader>
        </div>
      </DialogContent>
    </Dialog>
  );
}
