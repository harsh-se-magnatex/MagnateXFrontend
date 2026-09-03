'use client';

import {
  getAdminPendingScheduledPosts,
  performActionOnScheduledPost,
  type AdminPendingScheduledPostsTab,
} from '@/src/service/api/social.servce';
import { ExternalLink } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { showErrorToast } from '@/lib/show-error-toast';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import {
  useTimestampFormatter,
  useUserTimezone,
  type TimestampInput,
} from '@/lib/user-timezone';
import { PostMediaPreview } from '@/components/shared/PostMediaPreview';
import { CarouselSwipePreview } from '@/components/shared/CarouselSwipePreview';
import {
  hasSchedulableMediaPreview,
  resolveSchedulableMediaPreview,
} from '@/lib/post-media-preview';
import {
  ImagePreviewButton,
  ImagePreviewOverlay,
  useImagePreview,
} from '@/components/image-preview';
import { generatedByLabel } from '@/lib/scheduled-post-status';

type FirestoreTimestamp = {
  _seconds: number;
  _nanoseconds: number;
};

type MonitoringDateTab = AdminPendingScheduledPostsTab;

const TABS: readonly MonitoringDateTab[] = ['today', 'future'];

export type PendingScheduledPost = {
  postId: string;
  userId: string;
  userName: string;
  userEmail: string;
  businessDNA: string;
  message: string;
  mediaType?: 'image' | 'video' | string | null;
  imageUrl: string | null;
  videoUrl?: string | null;
  videoPosterUrl?: string | null;
  slideCount?: number | null;
  carouselSlides?: Array<{
    index?: number;
    imageUrl?: string | null;
    imageFilePath?: string | null;
    headline?: string | null;
  }> | null;
  scheduleAt: FirestoreTimestamp;
  platform: string;
  GeneratedBy?: string;
  postStatus: string;
  createdAt: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
  postedAt?: FirestoreTimestamp | null;
  failedAt?: FirestoreTimestamp | null;
  error?: string | null;
};

type TabState = {
  posts: PendingScheduledPost[];
  cursor: FirestoreTimestamp | null;
  hasMore: boolean;
  initialLoading: boolean;
  loadingMore: boolean;
  loaded: boolean;
};

const initialTabState = (): TabState => ({
  posts: [],
  cursor: null,
  hasMore: true,
  initialLoading: false,
  loadingMore: false,
  loaded: false,
});

const initialTabsState = (): Record<MonitoringDateTab, TabState> => ({
  today: initialTabState(),
  future: initialTabState(),
});

/**
 * Computes "today" boundaries in the user's preferred timezone, returned as
 * UTC epoch ms — what the backend uses to filter `scheduleAt`. Doing this
 * once at mount keeps the today/future buckets stable while the page is
 * open (refresh after midnight to re-bucket).
 */
function computeTodayBounds(tz: string): {
  todayStartMs: number;
  todayEndMs: number;
} {
  const now = new Date();
  const todayStr = formatInTimeZone(now, tz, 'yyyy-MM-dd');
  const todayStart = fromZonedTime(`${todayStr} 00:00:00`, tz);
  // Increment local calendar date — robust against DST transitions.
  const [y, m, d] = todayStr.split('-').map(Number);
  const tomorrowLocal = new Date(y, m - 1, d + 1);
  const yy = tomorrowLocal.getFullYear();
  const mm = String(tomorrowLocal.getMonth() + 1).padStart(2, '0');
  const dd = String(tomorrowLocal.getDate()).padStart(2, '0');
  const todayEnd = fromZonedTime(`${yy}-${mm}-${dd} 00:00:00`, tz);
  return { todayStartMs: todayStart.getTime(), todayEndMs: todayEnd.getTime() };
}

function ActionButtons({
  size,
  onRegenerate,
  onAccept,
  onReject,
  stopPropagation,
}: {
  size: 'card' | 'modal';
  onRegenerate?: (mode: 'image' | 'fresh-context') => void;
  onAccept?: () => void;
  onReject?: () => void;
  stopPropagation?: boolean;
}) {
  const [showRegenerationOptions, setShowRegenerationOptions] = useState(false);
  const handle = (fn: (() => void) | undefined, e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    fn?.();
  };
  const isCard = size === 'card';
  const btn = isCard
    ? 'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-expo focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-background'
    : 'rounded-lg px-4 py-2.5 text-sm font-semibold transition-expo focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background';
  return (
    <div className={`flex items-center gap-3 ${!isCard ? 'flex-wrap' : ''}`}>
      <button
        type="button"
         onClick={(e) => {
           if (stopPropagation) e.stopPropagation();
           setShowRegenerationOptions(true);
         }}
        className={`${btn} bg-[var(--amber-9)] text-default hover:bg-warning focus:ring-[var(--border-warning)]`}
      >
        Regenerate
      </button>
      <button
        type="button"
        onClick={(e) => handle(onAccept, e)}
        className={`${btn} bg-[var(--green-9)] text-white hover:bg-success focus:ring-[var(--border-success)]`}
      >
        Accept
      </button>
      {showRegenerationOptions ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Choose regeneration type" onClick={() => setShowRegenerationOptions(false)}>
          <div className="w-full max-w-md rounded-xl border border-default bg-default p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-default">Choose regeneration type</h3>
            <p className="mt-1 text-sm text-secondary">This admin action applies to the selected scheduled post.</p>
            <div className="mt-5 grid gap-3">
              <button type="button" className="rounded-lg border border-default p-3 text-left hover:bg-element" onClick={() => { setShowRegenerationOptions(false); onRegenerate?.('image'); }}>
                <span className="block font-semibold text-default">Image regeneration</span>
                <span className="mt-1 block text-xs text-secondary">Keep the existing content and prompt; create a new image.</span>
              </button>
              <button type="button" className="rounded-lg border border-warning p-3 text-left hover:bg-element" onClick={() => { setShowRegenerationOptions(false); onRegenerate?.('fresh-context'); }}>
                <span className="block font-semibold text-default">Whole new context &amp; prompt</span>
                <span className="mt-1 block text-xs text-secondary">Start fresh and replace this scheduled post in place.</span>
              </button>
            </div>
            <button type="button" className="mt-4 w-full rounded-lg border border-default px-3 py-2 text-sm text-secondary" onClick={() => setShowRegenerationOptions(false)}>Cancel</button>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={(e) => handle(onReject, e)}
        className={`${btn} bg-[var(--red-9)] text-white hover:bg-danger focus:ring-[var(--border-danger)]`}
      >
        Reject
      </button>
    </div>
  );
}

export default function MonitoringPage() {
  const tz = useUserTimezone();
  const fmtTimestamp = useTimestampFormatter();
  const todayBounds = useMemo(() => computeTodayBounds(tz), [tz]);

  const [tabsState, setTabsState] =
    useState<Record<MonitoringDateTab, TabState>>(initialTabsState);
  const [dateTab, setDateTab] = useState<MonitoringDateTab>('today');
  const [selectedPost, setSelectedPost] = useState<PendingScheduledPost | null>(
    null
  );

  const tabsStateRef = useRef(tabsState);
  const fetchingTabRef = useRef<Record<MonitoringDateTab, boolean>>({
    today: false,
    future: false,
  });
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    tabsStateRef.current = tabsState;
  }, [tabsState]);

  const fetchPending = useCallback(
    async (tab: MonitoringDateTab) => {
      if (fetchingTabRef.current[tab]) return;
      const current = tabsStateRef.current[tab];
      if (current.loaded && !current.hasMore) return;

      fetchingTabRef.current[tab] = true;
      const isFirstPage = current.cursor == null && !current.loaded;

      setTabsState((prev) => ({
        ...prev,
        [tab]: {
          ...prev[tab],
          initialLoading: isFirstPage,
          loadingMore: !isFirstPage,
        },
      }));

      try {
        const response = await getAdminPendingScheduledPosts({
          tab,
          todayStartMs: todayBounds.todayStartMs,
          todayEndMs: todayBounds.todayEndMs,
          lastScheduleAt: current.cursor ?? undefined,
        });
        const data = response?.data;
        const posts: PendingScheduledPost[] = data?.posts ?? [];
        const next: FirestoreTimestamp | null = data?.nextCursor ?? null;
        setTabsState((prev) => ({
          ...prev,
          [tab]: {
            ...prev[tab],
            posts: [...prev[tab].posts, ...posts],
            cursor: next,
            hasMore: next != null,
            initialLoading: false,
            loadingMore: false,
            loaded: true,
          },
        }));
      } catch {
        setTabsState((prev) => ({
          ...prev,
          [tab]: {
            ...prev[tab],
            hasMore: false,
            initialLoading: false,
            loadingMore: false,
            loaded: true,
          },
        }));
      } finally {
        fetchingTabRef.current[tab] = false;
      }
    },
    [todayBounds.todayEndMs, todayBounds.todayStartMs]
  );

  // Lazy-load each tab the first time the user lands on it.
  useEffect(() => {
    const current = tabsStateRef.current[dateTab];
    if (!current.loaded && !fetchingTabRef.current[dateTab]) {
      fetchPending(dateTab);
    }
  }, [dateTab, fetchPending]);

  const tabState = tabsState[dateTab];
  const visiblePosts = tabState.posts;

  const lastPostRef = useCallback(
    (node: HTMLLIElement | null) => {
      if (tabState.initialLoading) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          fetchPending(dateTab);
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [dateTab, fetchPending, tabState.initialLoading]
  );

  const removePostLocally = useCallback((postId: string) => {
    setTabsState((prev) => {
      let changed = false;
      const next: Record<MonitoringDateTab, TabState> = { ...prev };
      for (const t of TABS) {
        if (next[t].posts.some((p) => p.postId === postId)) {
          next[t] = {
            ...next[t],
            posts: next[t].posts.filter((p) => p.postId !== postId),
          };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const handleAction = useCallback(
    async (
      postId: string,
      action: string,
      userId: string,
      platform: string,
      regenerationMode?: 'image' | 'fresh-context'
    ) => {
      // Snapshot for rollback if the API call fails after we optimistically
      // popped the post from the UI.
      const previousState = tabsStateRef.current;
      removePostLocally(postId);
      setSelectedPost((prev) => (prev?.postId === postId ? null : prev));

      try {
        await performActionOnScheduledPost(
          postId, action, userId, platform, null, regenerationMode
        );
      } catch {
        showErrorToast(
          'Failed to perform action on scheduled post. Please try again later.'
        );
        setTabsState(previousState);
      }
    },
    [removePostLocally]
  );

  return (
    <div className="flex min-h-0 w-full flex-col">
      <div className="min-w-0 flex-1 pt-4 lg:pt-0">
        <header className="mb-8">
          <h1 className="text-page-title text-default">Monitoring</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-secondary">
            Admin view of scheduled posts with status &quot;pending&quot;. Click
            a card to see full details.
          </p>
        </header>

        <section className="mt-6 pt-6 border-t border-default">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-subsection text-default">
              Pending scheduled posts
            </h2>
            <div className="flex flex-wrap gap-1 rounded-xl border border-default bg-element p-1">
              {TABS.map((tab) => {
                const tCount = tabsState[tab].posts.length;
                const tHasMore = tabsState[tab].hasMore;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setDateTab(tab)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold capitalize transition-expo ${
                      dateTab === tab
                        ? 'bg-default text-default ring-1 ring-border'
                        : 'text-secondary hover:text-default'
                    }`}
                  >
                    {tab} ({tCount}
                    {tHasMore ? '+' : ''})
                  </button>
                );
              })}
            </div>
          </div>
          {tabState.initialLoading && visiblePosts.length === 0 ? (
            <div
              className="space-y-4"
              aria-busy="true"
              aria-label="Loading pending posts"
            >
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-default bg-default overflow-hidden animate-pulse"
                >
                  <div className="flex flex-col sm:flex-row gap-4 p-4">
                    <div className="sm:w-32 h-24 rounded-lg bg-element shrink-0" />
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="h-4 bg-element rounded w-full max-w-md" />
                      <div className="h-4 bg-element rounded w-2/3" />
                      <div className="h-6 bg-element rounded w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : visiblePosts.length === 0 ? (
            <div className="rounded-xl border border-default bg-element py-6 text-center">
              <p className="text-sm text-secondary">
                No {dateTab} pending scheduled posts.
              </p>
              {tabState.hasMore ? (
                <button
                  type="button"
                  onClick={() => fetchPending(dateTab)}
                  disabled={tabState.loadingMore}
                  className="mt-3 rounded-full border border-default bg-default px-4 py-2 text-xs font-semibold text-default transition-expo hover:bg-element disabled:pointer-events-none disabled:text-quaternary"
                >
                  {tabState.loadingMore
                    ? 'Loading more...'
                    : 'Load more pending posts'}
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <ul className="space-y-4">
                {visiblePosts.map((post, index) => {
                  const scheduleAt = fmtTimestamp(
                    post.scheduleAt as FirestoreTimestamp
                  );
                  const generatedBy = generatedByLabel(post.GeneratedBy);
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
                      'rounded-xl border border-default  bg-default  overflow-hidden cursor-pointer hover:border-default  transition-expo focus:outline-none focus:ring-2 focus:ring-strong ',
                  };
                  const cardInner = (
                    <div className="flex flex-col sm:flex-row gap-4 p-4">
                      {(() => {
                        const mediaPreview =
                          resolveSchedulableMediaPreview(post);
                        const carouselSlides = Array.isArray(
                          post.carouselSlides
                        )
                          ? post.carouselSlides
                              .map((slide, index) => ({
                                index: slide.index ?? index + 1,
                                imageUrl: String(slide.imageUrl ?? '').trim(),
                                headline: slide.headline ?? null,
                              }))
                              .filter((slide) => slide.imageUrl)
                          : [];
                        const isCarousel =
                          post.mediaType === 'carousel' ||
                          carouselSlides.length >= 2;
                        if (isCarousel && carouselSlides.length > 0) {
                          return (
                            <div
                              className="sm:w-32 shrink-0"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <CarouselSwipePreview
                                slides={carouselSlides}
                                imageClassName="h-24 rounded-lg object-cover"
                              />
                              <p className="mt-1 text-[10px] font-medium text-secondary">
                                {post.slideCount ?? carouselSlides.length}{' '}
                                slides
                              </p>
                            </div>
                          );
                        }
                        if (!hasSchedulableMediaPreview(mediaPreview)) {
                          return null;
                        }
                        return (
                          <div className="sm:w-32 shrink-0">
                            <PostMediaPreview
                              preview={mediaPreview}
                              className="w-full h-24 object-cover rounded-lg bg-element"
                              videoClassName="w-full h-24 object-cover rounded-lg bg-element"
                              controls={false}
                              muted
                            />
                            {generatedBy ? (
                              <div className="mt-2 inline-flex max-w-full items-center gap-1 rounded-md border border-default bg-default px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-default backdrop-blur">
                                <span
                                  className="truncate"
                                  title={`Generated by: ${generatedBy}`}
                                >
                                  {generatedBy}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="text-sm text-default line-clamp-2">
                          {post.message || 'No message'}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary">
                          <span className="font-medium capitalize">
                            {post.platform}
                          </span>
                          <span>Schedule: {scheduleAt}</span>
                          <span>{post.userName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-element px-2.5 py-0.5 text-xs font-semibold capitalize text-default ring-1 ring-inset ring-border">
                            {status}
                          </span>
                        </div>
                        <ActionButtons
                          size="card"
                          stopPropagation
                          onRegenerate={(mode) =>
                            handleAction(
                              post.postId,
                              'regenerate',
                              post.userId,
                              post.platform,
                              mode
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
                  if (index === visiblePosts.length - 1) {
                    return (
                      <li key={post.postId} ref={lastPostRef} {...itemProps}>
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
              {tabState.loadingMore && (
                <div
                  className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-default bg-element py-4 text-sm text-secondary"
                  aria-busy="true"
                  aria-live="polite"
                  aria-label="Loading more posts"
                >
                  <span
                    className="size-4 shrink-0 animate-spin rounded-full border-2 border-default border-t-primary-purple"
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
           onAction={(postId, action, platform, mode) =>
             handleAction(postId, action, selectedPost.userId, platform, mode)
          }
          formatTimestamp={fmtTimestamp}
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
  onAction: (
    postId: string,
    action: string,
    platform: string,
    regenerationMode?: 'image' | 'fresh-context'
  ) => void | Promise<unknown>;
  formatTimestamp: (ts: TimestampInput) => string;
}) {
  const scheduleAt = formatTimestamp(post.scheduleAt as FirestoreTimestamp);
  const createdAt = formatTimestamp(post.createdAt as FirestoreTimestamp);
  const mediaPreview = resolveSchedulableMediaPreview(post);
  const carouselSlides = Array.isArray(post.carouselSlides)
    ? post.carouselSlides
        .map((slide, index) => ({
          index: slide.index ?? index + 1,
          imageUrl: String(slide.imageUrl ?? '').trim(),
          headline: slide.headline ?? null,
        }))
        .filter((slide) => slide.imageUrl)
    : [];
  const isCarousel =
    post.mediaType === 'carousel' || carouselSlides.length >= 2;
  const hasMedia = hasSchedulableMediaPreview(mediaPreview);
  const openUrl = mediaPreview.isVideo
    ? mediaPreview.videoUrl
    : mediaPreview.imageUrl;
  const imagePreview = useImagePreview();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
    >
      <div
        className="rounded-xl border border-default bg-default max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-default flex items-center justify-between">
          <h2 id="detail-modal-title" className="text-section text-default">
            Scheduled post details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-secondary hover:bg-element hover:text-default focus:outline-none focus:ring-2 focus:ring-strong"
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
          {isCarousel && carouselSlides.length > 0 ? (
            <div>
              <p className="mb-1 text-xs font-medium text-secondary">
                Carousel · {post.slideCount ?? carouselSlides.length} slides
              </p>
              <CarouselSwipePreview
                slides={carouselSlides}
                showCaptions
                onImageClick={(url, alt) => imagePreview.open(url, alt)}
              />
            </div>
          ) : hasMedia && openUrl ? (
            <div className="">
              <p className="text-xs font-medium text-secondary mb-1">
                {mediaPreview.isVideo ? 'Video' : 'Image'}
              </p>
              <div className="relative">
                <PostMediaPreview
                  preview={mediaPreview}
                  className="w-full max-h-64 object-contain rounded-lg bg-element"
                  videoClassName="w-full max-h-64 object-contain rounded-lg bg-element"
                  controls={mediaPreview.isVideo}
                  muted={false}
                />
                {!mediaPreview.isVideo && mediaPreview.imageUrl ? (
                  <div className="absolute bottom-2 right-2">
                    <ImagePreviewButton
                      variant="overlay-icon"
                      stopPropagation
                      onClick={() =>
                        imagePreview.open(mediaPreview.imageUrl as string)
                      }
                    />
                  </div>
                ) : null}
              </div>
              <div className="flex w-full justify-end">
                <button className="bg-primary-blue flex mt-2 p-2 rounded-full text-white items-center gap-x-2">
                  <a href={openUrl} target="_blank" rel="noreferrer">
                    Open in New Tab
                  </a>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : null}
          <DetailRow label="Caption / Message" value={post.message || '—'} />
          <DetailRow label="User name" value={post.userName || '—'} />
          <DetailRow label="Email" value={post.userEmail || '—'} />
          <DetailRow label="Schedule at" value={scheduleAt} />
          <DetailRow label="Created at" value={createdAt} />
          <DetailRow label="Post status" value={post.postStatus ?? '—'} />
          <DetailRow label="Platform" value={post.platform ?? '—'} />
          {generatedByLabel(post.GeneratedBy) ? (
            <DetailRow
              label="Generated by"
              value={generatedByLabel(post.GeneratedBy) as string}
            />
          ) : null}
          <div className="pt-4 border-t border-default">
            <p className="text-xs font-medium text-secondary mb-3">Actions</p>
            <ActionButtons
              size="modal"
               onRegenerate={(mode) =>
                 onAction(post.postId, 'regenerate', post.platform, mode)
              }
              onAccept={() => onAction(post.postId, 'approve', post.platform)}
              onReject={() => onAction(post.postId, 'reject', post.platform)}
            />
          </div>
        </div>
      </div>
      <ImagePreviewOverlay
        src={imagePreview.previewUrl}
        alt={imagePreview.previewAlt}
        onClose={imagePreview.close}
      />
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
      <p className="text-xs font-medium text-secondary mb-0.5">{label}</p>
      <p
        className={`text-sm text-default ${long ? 'whitespace-pre-wrap wrap-break-word' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}
