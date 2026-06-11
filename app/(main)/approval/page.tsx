'use client';

import { getScheduledPosts } from '@/src/service/api/social.servce';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import Link from 'next/link';
import { Calendar, ExternalLink, Sparkles } from 'lucide-react';
import { performActionByUserOnScheduledPost } from '@/src/service/api/userService';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import { showErrorToast } from '@/lib/show-error-toast';
import { cn } from '@/lib/utils';
import {
  generatedByLabel,
  getDisplayStatus,
  statusBadgeClasses,
  StatusBadgeIcon,
} from '@/lib/scheduled-post-status';
import {
  useTimestampFormatter,
  type TimestampInput,
} from '@/lib/user-timezone';
import {
  ImagePreviewButton,
  ImagePreviewOverlay,
  useImagePreview,
} from '@/components/image-preview';

type FirestoreTimestamp = {
  _seconds: number;
  _nanoseconds: number;
};

export type PendingScheduledPost = {
  postId: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  businessDNA?: string;
  message: string;
  removedByUser?: boolean;
  rejectedByUser?: boolean;
  imageUrl: string | null;
  scheduleAt: FirestoreTimestamp;
  platform: string;
  postStatus: string;
  UserApprovalStatus: string;
  createdAt: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
  postedAt?: FirestoreTimestamp | null;
  failedAt?: FirestoreTimestamp | null;
  error?: string | null;
  errors?: string[] | null;
  GeneratedBy?: string;
};

type ApprovalAction = 'regenerate' | 'approve' | 'reject';

function ApprovalActionButtons({
  size,
  onRegenerate,
  onAccept,
  onReject,
  stopPropagation,
  disabled,
}: {
  size: 'card' | 'modal';
  onRegenerate?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  stopPropagation?: boolean;
  disabled?: boolean;
}) {
  const handle = (fn: (() => void) | undefined, e: MouseEvent) => {
    if (disabled) return;
    if (stopPropagation) e.stopPropagation();
    fn?.();
  };
  const isCard = size === 'card';
  const btn = isCard
    ? 'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none'
    : 'rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  return (
    <div
      className={`flex items-center gap-3 ${!isCard ? 'flex-wrap' : 'flex-wrap'}`}
      aria-busy={disabled ? true : undefined}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => handle(onRegenerate, e)}
        className={`${btn} bg-amber-100 text-amber-800 hover:bg-amber-200 focus:ring-amber-500`}
      >
        Regenerate
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => handle(onAccept, e)}
        className={`${btn} bg-emerald-100 text-emerald-800 hover:bg-emerald-200 focus:ring-emerald-500`}
      >
        Accept
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => handle(onReject, e)}
        className={`${btn} bg-red-100 text-red-800 hover:bg-red-200 focus:ring-red-500`}
      >
        Reject
      </button>
    </div>
  );
}

function PendingPostCard({
  post,
  scheduleAt,
  onSelect,
  cardRef,
  onRegenerate,
  onAccept,
  onReject,
  actionDisabled,
  onPreviewImage,
}: {
  post: PendingScheduledPost;
  scheduleAt: string;
  onSelect: () => void;
  cardRef?: (node: HTMLDivElement | null) => void;
  onRegenerate: () => void;
  onAccept: () => void;
  onReject: () => void;
  actionDisabled: boolean;
  onPreviewImage: (url: string, alt?: string) => void;
}) {
  const status = getDisplayStatus(post);
  const generatedBy = generatedByLabel(post.GeneratedBy);
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
        'group relative flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm',
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
        <div className="absolute left-2 top-2 max-w-[calc(100%-1rem)]">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
              statusBadgeClasses(status.variant)
            )}
            title={status.reason ? `Failed: ${status.reason}` : status.label}
          >
            <StatusBadgeIcon variant={status.variant} />
            <span className="truncate">{status.label}</span>
          </span>
        </div>
        {generatedBy ? (
          <div className="absolute right-2 top-2 max-w-[60%]">
            <span
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 shadow-sm backdrop-blur"
              title={`Generated by: ${generatedBy}`}
            >
              <Sparkles className="h-3 w-3 text-[#4A8FF6]" />
              <span className="truncate">{generatedBy}</span>
            </span>
          </div>
        ) : null}
        {post.imageUrl ? (
          <div className="absolute bottom-2 right-2">
            <ImagePreviewButton
              variant="overlay-icon"
              stopPropagation
              onClick={() =>
                onPreviewImage(post.imageUrl as string, 'Scheduled post image')
              }
            />
          </div>
        ) : null}
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

      {status.reason ? (
        <p
          className="mt-2 line-clamp-2 rounded-md border border-red-100 bg-red-50/60 px-2 py-1 text-[11px] leading-snug text-red-700"
          title={status.reason}
        >
          <span className="font-semibold">Reason: </span>
          {status.reason}
        </p>
      ) : null}

      <div className="mt-3 space-y-2">
        <ApprovalActionButtons
          size="card"
          stopPropagation
          disabled={actionDisabled}
          onRegenerate={onRegenerate}
          onAccept={onAccept}
          onReject={onReject}
        />
        <p className="text-[11px] text-slate-400 group-hover:text-slate-500">
          Click for full details
        </p>
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
        className={`text-sm text-slate-800${
          long ? ' whitespace-pre-wrap wrap-break-word' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function DetailModal({
  post,
  actionLoading,
  onClose,
  onAction,
  formatTimestamp,
  onPreviewImage,
}: {
  post: PendingScheduledPost;
  actionLoading: boolean;
  onClose: () => void;
  onAction: (
    postId: string,
    action: ApprovalAction,
    platform: string
  ) => void | Promise<unknown>;
  formatTimestamp: (ts: TimestampInput) => string;
  onPreviewImage: (url: string, alt?: string) => void;
}) {
  const scheduleAt = formatTimestamp(post.scheduleAt as FirestoreTimestamp);
  const createdAt = formatTimestamp(post.createdAt as FirestoreTimestamp);
  const status = getDisplayStatus(post);
  const generatedBy = generatedByLabel(post.GeneratedBy);
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
              <button
                type="button"
                onClick={() =>
                  onPreviewImage(post.imageUrl as string, 'Scheduled post image')
                }
                className="group relative block w-full overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A8FF6]"
                aria-label="Open image preview"
              >
                <img
                  src={post.imageUrl}
                  alt="Post"
                  className="w-full max-h-64 object-contain rounded-xl bg-slate-100 border border-slate-200 transition-transform duration-200 group-hover:scale-[1.01]"
                />
              </button>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-4">
                <ImagePreviewButton
                  onClick={() =>
                    onPreviewImage(
                      post.imageUrl as string,
                      'Scheduled post image'
                    )
                  }
                  className="rounded-lg bg-white border border-[#4A8FF6]/30 text-[#1e40af] hover:bg-[#4A8FF6]/10 hover:opacity-100 px-4 py-2"
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
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Status</p>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold',
                statusBadgeClasses(status.variant)
              )}
            >
              <StatusBadgeIcon variant={status.variant} className="h-3.5 w-3.5" />
              {status.label}
            </span>
            {status.variant === 'failed' ? (
              <p className="mt-2 whitespace-pre-wrap break-words rounded-lg border border-red-100 bg-red-50/60 p-2 text-xs text-red-700">
                <span className="font-semibold">Reason: </span>
                {status.reason ?? 'No failure reason recorded.'}
              </p>
            ) : null}
          </div>
          <DetailRow label="Platform" value={post.platform ?? '—'} />
          {generatedBy ? (
            <DetailRow label="Generated by" value={generatedBy} />
          ) : null}
          <div className="pt-4 border-t border-slate-200">
            <p className="text-xs font-medium text-slate-500 mb-3">Actions</p>
            <ApprovalActionButtons
              size="modal"
              disabled={actionLoading}
              onRegenerate={() =>
                onAction(post.postId, 'regenerate', post.platform)
              }
              onAccept={() => onAction(post.postId, 'approve', post.platform)}
              onReject={() => onAction(post.postId, 'reject', post.platform)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ApprovalPage() {
  const [pendingPosts, setPendingPosts] = useState<PendingScheduledPost[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<PendingScheduledPost | null>(
    null
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<FirestoreTimestamp | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [actingPostId, setActingPostId] = useState<string | null>(null);
  const { billing } = useUserPlanCredits();
  const fmtTimestamp = useTimestampFormatter();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const fetchingRef = useRef(false);
  const cursorRef = useRef<FirestoreTimestamp | null>(null);
  const hasMoreRef = useRef(true);
  const fetchPendingRef = useRef<() => Promise<void>>(async () => {});
  const imagePreview = useImagePreview();

  const needApproval = billing?.preferences.Need_Approval;

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const fetchPending = useCallback(async () => {
    if (!needApproval) return;
    if (!hasMoreRef.current || fetchingRef.current) return;
    fetchingRef.current = true;
    const isFirstPage = cursorRef.current == null;
    if (isFirstPage) {
      setInitialLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const response = await getScheduledPosts({
        cursor: cursorRef.current ?? undefined,
      });
      const data = response.data;
      const incoming: PendingScheduledPost[] = data.posts ?? [];
      setPendingPosts((prev) => {
        const seen = new Set(prev.map((p) => p.postId));
        const deduped = incoming.filter((p) => p.postId && !seen.has(p.postId));
        return [...prev, ...deduped];
      });
      const next = data.nextCursor ?? null;
      cursorRef.current = next;
      setCursor(next);
      if (!next) {
        setHasMore(false);
        hasMoreRef.current = false;
      }
    } catch {
      setHasMore(false);
      hasMoreRef.current = false;
    } finally {
      fetchingRef.current = false;
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }, [needApproval]);

  fetchPendingRef.current = fetchPending;

  useEffect(() => {
    if (needApproval) {
      void fetchPending();
    }
  }, [fetchPending, needApproval]);

  const silentRefresh = useCallback(async () => {
    if (!needApproval) return;
    try {
      const response = await getScheduledPosts();
      const data = response.data;
      const posts: PendingScheduledPost[] = data.posts ?? [];
      setPendingPosts(posts);
      const next = data.nextCursor ?? null;
      cursorRef.current = next;
      setCursor(next);
      setHasMore(next != null);
      hasMoreRef.current = next != null;
    } catch {
      // Silent — keep current state.
    }
  }, [needApproval]);

  const lastPostRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (initialLoading) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchPendingRef.current();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [initialLoading]
  );

  /**
   * Filter visible posts client-side. The shared `getScheduledPosts` endpoint
   * returns the user's full scheduled queue; here we only want items that are
   * still waiting on the user's approval decision.
   */
  const visiblePendingPosts = pendingPosts.filter(
    (post) =>
      !post.removedByUser &&
      !post.rejectedByUser &&
      (post.UserApprovalStatus === 'rejected' ||
        post.UserApprovalStatus === 'pending')
  );

  const handleAction = useCallback(
    async (postId: string, action: ApprovalAction, platform: string) => {
      if (!postId) {
        showErrorToast('Missing post id');
        return;
      }
      if (action === 'regenerate' && !platform) {
        showErrorToast('Missing platform for this post');
        return;
      }

      // Snapshot for rollback if the API rejects after we optimistically pop.
      const previousPosts = pendingPosts;
      const previousSelected = selectedPost;

      // Optimistic: pop the post out of the approval list immediately. All
      // three actions (approve / reject / regenerate) take the post out of the
      // "pending your approval" bucket — approval moves it forward, reject
      // marks `rejectedByUser`, regenerate kicks off a new job and the worker
      // refreshes the doc. The silent background refresh below reconciles.
      setPendingPosts((prev) => prev.filter((p) => p.postId !== postId));
      if (selectedPost?.postId === postId) {
        setSelectedPost(null);
      }

      setActingPostId(postId);
      try {
        await performActionByUserOnScheduledPost(postId, action, platform);
        void silentRefresh();
      } catch {
        showErrorToast('Failed to perform action on scheduled post');
        setPendingPosts(previousPosts);
        if (previousSelected?.postId === postId) {
          setSelectedPost(previousSelected);
        }
      } finally {
        setActingPostId(null);
      }
    },
    [pendingPosts, selectedPost, silentRefresh]
  );

  if (!needApproval) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-slate-500">
        Approval is not enabled. Please enable it in the
        <Link href="/settings/automation" className="text-blue-500">
          Automation Preferences
        </Link>
      </div>
    );
  }

  const actionDisabled = actingPostId !== null;

  return (
    <div className="mx-auto max-w-6xl animate-in fade-in duration-500">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 pb-8 pt-8 sm:px-10 sm:pt-10">
          <header className="mb-8 max-w-2xl">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              <span className="text-black">Approval</span>
            </h1>
            <p className="mt-3 text-base text-slate-500">
              Review scheduled posts that need your approval. Accept to keep them
              in the queue, reject to discard them, or regenerate to get a fresh
              variation.
            </p>
          </header>

          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Pending scheduled posts for approval
            </h2>
            <p className="text-sm text-slate-500">
              {visiblePendingPosts.length} in view
            </p>
          </div>

          {initialLoading ? (
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
          ) : visiblePendingPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
              <Calendar className="mx-auto mb-3 h-10 w-10 text-[#4A8FF6]/60" />
              <p className="text-sm font-medium text-slate-700">
                No posts waiting for your approval
              </p>
              <p className="mt-1 text-sm text-slate-500">
                When new scheduled posts need your review, they will show up
                here as cards.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visiblePendingPosts.map((post, index) => {
                const scheduleAt = fmtTimestamp(
                  post.scheduleAt as FirestoreTimestamp
                );
                const isLast = index === visiblePendingPosts.length - 1;
                return (
                  <PendingPostCard
                    key={post.postId ?? `post-${index}`}
                    post={post}
                    scheduleAt={scheduleAt}
                    onSelect={() => setSelectedPost(post)}
                    cardRef={isLast ? lastPostRef : undefined}
                    onRegenerate={() =>
                      handleAction(post.postId, 'regenerate', post.platform)
                    }
                    onAccept={() =>
                      handleAction(post.postId, 'approve', post.platform)
                    }
                    onReject={() =>
                      handleAction(post.postId, 'reject', post.platform)
                    }
                    actionDisabled={actionDisabled}
                    onPreviewImage={imagePreview.open}
                  />
                );
              })}
            </div>
          )}

          {loadingMore && !initialLoading && (
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
          actionLoading={actionDisabled}
          onClose={() => setSelectedPost(null)}
          onAction={(postId, action, platform) =>
            handleAction(postId, action, platform)
          }
          formatTimestamp={fmtTimestamp}
          onPreviewImage={imagePreview.open}
        />
      )}

      <ImagePreviewOverlay
        src={imagePreview.previewUrl}
        alt={imagePreview.previewAlt}
        onClose={imagePreview.close}
      />
    </div>
  );
}
