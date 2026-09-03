'use client';

import {
  getScheduledPosts,
  ScheduledPostsPageCursor,
} from '@/src/service/api/social.servce';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Calendar,
  ExternalLink,
  Info,
  Loader2,
  Search,
  Sparkles,
} from 'lucide-react';
import { performActionByUserOnScheduledPost } from '@/src/service/api/userService';
import { GenerationResearchDialog } from '@/components/generation-research-dialog';
import {
  hasViewableResearch,
  parseGenerationResearchFromProof,
} from '@/lib/generation-research';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import { isPlanInactive } from '@/lib/plan-access';
import { showErrorToast } from '@/lib/show-error-toast';
import { cn } from '@/lib/utils';
import { lockBodyScroll } from '@/lib/body-scroll-lock';
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
import { Button } from '@/components/ui/button';
import { PostMediaPreview } from '@/components/shared/PostMediaPreview';
import {
  hasSchedulableMediaPreview,
  resolveSchedulableMediaPreview,
} from '@/lib/post-media-preview';
import {
  SCHEDULED_POST_REGENERATE_CREDIT,
  canScheduledPostRegenerate,
  willScheduledPostRegenChargeCredits,
} from '@/lib/scheduled-post-regenerate';

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
  lifecycle: string;
  approval?: { status?: string; stage?: string; actor?: string };
  publication?: { lastError?: string | null; errors?: string[] | null };
  mediaType?: 'image' | 'video' | 'carousel' | string | null;
  imageUrl: string | null;
  videoUrl?: string | null;
  videoPosterUrl?: string | null;
  schedule: { at: FirestoreTimestamp };
  platform: string;
  createdAt: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
  GeneratedBy?: string;
  /** Only AI Manager posts support regenerate (matches scheduled-posts page). */
  generatedByAiEngine?: boolean;
  generationProof?: unknown;
  /**
   * Mirrors `users/{uid}/scheduledPosts/{postId}.regenratedCount` (typo
   * preserved to match the Firestore field). The backend initializes it to
   * `1` when AI Manager first writes the post, increments by `1` on every
   * user-initiated regen, and only deducts credits once the count has rolled
   * past the first free slot — see
   * `backend/apps/worker/src/pipelines/ai-engine/regenerate/regenerate_scheduled_post.ts`.
   * The UI consults this so the cost preview matches what the worker will
   * actually charge.
   */
  regenratedCount?: number;
};

type ApprovalAction = 'regenerate' | 'approve' | 'reject';

function ApprovalActionButtons({
  size,
  onRegenerate,
  onAccept,
  onReject,
  stopPropagation,
  disabled,
  regenChargesCredits,
  showRegenerate = true,
}: {
  size: 'card' | 'modal';
  onRegenerate?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  stopPropagation?: boolean;
  disabled?: boolean;
  /** When true, the next regen will deduct credits — surface that on the
   *  button so the user isn't surprised after clicking. */
  regenChargesCredits?: boolean;
  showRegenerate?: boolean;
}) {
  const handle = (fn: (() => void) | undefined, e: MouseEvent) => {
    if (disabled) return;
    if (stopPropagation) e.stopPropagation();
    fn?.();
  };
  const isCard = size === 'card';
  const btn = isCard
    ? 'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-expo focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:text-quaternary disabled:pointer-events-none'
    : 'rounded-lg px-4 py-2.5 text-sm font-medium transition-expo focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:text-quaternary disabled:pointer-events-none';
  return (
    <div
      className={`flex items-center gap-3 ${!isCard ? 'flex-wrap' : 'flex-wrap'}`}
      aria-busy={disabled ? true : undefined}
    >
      {showRegenerate ? (
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => handle(onRegenerate, e)}
          title={
            regenChargesCredits
              ? `Next regeneration will deduct ${SCHEDULED_POST_REGENERATE_CREDIT} credit`
              : undefined
          }
          className={`${btn} bg-warning text-default cursor-pointer  hover:bg-warning focus:ring-[var(--border-warning)] ${regenChargesCredits ? 'inline-flex flex-col items-center justify-center gap-0.5 text-center' : ''}`}
        >
          <span>Regenerate {!regenChargesCredits && 'Free'}</span>
          {regenChargesCredits ? (
            <span
              className={
                isCard
                  ? 'max-w-44 text-[9px] font-normal leading-snug text-default '
                  : 'max-w-56 text-[11px] font-normal leading-snug text-default '
              }
            >
              {`${SCHEDULED_POST_REGENERATE_CREDIT} credit will be deducted`}
            </span>
          ) : null}
        </button>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => handle(onAccept, e)}
        className={`${btn} bg-success text-success hover:bg-success focus:ring-[var(--border-success)]`}
      >
        Accept
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => handle(onReject, e)}
        className={`${btn} bg-[var(--red-9)] text-danger cursor-pointer hover:bg-danger focus:ring-[var(--border-danger)]`}
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
  isRegenerating,
  actionsAllowed = true,
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
  /** Set while the worker is regenerating this post. The card stays in the
   *  grid so the user knows the click landed, but actions + click-to-open are
   *  disabled and a spinner overlay covers the (now stale) image. */
  isRegenerating: boolean;
  /** False when plan is expired / non-subscribed — hide mutative actions. */
  actionsAllowed?: boolean;
}) {
  const status = getDisplayStatus(post);
  const generatedBy = generatedByLabel(post.GeneratedBy);
  const regenChargesCredits = willScheduledPostRegenChargeCredits(post);
  const showRegenerate =
    post.generatedByAiEngine === true && canScheduledPostRegenerate(post);
  const showActions = status.variant !== 'failed' && actionsAllowed;
  const mediaPreview = resolveSchedulableMediaPreview(post);
  const hasMedia = hasSchedulableMediaPreview(mediaPreview);
  const previewUrl = mediaPreview.isVideo
    ? mediaPreview.videoUrl
    : mediaPreview.imageUrl;
  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={isRegenerating ? -1 : 0}
      aria-busy={isRegenerating || undefined}
      aria-disabled={isRegenerating || undefined}
      onClick={isRegenerating ? undefined : onSelect}
      onKeyDown={(e) => {
        if (isRegenerating) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        'group relative flex min-w-0 flex-col rounded-2xl border border-default bg-default p-4',
        'transition-expo',
        isRegenerating
          ? 'cursor-not-allowed'
          : 'hover:border-strong hover:bg-element/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strong'
      )}
    >
      <div className="relative mb-3 overflow-hidden rounded-xl border border-default bg-element aspect-4/3">
        {hasMedia ? (
          <PostMediaPreview
            preview={mediaPreview}
            className="h-full w-full object-cover transition-transform duration-300"
            videoClassName="h-full w-full object-cover"
            controls={mediaPreview.isVideo}
            muted
          />
        ) : (
          <div className="flex h-full min-h-[140px] items-center justify-center text-sm text-secondary">
            No media
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
              className="inline-flex items-center gap-1 rounded-md border border-default bg-default px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-default backdrop-blur"
              title={`Generated by: ${generatedBy}`}
            >
              <Sparkles className="h-3 w-3 text-link" />
              <span className="truncate">{generatedBy}</span>
            </span>
          </div>
        ) : null}
        {previewUrl && !isRegenerating && !mediaPreview.isVideo ? (
          <div className="absolute bottom-2 right-2">
            <ImagePreviewButton
              variant="overlay-icon"
              stopPropagation
              onClick={() => onPreviewImage(previewUrl, 'Scheduled post image')}
            />
          </div>
        ) : null}
        {isRegenerating ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-default backdrop-blur-sm"
            aria-live="polite"
          >
            <Loader2 className="h-6 w-6 animate-spin text-link" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide text-default">
              Regenerating…
            </span>
            <span className="px-3 text-center text-[11px] leading-snug text-secondary">
              Generating a new version…
            </span>
          </div>
        ) : null}
      </div>

      <p className="line-clamp-3 text-sm font-medium leading-snug text-default">
        {post.message || (
          <span className="text-secondary italic">No caption</span>
        )}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-link" />
          <span className="truncate">{scheduleAt}</span>
        </span>
        {post.platform ? (
          <>
            <span className="text-secondary">·</span>
            <span className="text-secondary">{post.platform}</span>
          </>
        ) : null}
      </div>

      {status.reason ? (
        <p
          className="mt-2 line-clamp-2 rounded-md border border-danger bg-danger px-2 py-1 text-[11px] leading-snug text-danger"
          title={status.reason}
        >
          <span className="font-semibold">Reason: </span>
          {status.reason}
        </p>
      ) : null}

      <div className="mt-3 space-y-2">
        {showActions ? (
          <ApprovalActionButtons
            size="card"
            stopPropagation
            disabled={actionDisabled || isRegenerating}
            showRegenerate={showRegenerate}
            onRegenerate={onRegenerate}
            onAccept={onAccept}
            onReject={onReject}
            regenChargesCredits={regenChargesCredits}
          />
        ) : null}
        <p className="text-[11px] text-secondary group-hover:text-secondary">
          {isRegenerating
            ? 'Regeneration in progress'
            : 'Click for full details'}
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
    <div className={long ? 'min-w-0' : undefined}>
      <p className="text-xs font-medium text-secondary mb-0.5">{label}</p>
      <p
        className={
          long
            ? 'text-sm text-default min-w-0 whitespace-pre-wrap wrap-break-word break-words [overflow-wrap:anywhere]'
            : 'text-sm text-default'
        }
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
  actionsAllowed = true,
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
  /** False when plan is expired / non-subscribed — hide mutative actions. */
  actionsAllowed?: boolean;
}) {
  const [researchOpen, setResearchOpen] = useState(false);
  const scheduleAt = formatTimestamp(post.schedule.at as FirestoreTimestamp);
  const createdAt = formatTimestamp(post.createdAt as FirestoreTimestamp);
  const status = getDisplayStatus(post);
  const generatedBy = generatedByLabel(post.GeneratedBy);
  const regenChargesCredits = willScheduledPostRegenChargeCredits(post);
  const showRegenerate =
    post.generatedByAiEngine === true && canScheduledPostRegenerate(post);
  const showActions = status.variant !== 'failed' && actionsAllowed;
  const research = parseGenerationResearchFromProof(post.generationProof);
  const showResearch = hasViewableResearch(research);
  const mediaPreview = resolveSchedulableMediaPreview(post);
  const hasMedia = hasSchedulableMediaPreview(mediaPreview);
  const openUrl = mediaPreview.isVideo
    ? mediaPreview.videoUrl
    : mediaPreview.imageUrl;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const releaseBodyScroll = lockBodyScroll();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      releaseBodyScroll();
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [onClose]);

  if (!mounted) return null;

  // Portal above the chat launcher (z-50) so action buttons receive clicks.
  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      style={{ minHeight: '100dvh' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
    >
      <div
        className="relative z-10 rounded-2xl border border-default bg-default text-default max-w-lg w-full max-h-[90vh] flex flex-col min-h-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 p-4 border-b border-default flex items-center justify-between gap-3">
          <h2 id="detail-modal-title" className="text-section text-default">
            Scheduled post details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-secondary hover:bg-hover hover:text-default focus:outline-none focus:ring-2 focus:ring-strong"
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
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pt-4 pb-10 space-y-4 overscroll-contain">
          {hasMedia ? (
            <div>
              <p className="text-xs font-medium text-secondary mb-1">
                {mediaPreview.isVideo ? 'Video' : 'Image'}
              </p>
              {mediaPreview.isVideo ? (
                <PostMediaPreview
                  preview={mediaPreview}
                  className="w-full max-h-64 object-contain rounded-xl bg-element border border-default"
                  videoClassName="w-full max-h-64 object-contain rounded-xl bg-black border border-default"
                  controls
                  muted={false}
                />
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    onPreviewImage(openUrl as string, 'Scheduled post image')
                  }
                  className="group relative block w-full overflow-hidden rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-strong"
                  aria-label="Open image preview"
                >
                  <PostMediaPreview
                    preview={mediaPreview}
                    className="w-full max-h-64 object-contain rounded-xl bg-element border border-default transition-transform duration-200"
                  />
                </button>
              )}
              {!mediaPreview.isVideo && openUrl ? (
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-4">
                  <ImagePreviewButton
                    onClick={() =>
                      onPreviewImage(openUrl, 'Scheduled post image')
                    }
                    className="rounded-lg border border-primary/30 bg-default text-link hover:bg-primary/10 hover:opacity-100 px-4 py-2"
                  />
                </div>
              ) : null}
              {openUrl ? (
                <div className="flex w-full justify-end">
                  <a
                    href={openUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 rounded-full btn-brand-fill px-3 py-2 text-sm font-medium"
                  >
                    Open in new tab
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}
          <DetailRow
            label="Caption / Message"
            value={post.message || '—'}
            long
          />
          <DetailRow label="Schedule at" value={scheduleAt} />
          <DetailRow label="Created at" value={createdAt} />
          <div>
            <p className="text-xs font-medium text-secondary mb-1">Status</p>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold',
                statusBadgeClasses(status.variant)
              )}
            >
              <StatusBadgeIcon
                variant={status.variant}
                className="h-3.5 w-3.5"
              />
              {status.label}
            </span>
            {status.variant === 'failed' ? (
              <p className="mt-2 whitespace-pre-wrap break-words rounded-lg border border-destructive/30 bg-destructive/15 p-2 text-xs text-destructive">
                <span className="font-semibold">Reason: </span>
                {status.reason ?? 'No failure reason recorded.'}
              </p>
            ) : null}
          </div>
          <DetailRow label="Platform" value={post.platform ?? '—'} />
          {generatedBy ? (
            <DetailRow label="Generated by" value={generatedBy} />
          ) : null}
          {showResearch ? (
            <div>
              <p className="text-xs font-medium text-secondary mb-2">
                Research
              </p>
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-primary/30 text-link hover:bg-primary/10"
                onClick={() => setResearchOpen(true)}
              >
                <Search className="mr-2 h-4 w-4" />
                View research
              </Button>
            </div>
          ) : null}
          {showActions ? (
            <div className="pt-4 border-t border-default">
              <p className="text-xs font-medium text-secondary mb-3">Actions</p>
              {regenChargesCredits ? (
                <div
                  className="mb-3 flex items-start gap-2 rounded-lg border border-warning bg-warning px-3 py-2 text-xs text-warning"
                  role="note"
                >
                  <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span className="leading-snug">
                    <span className="font-semibold">
                      {SCHEDULED_POST_REGENERATE_CREDIT} credit will be deducted
                    </span>{' '}
                    if you regenerate this post.
                  </span>
                </div>
              ) : null}
              <ApprovalActionButtons
                size="modal"
                disabled={actionLoading}
                showRegenerate={showRegenerate}
                onRegenerate={() =>
                  onAction(post.postId, 'regenerate', post.platform)
                }
                onAccept={() => onAction(post.postId, 'approve', post.platform)}
                onReject={() => onAction(post.postId, 'reject', post.platform)}
                regenChargesCredits={regenChargesCredits}
              />
            </div>
          ) : null}
        </div>
      </div>
      <GenerationResearchDialog
        open={researchOpen}
        onClose={() => setResearchOpen(false)}
        research={research}
      />
    </div>,
    document.body
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
  const planActionsAllowed = !isPlanInactive(billing);
  const fmtTimestamp = useTimestampFormatter();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const fetchingRef = useRef(false);
  const cursorRef = useRef<FirestoreTimestamp | null>(null);
  const hasMoreRef = useRef(true);
  const fetchPendingRef = useRef<() => Promise<void>>(async () => {});
  const imagePreview = useImagePreview();

  const needApproval = billing?.preferences.approvalMode === 'manual';

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
        cursor: cursorRef.current as unknown as
          | ScheduledPostsPageCursor
          | null
          | undefined,
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

  const [regeneratingPostIds, setRegeneratingPostIds] = useState<Set<string>>(
    () => new Set()
  );
  // Synchronous lock — React state updaters run async, so reading `accepted`// from inside setState always returned false and skipped the API call.
  const regeneratingPostIdsRef = useRef<Set<string>>(new Set());

  const markRegenerating = useCallback((postId: string) => {
    if (regeneratingPostIdsRef.current.has(postId)) return false;
    const next = new Set(regeneratingPostIdsRef.current);
    next.add(postId);
    regeneratingPostIdsRef.current = next;
    setRegeneratingPostIds(next);
    return true;
  }, []);

  const cancelRegeneration = useCallback((postId: string) => {
    if (!regeneratingPostIdsRef.current.has(postId)) return;
    const next = new Set(regeneratingPostIdsRef.current);
    next.delete(postId);
    regeneratingPostIdsRef.current = next;
    setRegeneratingPostIds(next);
  }, []);

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
      post.lifecycle === 'review_pending' &&
      post.approval?.status === 'pending' &&
      post.approval?.stage === 'user'
  );

  const handleAction = useCallback(
    async (postId: string, action: ApprovalAction, platform: string) => {
      if (!planActionsAllowed) {
        showErrorToast(
          'Your plan has expired. Renew to approve or reject posts.'
        );
        return;
      }
      if (!postId) {
        showErrorToast('Missing post id');
        return;
      }
      if (action === 'regenerate' && !platform) {
        showErrorToast('Missing platform for this post');
        return;
      }
      const target = pendingPosts.find((p) => p.postId === postId);
      if (action === 'regenerate' && target?.generatedByAiEngine !== true) {
        showErrorToast('Only AI Manager posts can be regenerated.');
        return;
      }

      // Approve / reject mutate the post's flags synchronously on the server,
      // so we optimistically pop the card out of the "needs my approval"
      // bucket and snapshot the previous list to roll back on failure.
      //
      // Regenerate runs synchronously on the server; keep the card visible
      // with a "Regenerating…" overlay via `regeneratingPostIds`.
      const previousPosts = pendingPosts;
      const previousSelected = selectedPost;
      const isRegen = action === 'regenerate';

      if (!isRegen) {
        setPendingPosts((prev) => prev.filter((p) => p.postId !== postId));
        if (selectedPost?.postId === postId) {
          setSelectedPost(null);
        }
      } else {
        if (!markRegenerating(postId)) return;
        if (selectedPost?.postId === postId) {
          setSelectedPost(null);
        }
      }

      setActingPostId(postId);
      try {
        await performActionByUserOnScheduledPost(postId, action, platform);
        if (!isRegen) {
          void silentRefresh();
        } else {
          await silentRefresh();
        }
      } catch {
        showErrorToast(
          'Failed to perform action on scheduled post. Please try again later.'
        );
        if (isRegen) {
          cancelRegeneration(postId);
        } else {
          setPendingPosts(previousPosts);
          if (previousSelected?.postId === postId) {
            setSelectedPost(previousSelected);
          }
        }
      } finally {
        if (isRegen) {
          cancelRegeneration(postId);
        }
        setActingPostId(null);
      }
    },
    [
      pendingPosts,
      selectedPost,
      silentRefresh,
      markRegenerating,
      cancelRegeneration,
      planActionsAllowed,
    ]
  );

  if (!needApproval) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-secondary">
        Approval is not enabled. Please enable it in the
        <Link href="/settings/autopilot-preference" className="text-info">
          Automation Preferences
        </Link>
      </div>
    );
  }

  /**
   * Globally lock action buttons only while a non-regen action (approve /
   * reject) is mid-flight — those mutate state synchronously and we don't
   * want concurrent decisions racing. Regen is fire-and-forget; the per-card
   * `isRegenerating` overlay handles its own disabled state, so other cards
   * stay actionable while one is regenerating.
   */
  const actionDisabled =
    actingPostId !== null && !regeneratingPostIds.has(actingPostId);

  return (
    <div className="mx-auto max-w-6xl animate-in fade-in duration-500">
      <div className="overflow-hidden rounded-3xl border border-default bg-default">
        <div className="px-6 pb-8 pt-8 sm:px-10 sm:pt-10">
          <header className="mb-8 max-w-2xl">
            <h1 className="text-page-title text-default">
              <span className="text-default">Approval</span>
            </h1>
            <p className="mt-3 text-base text-secondary">
              Review scheduled posts that need your approval. Accept to keep
              them in the queue, reject to discard them, or regenerate to get a
              fresh variation.
            </p>
          </header>

          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-subsection text-default">
              Pending scheduled posts for approval
            </h2>
            <p className="text-sm text-secondary">
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
                  className="flex flex-col rounded-2xl border border-default bg-default p-4"
                >
                  <div className="mb-3 aspect-4/3 animate-pulse rounded-xl bg-element" />
                  <div className="h-3 w-4/5 animate-pulse rounded bg-element" />
                  <div className="mt-2 h-3 w-3/5 animate-pulse rounded bg-element" />
                </div>
              ))}
            </div>
          ) : visiblePendingPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-default bg-element px-6 py-16 text-center">
              <Calendar className="mx-auto mb-3 h-10 w-10 text-link/60" />
              <p className="text-sm font-medium text-default">
                No posts waiting for your approval
              </p>
              <p className="mt-1 text-sm text-secondary">
                When new scheduled posts need your review, they will show up
                here as cards.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visiblePendingPosts.map((post, index) => {
                const scheduleAt = fmtTimestamp(
                  post.schedule.at as FirestoreTimestamp
                );
                const isLast = index === visiblePendingPosts.length - 1;
                const isRegenerating = regeneratingPostIds.has(post.postId);
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
                    actionsAllowed={planActionsAllowed}
                    onPreviewImage={imagePreview.open}
                    isRegenerating={isRegenerating}
                  />
                );
              })}
            </div>
          )}

          {loadingMore && !initialLoading && (
            <div
              className="mt-8 flex items-center justify-center gap-2 rounded-xl border border-default bg-element py-4 text-sm text-secondary"
              aria-busy="true"
              aria-live="polite"
              aria-label="Loading more posts"
            >
              <span
                className="size-4 shrink-0 animate-spin rounded-full border-2 border-default border-t-primary-blue"
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
          actionsAllowed={planActionsAllowed}
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
