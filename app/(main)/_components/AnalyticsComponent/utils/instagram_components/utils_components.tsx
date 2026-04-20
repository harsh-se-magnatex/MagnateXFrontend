import { ComponentType, type ReactNode } from "react";
import { InstagramPost } from "../../../types";
import { ExternalLink, ImageIcon } from "lucide-react";
import { formatCompact } from "../facebook_components/util_component";
import { formatWatchSeconds } from "../utils_functions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function IgMetricTile({
    label,
    value,
    icon: Icon,
  }: {
    label: string;
    value: string;
    icon: ComponentType<{ className?: string }>;
  }) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          <Icon className="h-5 w-5 shrink-0 text-pink-400" aria-hidden />
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900">
          {value}
        </p>
      </div>
    );
  }
  
  export function InstagramMediaCard({
    post,
    rank,
    onExpand,
  }: {
    post: InstagramPost;
    rank: number;
    onExpand?: (post: InstagramPost) => void;
  }) {
    const preview = post.caption?.trim().slice(0, 140) || 'No caption';
    const ellipsis = post.caption && post.caption.length > 140 ? '…' : '';
    const isStory = post.mediaType === 'STORY';
  
    return (
      <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-stretch">
          {post.mediaUrl ? (
            <button
              type="button"
              onClick={() => onExpand?.(post)}
              className="group relative h-36 w-full shrink-0 cursor-zoom-in overflow-hidden rounded-lg border-0 bg-zinc-100 p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 sm:h-auto sm:w-40"
              aria-label="Open media preview"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.mediaUrl}
                alt=""
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              />
            </button>
          ) : (
            <div className="flex h-36 w-full shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400 sm:h-auto sm:w-40">
              <ImageIcon className="h-10 w-10" aria-hidden />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-pink-100 text-pink-800">
                {rank}
              </span>
              <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] uppercase text-zinc-700">
                {post.mediaType}
              </span>
              {post.timestamp
                ? new Date(post.timestamp).toLocaleDateString(undefined, {
                    dateStyle: 'medium',
                  })
                : '—'}
              {post.permalink ? (
                <a
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-pink-700 underline-offset-2 hover:underline"
                >
                  Open
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              ) : null}
            </div>
            <p className="mt-2 line-clamp-3 text-sm text-zinc-800">
              {preview}
              {ellipsis}
            </p>
            <dl className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-600">
              <div>
                <dt className="inline text-zinc-500">Likes </dt>
                <dd className="inline font-medium tabular-nums text-zinc-900">
                  {formatCompact(post.likes)}
                </dd>
              </div>
              <div>
                <dt className="inline text-zinc-500">Comments </dt>
                <dd className="inline font-medium tabular-nums text-zinc-900">
                  {formatCompact(post.comments)}
                </dd>
              </div>
              <div>
                <dt className="inline text-zinc-500">Saved </dt>
                <dd className="inline font-medium tabular-nums text-zinc-900">
                  {formatCompact(post.saved)}
                </dd>
              </div>
              <div>
                <dt className="inline text-zinc-500">Shares </dt>
                <dd className="inline font-medium tabular-nums text-zinc-900">
                  {formatCompact(post.shares)}
                </dd>
              </div>
              <div>
                <dt className="inline text-zinc-500">Score </dt>
                <dd className="inline font-medium tabular-nums text-zinc-900">
                  {formatCompact(post.engagementScore)}
                </dd>
              </div>
              <div>
                <dt className="inline text-zinc-500">Rate </dt>
                <dd className="inline font-medium tabular-nums text-zinc-900">
                  {Number(post.engagementRate).toFixed(1)}%
                </dd>
              </div>
              <div>
                <dt className="inline text-zinc-500">Reach </dt>
                <dd className="inline font-medium tabular-nums text-zinc-900">
                  {formatCompact(post.reach)}
                </dd>
              </div>
              <div>
                <dt className="inline text-zinc-500">Views </dt>
                <dd className="inline font-medium tabular-nums text-zinc-900">
                  {formatCompact(post.views)}
                </dd>
              </div>
              {post.mediaType === 'REELS' && post.avgWatchTime > 0 ? (
                <div>
                  <dt className="inline text-zinc-500">Avg watch </dt>
                  <dd className="inline font-medium tabular-nums text-zinc-900">
                    {formatWatchSeconds(post.avgWatchTime)}
                  </dd>
                </div>
              ) : null}
              {isStory ? (
                <>
                  <div>
                    <dt className="inline text-zinc-500">Replies </dt>
                    <dd className="inline font-medium tabular-nums text-zinc-900">
                      {formatCompact(post.replies)}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-zinc-500">Fwd taps </dt>
                    <dd className="inline font-medium tabular-nums text-zinc-900">
                      {formatCompact(post.tapsForward)}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-zinc-500">Back taps </dt>
                    <dd className="inline font-medium tabular-nums text-zinc-900">
                      {formatCompact(post.tapsBack)}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-zinc-500">Exits </dt>
                    <dd className="inline font-medium tabular-nums text-zinc-900">
                      {formatCompact(post.exits)}
                    </dd>
                  </div>
                </>
              ) : null}
              {post.isSharedToFeed ? (
                <div className="w-full text-[10px] uppercase tracking-wide text-pink-600">
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
            <div className="flex max-h-[min(70vh,720px)] items-center justify-center bg-zinc-950/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.mediaUrl}
                alt=""
                className="h-auto max-h-[min(70vh,720px)] w-full object-contain"
              />
            </div>
            <DialogHeader className="gap-2 border-t border-zinc-200 p-4 text-left sm:p-5">
              <DialogTitle className="text-base text-zinc-900">
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
                  className="inline-flex w-fit items-center gap-1 text-xs font-medium text-pink-600 hover:underline"
                >
                  View on Instagram
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              ) : null}
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-800">
                {post.caption?.trim() || 'No caption'}
              </p>
              {aiFooter}
            </DialogHeader>
          </div>
        </DialogContent>
      </Dialog>
    );
  }