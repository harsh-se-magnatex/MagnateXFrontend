'use client';

import {
  getAdminPendingScheduledPosts,
  performActionOnScheduledPost,
} from '@/src/service/api/social.servce';
import { ExternalLink } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

type FirestoreTimestamp = {
  _seconds: number;
  _nanoseconds: number;
};

export type PendingScheduledPost = {
  postId: string;
  userId: string;
  userName: string;
  userEmail: string;
  businessDNA: string;
  message: string;
  imageUrl: string | null;
  scheduleAt: FirestoreTimestamp;
  platform: string;
  postStatus: string;
  createdAt: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
  postedAt?: FirestoreTimestamp | null;
  failedAt?: FirestoreTimestamp | null;
  error?: string | null;
};

function formatTimestamp(ts: FirestoreTimestamp | null | undefined): string {
  if (!ts || !('_seconds' in ts)) return '—';
  const date = new Date(ts._seconds * 1000 + (ts._nanoseconds ?? 0) / 1e6);
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function ActionButtons({
  size,
  onRegenerate,
  onAccept,
  onReject,
  stopPropagation,
}: {
  size: 'card' | 'modal';
  onRegenerate?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  stopPropagation?: boolean;
}) {
  const handle = (fn: (() => void) | undefined, e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    fn?.();
  };
  const isCard = size === 'card';
  const btn = isCard
    ? 'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1'
    : 'rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  return (
    <div className={`flex items-center gap-3 ${!isCard ? 'flex-wrap' : ''}`}>
      <button
        type="button"
        onClick={(e) => handle(onRegenerate, e)}
        className={`${btn} bg-amber-100 text-amber-800 hover:bg-amber-200  focus:ring-amber-500`}
      >
        Regenerate
      </button>
      <button
        type="button"
        onClick={(e) => handle(onAccept, e)}
        className={`${btn} bg-emerald-100 text-emerald-800 hover:bg-emerald-200  focus:ring-emerald-500`}
      >
        Accept
      </button>
      <button
        type="button"
        onClick={(e) => handle(onReject, e)}
        className={`${btn} bg-red-100 text-red-800 hover:bg-red-200  focus:ring-red-500`}
      >
        Reject
      </button>
    </div>
  );
}

export default function MonitoringPage() {
  const [pendingPosts, setPendingPosts] = useState<PendingScheduledPost[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PendingScheduledPost | null>(
    null
  );
  const [cursor, setCursor] = useState<FirestoreTimestamp | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const obserVerRef = useRef<IntersectionObserver | null>(null);
  const fetchingRef = useRef(false);
  const cursorRef = useRef<FirestoreTimestamp | null>(null);
  const hasMoreRef = useRef(true);

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const fetchPending = useCallback(async () => {
    if (!hasMoreRef.current || fetchingRef.current) return;
    fetchingRef.current = true;
    const isFirstPage = cursorRef.current == null;
    if (isFirstPage) {
      setInitialLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const response = await getAdminPendingScheduledPosts(
        cursorRef.current ?? undefined
      );
      const data = response.data;
      const posts = data?.posts ?? [];
      setPendingPosts((prev) => [...prev, ...posts]);
      const next = data?.nextCursor ?? null;
      setCursor(next);
      if (!next) {
        setHasMore(false);
        hasMoreRef.current = false;
      }
    } catch {
      setPendingPosts([]);
      setHasMore(false);
      hasMoreRef.current = false;
    } finally {
      fetchingRef.current = false;
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const lastPostRef = useCallback(
    (node: HTMLLIElement | null) => {
      if (initialLoading) return;

      if (obserVerRef.current) obserVerRef.current.disconnect();

      obserVerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          fetchPending();
        }
      });

      if (node) obserVerRef.current.observe(node);
    },
    [initialLoading, fetchPending]
  );

  const handleAction = async (
    postId: string,
    action: string,
    userId: string,
    platform: string
  ) => {
    try {
      await performActionOnScheduledPost(postId, action, userId, platform);
      setPendingPosts([]);
      setCursor(null);
      cursorRef.current = null;
      setHasMore(true);
      hasMoreRef.current = true;
      fetchingRef.current = false;
      fetchPending();
    } catch (error) {
      console.log(error);
      alert('Failed to perform action on scheduled post');
    }
  };

  return (
    <div className="flex min-h-0 w-full flex-col">
      <div className="min-w-0 flex-1 pt-4 lg:pt-0">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            Monitoring
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600 ">
            Admin view of scheduled posts with status &quot;pending&quot;. Click
            a card to see full details.
          </p>
        </header>

        <section className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900  mb-4">
            Pending scheduled posts
          </h2>
          {initialLoading && pendingPosts.length === 0 ? (
            <div
              className="space-y-4"
              aria-busy="true"
              aria-label="Loading pending posts"
            >
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-zinc-200  bg-white  overflow-hidden animate-pulse"
                >
                  <div className="flex flex-col sm:flex-row gap-4 p-4">
                    <div className="sm:w-32 h-24 rounded-lg bg-zinc-200 dark:bg-zinc-700 shrink-0" />
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-full max-w-md" />
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-2/3" />
                      <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : pendingPosts.length === 0 ? (
            <p className="text-sm text-zinc-500  py-6 rounded-xl bg-zinc-50  border border-zinc-200  text-center">
              No pending scheduled posts.
            </p>
          ) : (
            <>
            <ul className="space-y-4">
              {pendingPosts.map((post, index) => {
                const scheduleAt = formatTimestamp(
                  post.scheduleAt as FirestoreTimestamp
                );
                const status = post.postStatus ?? 'pending';
                const itemProps = {
                  role: 'button' as const,
                  tabIndex: 0,
                  onClick: () => setSelectedPost(post),
                  onKeyDown: (e: KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedPost(post);
                    }
                  },
                  className:
                    'rounded-xl border border-zinc-200  bg-white  shadow-sm overflow-hidden cursor-pointer hover:border-zinc-300  transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 ',
                };
                const cardInner = (
                  <div className="flex flex-col sm:flex-row gap-4 p-4">
                    {post.imageUrl && (
                      <div className="sm:w-32 shrink-0">
                        <img
                          src={post.imageUrl}
                          alt=""
                          className="w-full h-24 object-cover rounded-lg bg-zinc-100 dark:bg-zinc-800"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-sm text-zinc-700  line-clamp-2">
                        {post.message || 'No message'}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 ">
                        <span className="font-medium capitalize">
                          {post.platform}
                        </span>
                        <span>Schedule: {scheduleAt}</span>
                        <span>{post.userName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-700 ">
                          {status}
                        </span>
                      </div>
                      <ActionButtons
                        size="card"
                        stopPropagation
                        onRegenerate={() =>
                          handleAction(
                            post.postId,
                            'regenerate',
                            post.userId,
                            post.platform
                          )
                        }
                        onAccept={() =>
                          handleAction(
                            post.postId,
                            'approve',
                            post.userId,
                            post.platform
                          )
                        }
                        onReject={() =>
                          handleAction(
                            post.postId,
                            'reject',
                            post.userId,
                            post.platform
                          )
                        }
                      />
                    </div>
                  </div>
                );
                if (index === pendingPosts.length - 1) {
                  return (
                    <li
                      key={post.postId}
                      ref={lastPostRef}
                      {...itemProps}
                    >
                      {cardInner}
                    </li>
                  );
                }
                return (
                  <li key={post.postId} {...itemProps}>
                    {cardInner}
                  </li>
                );
              })}
            </ul>
            {loadingMore && (
              <div
                className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 py-4 text-sm text-zinc-600"
                aria-busy="true"
                aria-live="polite"
                aria-label="Loading more posts"
              >
                <span
                  className="size-4 shrink-0 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600"
                  aria-hidden
                />
                Loading more…
              </div>
            )}
            </>
          )}
        </section>
      </div>

      {selectedPost && (
        <DetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onAction={(postId, action, platform) => handleAction(postId, action, selectedPost.userId, platform)}
          formatTimestamp={formatTimestamp}
        />
      )}
    </div>
  );
}

function DetailModal({
  post,
  onClose,
  onAction,
  formatTimestamp,
}: {
  post: PendingScheduledPost;
  onClose: () => void;
  onAction: (postId: string, action: string, platform: string) => void | Promise<unknown>;
  formatTimestamp: (ts: FirestoreTimestamp | null | undefined) => string;
}) {
  const scheduleAt = formatTimestamp(post.scheduleAt as FirestoreTimestamp);
  const createdAt = formatTimestamp(post.createdAt as FirestoreTimestamp);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
    >
      <div
        className="rounded-xl border border-zinc-200  bg-white  shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-zinc-200  flex items-center justify-between">
          <h2
            id="detail-modal-title"
            className="text-lg font-semibold text-zinc-900 "
          >
            Scheduled post details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700  focus:outline-none focus:ring-2 focus:ring-zinc-400"
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
            <div className=''>
              <p className="text-xs font-medium text-zinc-500 mb-1">
                Image
              </p>
              <img
                src={post.imageUrl}
                alt="Post"
                className="w-full max-h-64 object-contain rounded-lg bg-zinc-100 "
              />
              <div className='flex w-full justify-end'>
              <button className='bg-primary-blue flex mt-2 p-2 rounded-md text-white items-center gap-x-2'>
                <a href={post.imageUrl} target="_blank">Open in New Tab</a>
                <ExternalLink className='w-4 h-4'/>
              </button>
              </div>
            </div>
          )}
          <DetailRow label="Caption / Message" value={post.message || '—'} />
          <DetailRow label="User name" value={post.userName || '—'} />
          <DetailRow label="Email" value={post.userEmail || '—'} />
          <DetailRow
            label="Business DNA"
            value={post.businessDNA || '—'}
            long
          />
          <DetailRow label="Schedule at" value={scheduleAt} />
          <DetailRow label="Created at" value={createdAt} />
          <DetailRow label="Post status" value={post.postStatus ?? '—'} />
          <DetailRow label="Platform" value={post.platform ?? '—'} />
          <div className="pt-4 border-t border-zinc-200 ">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3">
              Actions
            </p>
            <ActionButtons
              size="modal"
              onRegenerate={() => onAction(post.postId, 'regenerate', post.platform)}
              onAccept={() => onAction(post.postId, 'accept', post.platform)}
              onReject={() => onAction(post.postId, 'reject', post.platform)}
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
      <p className="text-xs font-medium text-zinc-500  mb-0.5">
        {label}
      </p>
      <p
        className={`text-sm text-zinc-800 
          long ? 'whitespace-pre-wrap wrap-break-word' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}
