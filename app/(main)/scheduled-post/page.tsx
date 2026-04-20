'use client';

import { useAuth } from '@/src/hooks/useAuth';
import { getScheduledPosts } from '@/src/service/api/social.servce';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import {
  performActionByUserOnScheduledPost,
  removeScheduledPost,
} from '@/src/service/api/userService';
import {
  Calendar,
  AlertCircle,
  CheckCircle2,
  RotateCw,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DownloadPngButton } from '@/components/download-png-button';

type FirestoreTimestamp = {
  _seconds: number;
  _nanoseconds: number;
};

export type ScheduledPost = {
  postId?: string;
  message: string;
  /** Regenerations so far; also stored as `regenratedCount` in some API payloads. */
  regeneratedCount?: number;
  regenratedCount?: number;
  /** When true, user may regenerate via AI engine (matches stored post). */
  generatedByAiEngine?: boolean;
  generationProof?: unknown;
  imageUrl: string | null;
  scheduleAt: FirestoreTimestamp;
  platform: string;
  postStatus: 'pending' | 'processing' | 'posted' | 'failed';
  failedAt: FirestoreTimestamp | null;
  error: string | null;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  postedAt: FirestoreTimestamp | null;
};

function ScheduledPostActionButtons({
  size,
  showRegenerate,
  regeneratedCount,
  onRegenerate,
  onRemove,
  stopPropagation,
  disabled,
}: {
  size: 'card' | 'modal';
  showRegenerate: boolean;
  regeneratedCount?: number;
  onRegenerate?: () => void;
  onRemove?: () => void;
  stopPropagation?: boolean;
  disabled?: boolean;
}) {
  const handle = (fn: (() => void) | undefined, e: MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    fn?.();
  };
  const isCard = size === 'card';
  /** After 2 free regenerations, the 3rd+ costs credits — warn when count >= 2. */
  const showCreditsWarning =
    typeof regeneratedCount === 'number' && regeneratedCount >= 2;
  const btn = isCard
    ? 'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none'
    : 'rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  return (
    <div className={`flex items-center gap-3 ${!isCard ? 'flex-wrap' : ''}`}>
      {showRegenerate ? (
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => handle(onRegenerate, e)}
          title={
            showCreditsWarning
              ? 'Next regeneration will deduct 2 credits'
              : undefined
          }
          className={`${btn} bg-amber-100 text-amber-800 hover:bg-amber-200 focus:ring-amber-500 inline-flex flex-col items-center justify-center gap-0.5 text-center`}
        >
          <span>Regenerate</span>
          {showCreditsWarning ? (
            <span
              className={
                isCard
                  ? 'max-w-44 text-[9px] font-normal leading-snug text-amber-900/90'
                  : 'max-w-56 text-[11px] font-normal leading-snug text-amber-900/90'
              }
            >
              2 credits will be deducted on next regeneration
            </span>
          ) : null}
        </button>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => handle(onRemove, e)}
        className={`${btn} bg-red-100 text-red-800 hover:bg-red-200 focus:ring-red-500`}
      >
        Remove
      </button>
    </div>
  );
}

function getRegeneratedCount(post: ScheduledPost): number {
  const n = post.regeneratedCount ?? post.regenratedCount;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

function formatTimestamp(ts: FirestoreTimestamp | null): string {
  if (!ts) return '—';
  const date = new Date(ts._seconds * 1000 + ts._nanoseconds / 1e6);
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function DetailModal({
  post,
  onClose,
  formatTimestamp,
  onRegenerate,
  onRemove,
  actionDisabled,
}: {
  post: ScheduledPost;
  onClose: () => void;
  formatTimestamp: (ts: FirestoreTimestamp | null) => string;
  onRegenerate: () => void;
  onRemove: () => void;
  actionDisabled: boolean;
}) {
  const scheduleAt = formatTimestamp(post.scheduleAt as FirestoreTimestamp);
  const createdAt = formatTimestamp(post.createdAt as FirestoreTimestamp);
  const showRegenerate = post.generatedByAiEngine === true;
  const regeneratedCount = getRegeneratedCount(post);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
    >
      <div
        className="rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 id="detail-modal-title" className="text-lg font-semibold">
            Scheduled post details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A8FF6]/40"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-4">
          {post.imageUrl && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Image</p>
              <img
                src={post.imageUrl}
                alt="Post"
                className="w-full max-h-64 object-contain rounded-xl bg-slate-100 border border-slate-200"
              />
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <DownloadPngButton
                  url={post.imageUrl}
                  getFilename={() =>
                    `scheduled-${post.platform ?? 'post'}-${Date.now()}.png`
                  }
                />
              </div>
              <div className="flex w-full justify-end">
                <a
                  href={post.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-3 py-2 text-sm font-medium text-white shadow-lg shadow-[#4A8FF6]/20"
                >
                  Open in new tab
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}
          <DetailRow label="Caption / Message" value={post.message || '—'} long />
          <DetailRow label="Schedule at" value={scheduleAt} />
          <DetailRow label="Created at" value={createdAt} />
          <DetailRow label="Post status" value={post.postStatus ?? '—'} />
          <DetailRow label="Platform" value={post.platform ?? '—'} />
          <div className="pt-4 border-t border-slate-200">
            <p className="text-xs font-medium text-slate-500 mb-3">Actions</p>
            <ScheduledPostActionButtons
              size="modal"
              showRegenerate={showRegenerate}
              regeneratedCount={regeneratedCount}
              onRegenerate={onRegenerate}
              onRemove={onRemove}
              disabled={actionDisabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  long,
}: {
  label: string;
  value: string;
  long?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 mb-0.5">{label}</p>
      <p
        className={`text-sm text-slate-800${long ? ' whitespace-pre-wrap wrap-break-word' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}

function statusBadgeClasses(status: string, isFailed: boolean) {
  if (isFailed) return 'bg-red-50 text-red-700 border-red-200';
  if (status === 'posted')
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'processing')
    return 'bg-amber-50 text-amber-800 border-amber-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function ScheduledPostCard({
  post,
  scheduleAt,
  onSelect,
  cardRef,
  onRegenerate,
  onRemove,
  actionDisabled,
}: {
  post: ScheduledPost;
  scheduleAt: string;
  onSelect: () => void;
  cardRef?: (node: HTMLDivElement | null) => void;
  onRegenerate: () => void;
  onRemove: () => void;
  actionDisabled: boolean;
}) {
  const status = post.postStatus ?? 'pending';
  const isFailed = status === 'failed';
  const showRegenerate = post.generatedByAiEngine === true;
  const regeneratedCount = getRegeneratedCount(post);
  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        'group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm',
        'transition-all duration-300',
        'hover:border-[#4A8FF6]/35 hover:bg-slate-50/80',
        'hover:shadow-md hover:shadow-slate-200/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A8FF6]/30'
      )}
    >
      <div className="relative mb-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 aspect-4/3">
        {post.imageUrl ? (
          <img
            src={post.imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full min-h-[140px] items-center justify-center text-sm text-slate-500">
            No image
          </div>
        )}
        <div className="absolute left-2 top-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
              statusBadgeClasses(status, isFailed)
            )}
          >
            {status === 'posted' && <CheckCircle2 className="h-3 w-3" />}
            {status === 'processing' && (
              <RotateCw className="h-3 w-3 animate-spin" />
            )}
            {isFailed && <AlertCircle className="h-3 w-3" />}
            {status}
          </span>
        </div>
      </div>

      <p className="line-clamp-3 text-sm font-medium leading-snug text-slate-900">
        {post.message || (
          <span className="text-slate-400 italic">No caption</span>
        )}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-[#4A8FF6]" />
          <span className="truncate">{scheduleAt}</span>
        </span>
        {post.platform ? (
          <>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500">{post.platform}</span>
          </>
        ) : null}
      </div>

      <div className="mt-2 space-y-2">
        <ScheduledPostActionButtons
          size="card"
          showRegenerate={showRegenerate}
          regeneratedCount={regeneratedCount}
          stopPropagation
          onRegenerate={onRegenerate}
          onRemove={onRemove}
          disabled={actionDisabled}
        />
        <p className="text-[11px] text-slate-400 group-hover:text-slate-500">
          Click for full details
        </p>
      </div>
    </div>
  );
}

export default function SchedulePostPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [scheduledPostsLoading, setScheduledPostsLoading] = useState(true);
  const [morePostsLoading, setMorePostsLoading] = useState(false);
  const [filterPosted, setFilterPosted] = useState(false);
  const [filterUpcoming, setFilterUpcoming] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [actingPostId, setActingPostId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<FirestoreTimestamp | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const obserVerRef = useRef<IntersectionObserver | null>(null);
  const fetchingRef = useRef(false);
  const cursorRef = useRef<FirestoreTimestamp | null>(null);
  const fetchScheduledPostsRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  const fetchScheduledPosts = useCallback(async () => {
    if (!hasMore || fetchingRef.current) return;
    fetchingRef.current = true;
    const isFirstPage = cursorRef.current == null;
    if (isFirstPage) {
      setScheduledPostsLoading(true);
    } else {
      setMorePostsLoading(true);
    }
    try {
      const response = await getScheduledPosts(cursorRef.current ?? undefined);
      const data = response.data;
      setScheduledPosts((prev) => [...prev, ...data.posts]);
      const next = data.nextCursor ?? null;
      cursorRef.current = next;
      setCursor(next);
      if (!next) {
        setHasMore(false);
      }
    } catch {
      setScheduledPosts([]);
    } finally {
      fetchingRef.current = false;
      setScheduledPostsLoading(false);
      setMorePostsLoading(false);
    }
  }, [hasMore]);

  fetchScheduledPostsRef.current = fetchScheduledPosts;

  // Initial load only: do not depend on `fetchScheduledPosts` (it changes when `hasMore`
  // changes). Otherwise `refreshScheduledPosts` sets `hasMore` true and this effect
  // re-runs, appending the first page again while refresh replaces — duplicates + key warnings.
  useEffect(() => {
    void fetchScheduledPostsRef.current();
  }, []);

  const refreshScheduledPosts = useCallback(
    async (options?: { keepSelectionForPostId?: string }) => {
      fetchingRef.current = false;
      cursorRef.current = null;
      setCursor(null);
      setHasMore(true);
      setScheduledPostsLoading(true);
      try {
        const response = await getScheduledPosts(undefined);
        const data = response.data;
        const posts = data.posts;
        setScheduledPosts(posts);
        const next = data.nextCursor ?? null;
        cursorRef.current = next;
        setCursor(next);
        setHasMore(next != null);
        const keepId = options?.keepSelectionForPostId;
        if (keepId) {
          const nextSel = posts.find((p: ScheduledPost) => p.postId === keepId);
          if (nextSel) setSelectedPost(nextSel);
        }
      } catch {
        setScheduledPosts([]);
      } finally {
        setScheduledPostsLoading(false);
      }
    },
    []
  );

  const handlePostAction = useCallback(
    async (post: ScheduledPost, action: 'regenerate' | 'remove') => {
      const postId = post.postId;
      const platform = post.platform ?? '';
      if (!postId) {
        alert('Missing post id');
        return;
      }
      if (action === 'regenerate' && post.generatedByAiEngine !== true) {
        return;
      }
      if (action === 'regenerate' && !platform) {
        alert('Missing platform for this post');
        return;
      }
      setActingPostId(postId);
      try {
        if (action === 'remove') {
          await removeScheduledPost(postId);
        } else {
          await performActionByUserOnScheduledPost(
            postId,
            'regenerate',
            platform
          );
        }
        if (action === 'remove' && selectedPost?.postId === postId) {
          setSelectedPost(null);
        }
        if (action === 'regenerate') {
          const keepId =
            selectedPost?.postId === postId ? postId : undefined;
          await refreshScheduledPosts(
            keepId ? { keepSelectionForPostId: keepId } : undefined
          );
        } else {
          await refreshScheduledPosts();
        }
      } catch {
        alert('Failed to perform action on scheduled post');
      } finally {
        setActingPostId(null);
      }
    },
    [refreshScheduledPosts, selectedPost?.postId]
  );

  const lastPostRef = useCallback((node: HTMLDivElement | null) => {
    if (scheduledPostsLoading) return;

    if (obserVerRef.current) obserVerRef.current.disconnect();

    obserVerRef.current = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        void fetchScheduledPostsRef.current();
      }
    });

    if (node) obserVerRef.current.observe(node);
  }, [scheduledPostsLoading]);

  const filteredAndSortedPosts = useMemo(() => {
    const isPosted = (p: ScheduledPost) => p.postStatus === 'posted';
    const upcoming = scheduledPosts.filter((p) => !isPosted(p));
    const posted = scheduledPosts.filter(isPosted);
    if (!filterPosted && !filterUpcoming) {
      return [...upcoming, ...posted];
    }
    if (!filterPosted) return upcoming;
    if (!filterUpcoming) return posted;
    return [];
  }, [scheduledPosts, filterPosted, filterUpcoming]);

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  if (loading) return null;
  if (!user) return null;

  return (
    <div className="mx-auto max-w-6xl animate-in fade-in duration-500">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 pb-8 pt-8 sm:px-10 sm:pt-10">
          <header className="mb-8 max-w-2xl">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                <span className="text-black">
                Scheduled posts
              </span>
            </h1>
            <p className="mt-3 text-base text-slate-500">
              Plan and track what goes out — upcoming and published in one place.
            </p>
          </header>

          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setFilterUpcoming((v) => !v);
                  setFilterPosted(false);
                }}
                className={cn(
                  'rounded-lg px-4 py-2 text-xs font-semibold transition-all',
                  filterUpcoming && !filterPosted
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Upcoming
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterPosted((v) => !v);
                  setFilterUpcoming(false);
                }}
                className={cn(
                  'rounded-lg px-4 py-2 text-xs font-semibold transition-all',
                  filterPosted && !filterUpcoming
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Posted
              </button>
            </div>
            <p className="text-sm text-slate-500">
              {filteredAndSortedPosts.length} in view
            </p>
          </div>

          {scheduledPostsLoading ? (
            <div
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              aria-busy="true"
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 aspect-4/3 animate-pulse rounded-xl bg-slate-200" />
                  <div className="h-3 w-4/5 animate-pulse rounded bg-slate-200" />
                  <div className="mt-2 h-3 w-3/5 animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : filteredAndSortedPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
              <Calendar className="mx-auto mb-3 h-10 w-10 text-[#4A8FF6]/60" />
              <p className="text-sm font-medium text-slate-700">
                No posts in this queue yet
              </p>
              <p className="mt-1 text-sm text-slate-500">
                When you schedule content, it will show up here as cards.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedPosts.map((post, index) => {
                const scheduleAt =
                  post.scheduleAt && '_seconds' in post.scheduleAt
                    ? formatTimestamp(post.scheduleAt as FirestoreTimestamp)
                    : '—';

                const isLast = index === filteredAndSortedPosts.length - 1;

                return (
                  <ScheduledPostCard
                    key={post.postId ?? `post-${index}`}
                    post={post}
                    scheduleAt={scheduleAt}
                    onSelect={() => setSelectedPost(post)}
                    cardRef={isLast ? lastPostRef : undefined}
                    onRegenerate={() => handlePostAction(post, 'regenerate')}
                    onRemove={() => handlePostAction(post, 'remove')}
                    actionDisabled={!post.postId || actingPostId !== null}
                  />
                );
              })}
            </div>
          )}

          {morePostsLoading && !scheduledPostsLoading && (
            <div
              className="mt-8 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-4 text-sm text-slate-600"
              aria-busy="true"
              aria-live="polite"
              aria-label="Loading more posts"
            >
              <span
                className="size-4 shrink-0 animate-spin rounded-full border-2 border-slate-200 border-t-[#4A8FF6]"
                aria-hidden
              />
              Loading more…
            </div>
          )}
        </div>
      </div>

      {selectedPost && (
        <DetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          formatTimestamp={formatTimestamp}
          onRegenerate={() => handlePostAction(selectedPost, 'regenerate')}
          onRemove={() => handlePostAction(selectedPost, 'remove')}
          actionDisabled={!selectedPost.postId || actingPostId !== null}
        />
      )}
    </div>
  );
}
