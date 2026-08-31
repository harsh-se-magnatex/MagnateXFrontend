'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { useAuth } from '@/src/hooks/useAuth';
import {
  getScheduledPosts,
  getScheduledPostsInRange,
  type ScheduledPostsPageCursor,
  type ScheduledPostsTab,
} from '@/src/service/api/social.servce';
import { WORKSPACE_NAV_HREFS, workspacePageTitle } from '@/lib/workspace-nav';
import {
  hasSchedulableMediaPreview,
  resolveSchedulableMediaPreview,
} from '@/lib/post-media-preview';
import { PostMediaPreview } from '@/components/shared/PostMediaPreview';
import { CarouselSwipePreview } from '@/components/shared/CarouselSwipePreview';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  performActionByUserOnScheduledPost,
  removeScheduledPost,
} from '@/src/service/api/userService';
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LayoutGrid,
  Loader2,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format as formatDate,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfToday,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {
  generatedByLabel,
  getDisplayStatus,
  isUpcomingScheduledPost,
  statusBadgeClasses,
  StatusBadgeIcon,
} from '@/lib/scheduled-post-status';
import { cn } from '@/lib/utils';
import { lockBodyScroll } from '@/lib/body-scroll-lock';
import { showErrorToast } from '@/lib/show-error-toast';
import { Button } from '@/components/ui/button';
import { DownloadPngButton } from '@/components/download-png-button';
import { DownloadVideoButton } from '@/components/download-video-button';
import { SharePostButton } from '@/components/share-post-button';
import { GenerationResearchDialog } from '@/components/generation-research-dialog';
import {
  hasViewableResearch,
  parseGenerationResearchFromProof,
} from '@/lib/generation-research';
import {
  ImagePreviewButton,
  ImagePreviewOverlay,
  useImagePreview,
} from '@/components/image-preview';
import {
  SCHEDULED_POST_REGENERATE_CREDIT,
  canScheduledPostRegenerate,
  willScheduledPostRegenChargeCredits,
} from '@/lib/scheduled-post-regenerate';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import { isPlanInactive } from '@/lib/plan-access';
import {
  useTimestampFormatter,
  useUserTimezone,
  type TimestampInput,
} from '@/lib/user-timezone';

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
  lifecycle: string;
  approval?: { status?: string; stage?: string; actor?: string };
  publication?: { lastError?: string | null; errors?: string[] | null };
  imageUrl: string | null;
  mediaType?: 'image' | 'video' | 'carousel';
  videoUrl?: string | null;
  videoPosterUrl?: string | null;
  slideCount?: number | null;
  carouselSlides?: Array<{
    index?: number;
    imageUrl?: string | null;
    imageFilePath?: string | null;
    headline?: string | null;
    purpose?: string | null;
    visualType?: string | null;
  }> | null;
  schedule: { at: FirestoreTimestamp };
  platform: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  /**
   * Pipeline that produced this scheduled post — newly added on the backend
   * (`'ai-engine' | 'batch-generation' | 'events-post' | 'product-advert' | 'scheduler' | 'instant-generation'`).
   * Optional because older docs predate this field.
   */
  GeneratedBy?: string;
};

function dedupeScheduledPosts(posts: ScheduledPost[]): ScheduledPost[] {
  const byId = new Map<string, ScheduledPost>();
  for (const post of posts) {
    const id = post.postId;
    if (!id) continue;
    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, post);
      continue;
    }
    if (post.lifecycle === 'removed' || prev.lifecycle === 'removed') {
      byId.set(id, { ...prev, ...post, lifecycle: 'removed' });
    } else {
      byId.set(id, post);
    }
  }
  return Array.from(byId.values());
}

function ScheduledPostActionButtons({
  size,
  showRegenerate,
  regenChargesCredits,
  onRegenerate,
  onRemove,
  stopPropagation,
  disabled,
}: {
  size: 'card' | 'modal';
  showRegenerate: boolean;
  regenChargesCredits?: boolean;
  onRegenerate?: () => void;
  onRemove?: () => void;
  stopPropagation?: boolean;
  disabled?: boolean;
}) {
  const handle = (fn: (() => void) | undefined, e: MouseEvent) => {
    e.preventDefault();
    if (stopPropagation) e.stopPropagation();
    fn?.();
  };
  const isCard = size === 'card';
  const btn = isCard
    ? 'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-expo focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:text-quaternary disabled:pointer-events-none'
    : 'rounded-lg px-4 py-2.5 text-sm font-medium transition-expo focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:text-quaternary disabled:pointer-events-none';
  return (
    <div className={`flex items-center gap-3 ${!isCard ? 'flex-wrap' : ''}`}>
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
          className={`${btn} bg-warning text-default cursor-pointer hover:bg-warning focus:ring-[var(--border-warning)] ${regenChargesCredits ? 'inline-flex flex-col items-center justify-center gap-0.5 text-center' : ''}`}
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
        onClick={(e) => handle(onRemove, e)}
        className={`${btn} bg-[var(--red-9)] text-danger cursor-pointer hover:bg-danger focus:ring-[var(--border-danger)]`}
      >
        Remove
      </button>
    </div>
  );
}

/**
 * Mirrors the server-side definition of the "Upcoming" tab (see
 * `applyScheduledPostsTabFilter` in `automated_post.controller.ts`) so the
 * Regenerate / Remove buttons appear *only* on posts the user can still act
 * on — i.e. ones that are pending / processing / approved AND scheduled for
 * the future. The card/modal both consult this single helper so we can't
 * drift between rendering an action button and the backend silently
 * rejecting the action because the post is in a terminal state.
 *
 * Specifically excludes (no buttons):
 *   - posted (already published)
 *   - failed (terminal; regen wouldn't republish, remove is moot)
 *   - removed by you / admin (already gone)
 *   - rejected (user already said no)
 *   - past-due of any flavour (publish window missed)
 */
function isUpcomingPost(post: ScheduledPost): boolean {
  return isUpcomingScheduledPost(post);
}

function DetailModal({
  post,
  onClose,
  formatTimestamp,
  onRegenerate,
  onRemove,
  actionDisabled,
  onPreviewImage,
  isRegenerating,
  actionsAllowed = true,
}: {
  post: ScheduledPost;
  onClose: () => void;
  formatTimestamp: (ts: TimestampInput) => string;
  onRegenerate: () => void;
  onRemove: () => void;
  actionDisabled: boolean;
  onPreviewImage: (url: string, alt?: string) => void;
  isRegenerating: boolean;
  /** False when plan is expired / non-subscribed — hide mutative actions. */
  actionsAllowed?: boolean;
}) {
  const [researchOpen, setResearchOpen] = useState(false);
  const scheduleAt = formatTimestamp(post.schedule.at as FirestoreTimestamp);
  const createdAt = formatTimestamp(post.createdAt as FirestoreTimestamp);
  const showRegenerate =
    post.generatedByAiEngine === true && canScheduledPostRegenerate(post);
  const regenChargesCredits = willScheduledPostRegenChargeCredits(post);
  const showPostActions = isUpcomingPost(post) && actionsAllowed;
  const status = getDisplayStatus(post);
  const generatedBy = generatedByLabel(post.GeneratedBy);
  const research = parseGenerationResearchFromProof(post.generationProof);
  const showResearch = hasViewableResearch(research);
  const mediaPreview = resolveSchedulableMediaPreview(post);
  const hasMedia = hasSchedulableMediaPreview(mediaPreview);
  const carouselSlides = Array.isArray(post.carouselSlides)
    ? post.carouselSlides
        .map((s, i) => ({
          index: s.index ?? i + 1,
          imageUrl: String(s.imageUrl ?? '').trim(),
          headline: s.headline ?? null,
        }))
        .filter((s) => s.imageUrl)
    : [];
  const isCarousel =
    post.mediaType === 'carousel' || carouselSlides.length >= 2;
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

  // Portal above the chat launcher (also z-50) so Regenerate/Remove clicks
  // actually hit the buttons — same pattern as admin content-calendar review.
  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      style={{ minHeight: '100dvh' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
      aria-busy={isRegenerating || undefined}
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
          {isCarousel && carouselSlides.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-secondary mb-1">
                Carousel
                {post.slideCount
                  ? ` · ${post.slideCount} slides`
                  : ` · ${carouselSlides.length} slides`}
              </p>
              <div className="relative overflow-hidden rounded-xl">
                <CarouselSwipePreview
                  slides={carouselSlides}
                  showCaptions
                  onImageClick={isRegenerating ? undefined : onPreviewImage}
                />
                {isRegenerating ? (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/75 backdrop-blur-sm"
                    aria-live="polite"
                  >
                    <Loader2
                      className="h-8 w-8 animate-spin text-link"
                      aria-hidden
                    />
                    <span className="text-sm font-semibold uppercase tracking-wide text-default">
                      Regenerating…
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : hasMedia ? (
            <div>
              <p className="text-xs font-medium text-secondary mb-1">
                {mediaPreview.isVideo ? 'Video' : 'Image'}
              </p>
              <div className="relative overflow-hidden rounded-xl">
                {mediaPreview.isVideo ? (
                  <PostMediaPreview
                    preview={mediaPreview}
                    controls
                    muted={false}
                    videoClassName="w-full max-h-64 object-contain rounded-xl bg-black border border-default"
                  />
                ) : (
                  <button
                    type="button"
                    disabled={isRegenerating}
                    onClick={() =>
                      onPreviewImage(
                        mediaPreview.imageUrl as string,
                        'Scheduled post image'
                      )
                    }
                    className="group relative block w-full overflow-hidden rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-strong disabled:cursor-not-allowed"
                    aria-label="Open image preview"
                  >
                    <PostMediaPreview
                      preview={mediaPreview}
                      imageClassName="w-full max-h-64 object-contain rounded-xl bg-element border border-default transition-transform duration-200"
                    />
                  </button>
                )}
                {isRegenerating ? (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/75 backdrop-blur-sm"
                    aria-live="polite"
                  >
                    <Loader2
                      className="h-8 w-8 animate-spin text-link"
                      aria-hidden
                    />
                    <span className="text-sm font-semibold uppercase tracking-wide text-default">
                      Regenerating…
                    </span>
                  </div>
                ) : null}
              </div>
              {!isRegenerating ? (
                <>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-4">
                    {!mediaPreview.isVideo && mediaPreview.imageUrl ? (
                      <ImagePreviewButton
                        onClick={() =>
                          onPreviewImage(
                            mediaPreview.imageUrl as string,
                            'Scheduled post image'
                          )
                        }
                        className="rounded-lg border border-primary/30 bg-default text-link hover:bg-primary/10 hover:opacity-100 px-4 py-2"
                      />
                    ) : null}
                    {mediaPreview.isVideo && mediaPreview.videoUrl ? (
                      <DownloadVideoButton
                        url={mediaPreview.videoUrl}
                        getFilename={() =>
                          `scheduled-${post.platform ?? 'post'}-${Date.now()}.mp4`
                        }
                      />
                    ) : (
                      <>
                        <DownloadPngButton
                          url={mediaPreview.imageUrl as string}
                          getFilename={() =>
                            `scheduled-${post.platform ?? 'post'}-${Date.now()}.png`
                          }
                        />
                        {mediaPreview.imageUrl ? (
                          <SharePostButton
                            imageUrl={mediaPreview.imageUrl}
                            caption={post.message}
                            platform={post.platform}
                            getFilename={() =>
                              `scheduled-${post.platform ?? 'post'}-${Date.now()}.png`
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--green-9)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition disabled:text-quaternary"
                          />
                        ) : null}
                      </>
                    )}
                  </div>
                  <div className="flex w-full justify-end">
                    <a
                      href={
                        mediaPreview.isVideo
                          ? (mediaPreview.videoUrl ?? '#')
                          : (mediaPreview.imageUrl ?? '#')
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-2 rounded-full btn-brand-fill px-3 py-2 text-sm font-medium"
                    >
                      Open in new tab
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-xs text-secondary">
                  Regeneration in progress — new media and caption will appear
                  when ready.
                </p>
              )}
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
          {showPostActions ? (
            <div className="pt-4 border-t border-default">
              <p className="text-xs font-medium text-secondary mb-3">Actions</p>
              <ScheduledPostActionButtons
                size="modal"
                showRegenerate={showRegenerate}
                regenChargesCredits={regenChargesCredits}
                onRegenerate={onRegenerate}
                onRemove={onRemove}
                disabled={actionDisabled || isRegenerating}
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

function ScheduledPostCard({
  post,
  scheduleAt,
  onSelect,
  cardRef,
  onRegenerate,
  onRemove,
  actionDisabled,
  onPreviewImage,
  isRegenerating,
  actionsAllowed = true,
}: {
  post: ScheduledPost;
  scheduleAt: string;
  onSelect: () => void;
  cardRef?: (node: HTMLDivElement | null) => void;
  onRegenerate: () => void;
  onRemove: () => void;
  actionDisabled: boolean;
  onPreviewImage: (url: string, alt?: string) => void;
  isRegenerating: boolean;
  /** False when plan is expired / non-subscribed — hide mutative actions. */
  actionsAllowed?: boolean;
}) {
  const showRegenerate =
    post.generatedByAiEngine === true && canScheduledPostRegenerate(post);
  const regenChargesCredits = willScheduledPostRegenChargeCredits(post);
  const showPostActions = isUpcomingPost(post) && actionsAllowed;
  const status = getDisplayStatus(post);
  const generatedBy = generatedByLabel(post.GeneratedBy);
  const mediaPreview = resolveSchedulableMediaPreview(post);
  const hasMedia = hasSchedulableMediaPreview(mediaPreview);
  const slideCount =
    post.mediaType === 'carousel'
      ? (post.slideCount ??
        (Array.isArray(post.carouselSlides)
          ? post.carouselSlides.length
          : null))
      : null;
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
            videoClassName="h-full w-full object-cover bg-black"
            imageClassName="h-full w-full object-cover transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full min-h-[140px] items-center justify-center text-sm text-secondary">
            No media
          </div>
        )}
        {slideCount && slideCount > 1 ? (
          <div className="absolute left-2 bottom-2">
            <span className="inline-flex items-center rounded-md border border-default bg-default px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-default backdrop-blur">
              {slideCount} slides
            </span>
          </div>
        ) : null}
        {!mediaPreview.isVideo && mediaPreview.imageUrl && !isRegenerating ? (
          <div className="absolute bottom-2 right-2">
            <ImagePreviewButton
              variant="overlay-icon"
              stopPropagation
              onClick={() =>
                onPreviewImage(
                  mediaPreview.imageUrl as string,
                  'Scheduled post image'
                )
              }
            />
          </div>
        ) : null}
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
        {isRegenerating ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-default backdrop-blur-sm"
            aria-live="polite"
          >
            <Loader2 className="h-6 w-6 animate-spin text-link" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide text-default">
              Regenerating…
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

      <div className="mt-2 space-y-2">
        {showPostActions ? (
          <ScheduledPostActionButtons
            size="card"
            showRegenerate={showRegenerate}
            regenChargesCredits={regenChargesCredits}
            stopPropagation
            onRegenerate={onRegenerate}
            onRemove={onRemove}
            disabled={actionDisabled || isRegenerating}
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

type CalendarMode = 'month' | 'week';

type CalendarFmt = (
  input: TimestampInput,
  options?: { format?: string }
) => string;

/**
 * Compute the visible [from, to] window for the calendar in milliseconds.
 * Month mode covers the full 6-week grid (Sun of week containing day 1 → Sat
 * of week containing the last day). Week mode covers Sun → Sat of the cursor
 * week. The range is the unit of caching and fetching so we never read posts
 * the user can't see.
 */
function calendarVisibleRange(
  mode: CalendarMode,
  cursor: Date
): { fromMs: number; toMs: number } {
  const opts = { weekStartsOn: 0 as const };
  if (mode === 'month') {
    const from = startOfWeek(startOfMonth(cursor), opts);
    const to = endOfWeek(endOfMonth(cursor), opts);
    return { fromMs: from.getTime(), toMs: to.getTime() };
  }
  const from = startOfWeek(cursor, opts);
  const to = endOfWeek(cursor, opts);
  return { fromMs: from.getTime(), toMs: to.getTime() };
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Group posts by their scheduled date (in the user's preferred timezone) and
 * sort each bucket chronologically. Used by both month and week bodies so
 * event chips render in the same order Google Calendar stacks them.
 */
function usePostsByDate(posts: ScheduledPost[], fmtTimestamp: CalendarFmt) {
  return useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    for (const post of posts) {
      const key = fmtTimestamp(post.schedule.at, { format: 'yyyy-MM-dd' });
      if (!key || key === '—') continue;
      const arr = map.get(key) ?? [];
      arr.push(post);
      map.set(key, arr);
    }
    map.forEach((bucket) => {
      bucket.sort((a, b) => {
        const ka = fmtTimestamp(a.schedule.at, { format: 'HHmm' });
        const kb = fmtTimestamp(b.schedule.at, { format: 'HHmm' });
        return ka.localeCompare(kb);
      });
    });
    return map;
  }, [posts, fmtTimestamp]);
}

function CalendarEventChip({
  post,
  time,
  onSelect,
  size = 'sm',
  isRegenerating = false,
}: {
  post: ScheduledPost;
  time: string;
  onSelect: () => void;
  size?: 'sm' | 'md';
  isRegenerating?: boolean;
}) {
  const status = getDisplayStatus(post);
  const caption = (post.message || 'No caption').trim();
  const mediaPreview = resolveSchedulableMediaPreview(post);
  const hasMedia = hasSchedulableMediaPreview(mediaPreview);
  const isMd = size === 'md';
  return (
    <button
      type="button"
      onClick={onSelect}
      title={
        isRegenerating
          ? `Regenerating… · ${time} · ${caption}`
          : `${time} · ${caption}`
      }
      aria-busy={isRegenerating || undefined}
      className={cn(
        'group relative flex w-full items-center gap-1.5 rounded-full border text-left transition-expo focus:outline-none focus:ring-2 focus:ring-strong hover:bg-hover',
        isMd ? 'px-1.5 py-1.5 text-xs' : 'px-1 py-1 text-[11px]',
        statusBadgeClasses(status.variant)
      )}
    >
      {hasMedia ? (
        <span
          className={cn(
            'relative shrink-0 overflow-hidden rounded ring-1 ring-border/60',
            isMd ? 'h-10 w-10' : 'h-7 w-7'
          )}
        >
          <PostMediaPreview
            preview={mediaPreview}
            videoClassName="h-full w-full object-cover bg-black"
            imageClassName="h-full w-full object-cover"
          />
          {isRegenerating ? (
            <span className="absolute inset-0 flex items-center justify-center bg-default backdrop-blur-[1px]">
              <Loader2
                className={cn(
                  'animate-spin text-link',
                  isMd ? 'h-4 w-4' : 'h-3 w-3'
                )}
                aria-hidden
              />
            </span>
          ) : null}
        </span>
      ) : (
        <span
          className={cn(
            'relative flex shrink-0 items-center justify-center rounded bg-element font-semibold text-secondary ring-1 ring-border/60',
            isMd ? 'h-10 w-10 text-[11px]' : 'h-7 w-7 text-[10px]'
          )}
        >
          {(post.platform ?? '?').slice(0, 2).toUpperCase()}
          {isRegenerating ? (
            <span className="absolute inset-0 flex items-center justify-center bg-default">
              <Loader2
                className={cn(
                  'animate-spin text-link',
                  isMd ? 'h-4 w-4' : 'h-3 w-3'
                )}
                aria-hidden
              />
            </span>
          ) : null}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate font-semibold">
          {isRegenerating ? 'Regenerating…' : time}
        </span>
        <span
          className={cn(
            'truncate opacity-90',
            isMd && 'line-clamp-2 whitespace-normal'
          )}
        >
          {isRegenerating ? 'New image in progress' : caption}
        </span>
      </span>
    </button>
  );
}

function CalendarMonthBody({
  cursor,
  postsByDate,
  today,
  onSelectPost,
  fmtTimestamp,
  selectedDateKey,
  onJumpToWeek,
  regeneratingPostIds,
}: {
  cursor: Date;
  postsByDate: Map<string, ScheduledPost[]>;
  today: Date;
  onSelectPost: (post: ScheduledPost) => void;
  fmtTimestamp: CalendarFmt;
  selectedDateKey: string;
  onJumpToWeek: (day: Date) => void;
  regeneratingPostIds: Set<string>;
}) {
  const cells = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    const out: Date[] = [];
    let cur = start;
    while (cur <= end) {
      out.push(cur);
      cur = addDays(cur, 1);
    }
    return out;
  }, [cursor]);

  return (
    <>
      <div className="grid grid-cols-7 border-b border-default bg-element text-[11px] font-semibold uppercase tracking-wider text-secondary">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-2 text-center">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          const dayKey = formatDate(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, today);
          const isSelectedDay = !!selectedDateKey && selectedDateKey === dayKey;
          const dayPosts = postsByDate.get(dayKey) ?? [];
          const visiblePosts = dayPosts.slice(0, 3);
          const moreCount = dayPosts.length - visiblePosts.length;
          const isLastColumn = (idx + 1) % 7 === 0;
          const isLastRow = idx >= cells.length - 7;
          return (
            <div
              key={dayKey}
              className={cn(
                'flex min-h-[112px] flex-col gap-1 border-default p-1.5 transition-expo',
                !isLastColumn && 'border-r',
                !isLastRow && 'border-b',
                inMonth ? 'bg-default' : 'bg-element',
                isSelectedDay && 'bg-primary/5'
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold',
                    isToday
                      ? 'bg-primary text-link-foreground'
                      : inMonth
                        ? 'text-default'
                        : 'text-secondary'
                  )}
                >
                  {formatDate(day, 'd')}
                </span>
                {dayPosts.length > 0 ? (
                  <span className="text-[10px] font-medium text-secondary">
                    {dayPosts.length}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-1 flex-col gap-1">
                {visiblePosts.map((post, postIdx) => {
                  const time = fmtTimestamp(post.schedule.at, {
                    format: 'HH:mm',
                  });
                  return (
                    <CalendarEventChip
                      key={post.postId ?? `${dayKey}-${postIdx}`}
                      post={post}
                      time={time}
                      onSelect={() => onSelectPost(post)}
                      isRegenerating={
                        !!post.postId && regeneratingPostIds.has(post.postId)
                      }
                    />
                  );
                })}
                {moreCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => onJumpToWeek(day)}
                    className="self-start rounded px-1 text-[10px] font-semibold text-link hover:underline"
                  >
                    +{moreCount} more
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function CalendarWeekBody({
  cursor,
  postsByDate,
  today,
  onSelectPost,
  fmtTimestamp,
  selectedDateKey,
  regeneratingPostIds,
}: {
  cursor: Date;
  postsByDate: Map<string, ScheduledPost[]>;
  today: Date;
  onSelectPost: (post: ScheduledPost) => void;
  fmtTimestamp: CalendarFmt;
  selectedDateKey: string;
  regeneratingPostIds: Set<string>;
}) {
  const days = useMemo(() => {
    const start = startOfWeek(cursor, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursor]);

  return (
    <div className="grid grid-cols-7">
      {days.map((day, idx) => {
        const dayKey = formatDate(day, 'yyyy-MM-dd');
        const isToday = isSameDay(day, today);
        const isSelectedDay = !!selectedDateKey && selectedDateKey === dayKey;
        const dayPosts = postsByDate.get(dayKey) ?? [];
        const isLastColumn = idx === 6;
        return (
          <div
            key={dayKey}
            className={cn(
              'flex min-h-[440px] flex-col border-default bg-default transition-expo',
              !isLastColumn && 'border-r',
              isSelectedDay && 'bg-primary/5'
            )}
          >
            <div className="border-b border-default px-2 py-2 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-secondary">
                {formatDate(day, 'EEE')}
              </div>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <span
                  className={cn(
                    'inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-sm font-semibold',
                    isToday ? 'bg-primary text-link-foreground' : 'text-default'
                  )}
                >
                  {formatDate(day, 'd')}
                </span>
                {dayPosts.length > 0 ? (
                  <span className="rounded-full bg-element px-1.5 py-0.5 text-[10px] font-semibold text-secondary">
                    {dayPosts.length}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-2">
              {dayPosts.length === 0 ? (
                <p className="mt-6 text-center text-[11px] text-secondary">
                  No posts
                </p>
              ) : (
                dayPosts.map((post, postIdx) => {
                  const time = fmtTimestamp(post.schedule.at, {
                    format: 'HH:mm',
                  });
                  return (
                    <CalendarEventChip
                      key={post.postId ?? `${dayKey}-${postIdx}`}
                      post={post}
                      time={time}
                      onSelect={() => onSelectPost(post)}
                      size="md"
                      isRegenerating={
                        !!post.postId && regeneratingPostIds.has(post.postId)
                      }
                    />
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type CalendarRangeStatus = {
  isLoading: boolean;
  loadedCount: number;
};

function CalendarView({
  mode,
  cursor,
  posts,
  onSelectMode,
  onSelectCursor,
  onSelectPost,
  fmtTimestamp,
  selectedDateKey,
  rangeStatus,
  regeneratingPostIds,
}: {
  mode: CalendarMode;
  cursor: Date;
  posts: ScheduledPost[];
  onSelectMode: (mode: CalendarMode) => void;
  onSelectCursor: (cursor: Date) => void;
  onSelectPost: (post: ScheduledPost) => void;
  fmtTimestamp: CalendarFmt;
  selectedDateKey: string;
  rangeStatus: CalendarRangeStatus;
  regeneratingPostIds: Set<string>;
}) {
  const today = startOfToday();
  const postsByDate = usePostsByDate(posts, fmtTimestamp);

  const navigate = (direction: 1 | -1) => {
    if (mode === 'month') {
      onSelectCursor(
        direction === 1 ? addMonths(cursor, 1) : subMonths(cursor, 1)
      );
    } else {
      onSelectCursor(addDays(cursor, direction * 7));
    }
  };

  const rangeLabel = useMemo(() => {
    if (mode === 'month') return formatDate(cursor, 'MMMM yyyy');
    const start = startOfWeek(cursor, { weekStartsOn: 0 });
    const end = endOfWeek(cursor, { weekStartsOn: 0 });
    if (isSameMonth(start, end)) {
      return `${formatDate(start, 'MMM d')} – ${formatDate(end, 'd, yyyy')}`;
    }
    return `${formatDate(start, 'MMM d')} – ${formatDate(end, 'MMM d, yyyy')}`;
  }, [mode, cursor]);

  return (
    <div className="rounded-2xl border border-default bg-default">
      <div className="flex flex-col gap-3 border-b border-default px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full p-2 text-secondary transition-expo hover:bg-hover hover:text-default focus:outline-none focus:ring-2 focus:ring-strong"
            aria-label={mode === 'month' ? 'Previous month' : 'Previous week'}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            className="rounded-full p-2 text-secondary transition-expo hover:bg-hover hover:text-default focus:outline-none focus:ring-2 focus:ring-strong"
            aria-label={mode === 'month' ? 'Next month' : 'Next week'}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <h2 className="text-section text-default ml-1">{rangeLabel}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {rangeStatus.isLoading ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary-purple/20 bg-primary-purple/10 px-2.5 py-1 text-[11px] font-semibold text-preview"
              aria-live="polite"
              aria-busy="true"
            >
              <span
                className="size-3 shrink-0 animate-spin rounded-full border-2 border-preview border-t-indigo-600"
                aria-hidden
              />
              Loading {mode === 'month' ? 'this month' : 'this week'}…
            </span>
          ) : (
            <span
              className="rounded-lg border border-default bg-element px-2.5 py-1 text-[11px] font-medium text-secondary"
              title={
                mode === 'month'
                  ? 'Only posts inside this month are fetched.'
                  : 'Only posts inside this week are fetched.'
              }
            >
              {rangeStatus.loadedCount} post
              {rangeStatus.loadedCount === 1 ? '' : 's'} in view
            </span>
          )}
          <button
            type="button"
            onClick={() => onSelectCursor(today)}
            className="rounded-full border border-default bg-default px-3 py-1.5 text-xs font-semibold text-default transition-expo hover:border-strong hover:text-default"
          >
            Today
          </button>
          <div
            role="group"
            aria-label="Calendar range"
            className="inline-flex rounded-lg border border-default bg-element p-0.5"
          >
            {(['week', 'month'] as const).map((option) => {
              const active = mode === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onSelectMode(option)}
                  aria-pressed={active}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition-expo',
                    active
                      ? 'bg-default text-default'
                      : 'text-secondary hover:text-default'
                  )}
                >
                  {option === 'week' ? 'Week' : 'Month'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {mode === 'month' ? (
        <CalendarMonthBody
          cursor={cursor}
          postsByDate={postsByDate}
          today={today}
          onSelectPost={onSelectPost}
          fmtTimestamp={fmtTimestamp}
          selectedDateKey={selectedDateKey}
          regeneratingPostIds={regeneratingPostIds}
          onJumpToWeek={(day) => {
            onSelectMode('week');
            onSelectCursor(day);
          }}
        />
      ) : (
        <CalendarWeekBody
          cursor={cursor}
          postsByDate={postsByDate}
          today={today}
          onSelectPost={onSelectPost}
          fmtTimestamp={fmtTimestamp}
          selectedDateKey={selectedDateKey}
          regeneratingPostIds={regeneratingPostIds}
        />
      )}
    </div>
  );
}

export default function SchedulePostPage() {
  const { user, loading } = useAuth();
  const { billing } = useUserPlanCredits();
  const planActionsAllowed = !isPlanInactive(billing);
  const fmtTimestamp = useTimestampFormatter();
  const userTz = useUserTimezone();
  const router = useRouter();
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [scheduledPostsLoading, setScheduledPostsLoading] = useState(true);
  const [morePostsLoading, setMorePostsLoading] = useState(false);
  // Single source of truth for the active filter tab. Replaces six parallel
  // booleans whose only valid combinations were "exactly one true" — the
  // booleans made it easy to drift into impossible states (none / multiple).
  const [activeTab, setActiveTab] = useState<ScheduledPostsTab>('all');
  const activeTabRef = useRef<ScheduledPostsTab>('all');
  const [selectedScheduleDate, setSelectedScheduleDate] = useState('');
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('month');
  const [calendarCursor, setCalendarCursor] = useState<Date>(() =>
    startOfToday()
  );
  // Per-range cache for the calendar so navigating back to a previously-viewed
  // month is instant and we never refetch the same window. Keyed by
  // `${fromMs}_${toMs}` so month-grid and week-grid ranges don't collide.
  const [calendarRangeCache, setCalendarRangeCache] = useState<
    Map<string, ScheduledPost[]>
  >(() => new Map());
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [actingPostId, setActingPostId] = useState<string | null>(null);
  const imagePreview = useImagePreview();
  const [cursor, setCursor] = useState<ScheduledPostsPageCursor | null>(null);
  const [hasMore, setHasMore] = useState(true);
  // Mirrors `hasMore` for synchronous reads inside `fetchScheduledPosts` and
  // for the tab-change effect to flip back to `true` without waiting on a
  // re-render. Without this ref, switching away from a tab whose query just
  // failed would never refetch — the stale `useCallback` closure would see
  // `hasMore === false` and bail before the state update flushed.
  const hasMoreRef = useRef(true);
  const obserVerRef = useRef<IntersectionObserver | null>(null);
  const fetchingRef = useRef(false);
  const cursorRef = useRef<ScheduledPostsPageCursor | null>(null);
  // Monotonic token. Every fetch captures the value at its start; on response
  // it bails if the token has moved on (meaning the user switched tabs / a
  // newer fetch is in flight). Without this, a slow response from the
  // previous tab would land in the new tab's list, e.g. rejected posts
  // briefly appearing in Upcoming after a fast All → Upcoming click.
  const fetchTokenRef = useRef(0);
  const fetchScheduledPostsRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  // Read the active tab through a ref inside fetchers so we don't have to
  // rebuild the memoized callbacks every time the user clicks a different tab.
  // The ref is kept in sync with the state below.
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const fetchScheduledPosts = useCallback(async () => {
    // Read `hasMore` through a ref so this guard can never get fooled by a
    // stale closure — important on tab change, when we want the brand-new
    // tab to fetch even though the previous tab just set `hasMore = false`.
    if (!hasMoreRef.current || fetchingRef.current) return;
    fetchingRef.current = true;
    // Snapshot the token + tab at start. After every `await` we re-check
    // both: if either moved on, the user switched tabs while we were in
    // flight and this response now belongs to a list we no longer show.
    // Bailing without touching state keeps the freshly-started fetch fully
    // in control of `scheduledPosts`, `cursor`, `hasMore`, and the loading
    // flags — that's the actual cure for "rejected posts appear in
    // Upcoming after fast tab switches".
    const myToken = ++fetchTokenRef.current;
    const myTab = activeTabRef.current;
    const isFirstPage = cursorRef.current == null;
    if (isFirstPage) {
      setScheduledPostsLoading(true);
    } else {
      setMorePostsLoading(true);
    }
    try {
      const response = await getScheduledPosts({
        cursor: cursorRef.current ?? undefined,
        tab: myTab,
      });
      if (myToken !== fetchTokenRef.current) return;
      const data = response.data;
      setScheduledPosts((prev) =>
        dedupeScheduledPosts([...prev, ...(data.posts ?? [])])
      );
      const next = data.nextCursor ?? null;
      cursorRef.current = next;
      setCursor(next);
      if (!next) {
        hasMoreRef.current = false;
        setHasMore(false);
      }
    } catch (error) {
      if (myToken !== fetchTokenRef.current) return;
      // Don't wipe a successful prior page when a later page fails — that
      // would erase content the user can already see. Only clear when the
      // very first page errors out (so we don't leave a stale skeleton).
      console.error('[fetchScheduledPosts] failed', error);
      if (isFirstPage) setScheduledPosts([]);
      showErrorToast('Failed to load scheduled posts');
      // Stop driving the intersection-observer pagination into the same
      // failing query. The tab-change effect resets this back to `true`// synchronously, so switching tabs still triggers a fresh fetch.
      hasMoreRef.current = false;
      setHasMore(false);
    } finally {
      // Only release the in-flight flag / loading skeletons if this fetch
      // is still the active one. A stale fetch flipping these would let a
      // second background fetch start (fetchingRef = false) or hide the
      // newer fetch's spinner mid-load.
      if (myToken === fetchTokenRef.current) {
        fetchingRef.current = false;
        setScheduledPostsLoading(false);
        setMorePostsLoading(false);
      }
    }
  }, []);

  fetchScheduledPostsRef.current = fetchScheduledPosts;

  // Initial load + tab-change reload. When the user switches tabs we reset the
  // paginated cache (since the server-side filter has changed) and refetch the
  // first page for the new tab. The cursor is intentionally NOT in deps — the
  // fetch reads it through a ref so this effect doesn't re-run on every page.
  useEffect(() => {
    // Bump the fetch token so any in-flight request for the *previous* tab
    // discards its response when it finally lands — without this, a slow
    // response from the old tab can stomp on the new tab's freshly-loaded
    // list (e.g. rejected posts appearing in Upcoming on a fast switch).
    fetchTokenRef.current++;
    // Also clear `fetchingRef` so the new fetch below isn't blocked by the
    // (now-invalidated) previous fetch's in-flight flag.
    fetchingRef.current = false;
    cursorRef.current = null;
    setCursor(null);
    // Sync the ref BEFORE the fetch so the guard inside `fetchScheduledPosts`// sees the reset immediately. `setHasMore(true)` alone wouldn't help —
    // its closure value lags one render behind the call below.
    hasMoreRef.current = true;
    setHasMore(true);
    setScheduledPosts([]);
    void fetchScheduledPostsRef.current();
  }, [activeTab]);

  /**
   * Re-fetches the first page WITHOUT toggling the skeleton. Used after an
   * action to pick up backend mutations (regen content, retry counters, etc.)
   * without flashing a loading state at the user. The active selection (if any)
   * is rebound to the freshly fetched copy so the modal reflects new data.
   */
  const silentRefreshScheduledPosts = useCallback(
    async (options?: { keepSelectionForPostId?: string }) => {
      // Same stale-response guard as `fetchScheduledPosts`. If the user
      // switches tabs while this background refresh is in flight, the
      // response is silently dropped instead of overwriting the new tab.
      const myToken = ++fetchTokenRef.current;
      const myTab = activeTabRef.current;
      try {
        const response = await getScheduledPosts({ tab: myTab });
        if (myToken !== fetchTokenRef.current) return;
        const data = response.data;
        const posts = dedupeScheduledPosts(data.posts ?? []);
        setScheduledPosts(posts);

        const next = data.nextCursor ?? null;
        cursorRef.current = next;
        setCursor(next);
        hasMoreRef.current = next != null;
        setHasMore(next != null);
        const keepId = options?.keepSelectionForPostId;
        if (keepId) {
          const nextSel = posts.find((p: ScheduledPost) => p.postId === keepId);
          if (nextSel) setSelectedPost(nextSel);
        }
      } catch (error) {
        // Background refresh; we deliberately don't toast — the user just
        // performed an explicit action and the action-level toast already
        // covered that. Log so a broken refresh is still investigable.
        console.error('[silentRefreshScheduledPosts] failed', error);
      }
    },
    []
  );

  const silentRefreshCalendarRange = useCallback(
    async (options?: { keepSelectionForPostId?: string }) => {
      const { fromMs, toMs } = calendarVisibleRange(
        calendarMode,
        calendarCursor
      );
      const currentKey = `${fromMs}_${toMs}`;
      try {
        const response = await getScheduledPostsInRange({
          fromMs,
          toMs,
        });
        const posts = dedupeScheduledPosts(response.data?.posts ?? []);
        setCalendarRangeCache((prev) => {
          const next = new Map(prev);
          next.set(currentKey, posts);
          return next;
        });
        const keepId = options?.keepSelectionForPostId;
        if (keepId) {
          const nextSel = posts.find((p: ScheduledPost) => p.postId === keepId);
          if (nextSel) setSelectedPost(nextSel);
        }
      } catch (error) {
        console.error('[silentRefreshCalendarRange] failed', error);
      }
    },
    [calendarMode, calendarCursor]
  );

  const silentRefreshRef = useRef(silentRefreshScheduledPosts);
  silentRefreshRef.current = silentRefreshScheduledPosts;

  // Paginated list data can go stale while the user stays on calendar view
  // (e.g. after scheduling product-advert full-social). Refresh page 1 when
  // they switch to list so new posts aren't hidden until a manual tab toggle.
  const prevViewModeRef = useRef(viewMode);
  useEffect(() => {
    if (viewMode === 'list' && prevViewModeRef.current !== 'list') {
      void silentRefreshRef.current();
    }
    prevViewModeRef.current = viewMode;
  }, [viewMode]);

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

  const handlePostAction = useCallback(
    async (post: ScheduledPost, action: 'regenerate' | 'remove') => {
      if (!planActionsAllowed) {
        showErrorToast(
          'Your plan has expired. Renew to manage scheduled posts.'
        );
        return;
      }
      const postId = post.postId;
      const platform = post.platform ?? '';
      if (!postId) {
        showErrorToast('Missing post id');
        return;
      }
      if (action === 'regenerate' && post.generatedByAiEngine !== true) {
        showErrorToast('Only Autopilot posts can be regenerated.');
        return;
      }
      if (action === 'regenerate' && !platform) {
        showErrorToast('Missing platform for this post');
        return;
      }

      // Snapshot for rollback if the API call fails after the optimistic
      // mutation. Removing the post is the only optimistic mutation we apply
      // here — regenerate keeps the post in place because its content will be
      // swapped in by the background refresh once the worker finishes.
      const previousPosts = scheduledPosts;
      const previousSelected = selectedPost;
      const previousCalendarCache = calendarRangeCache;

      if (action === 'remove') {
        setScheduledPosts((prev) =>
          prev.map((p) =>
            p.postId === postId
              ? {
                  ...p,
                  lifecycle: 'removed',
                  approval: {
                    status: 'rejected',
                    stage: 'complete',
                    actor: 'user',
                  },
                }
              : p
          )
        );
        // Mirror the optimistic flag into every cached calendar range so the
        // change is visible immediately in any month/week the user navigates
        // to before the background refresh lands.
        setCalendarRangeCache((prev) => {
          let touched = false;
          const next = new Map<string, ScheduledPost[]>();
          prev.forEach((posts, key) => {
            const updated = posts.map((p) => {
              if (p.postId === postId && p.lifecycle !== 'removed') {
                touched = true;
                return {
                  ...p,
                  lifecycle: 'removed',
                  approval: {
                    status: 'rejected',
                    stage: 'complete',
                    actor: 'user',
                  },
                };
              }
              return p;
            });
            next.set(key, updated);
          });
          return touched ? next : prev;
        });
        if (selectedPost?.postId === postId) {
          setSelectedPost(null);
        }
      }

      setActingPostId(postId);
      try {
        if (action === 'remove') {
          await removeScheduledPost(postId);
          if (viewMode === 'calendar') {
            void silentRefreshCalendarRange();
          } else {
            void silentRefreshScheduledPosts();
          }
        } else {
          if (!markRegenerating(postId)) return;
          try {
            await performActionByUserOnScheduledPost(
              postId,
              'regenerate',
              platform
            );
            if (viewMode === 'calendar') {
              await silentRefreshCalendarRange({
                keepSelectionForPostId: postId,
              });
            } else {
              await silentRefreshScheduledPosts({
                keepSelectionForPostId: postId,
              });
            }
          } finally {
            cancelRegeneration(postId);
          }
        }
      } catch {
        showErrorToast(
          'Failed to perform action on scheduled post. Please try again later.'
        );
        if (action === 'regenerate') {
          cancelRegeneration(postId);
        } else {
          // Roll the optimistic change back.
          setScheduledPosts(previousPosts);
          setCalendarRangeCache(previousCalendarCache);
          if (previousSelected?.postId === postId) {
            setSelectedPost(previousSelected);
          }
        }
      } finally {
        setActingPostId(null);
      }
    },
    [
      planActionsAllowed,
      scheduledPosts,
      selectedPost,
      silentRefreshScheduledPosts,
      silentRefreshCalendarRange,
      calendarRangeCache,
      viewMode,
      markRegenerating,
      cancelRegeneration,
    ]
  );

  const lastPostRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (scheduledPostsLoading || morePostsLoading) return;

      if (obserVerRef.current) obserVerRef.current.disconnect();

      obserVerRef.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchScheduledPostsRef.current();
        }
      });

      if (node) obserVerRef.current.observe(node);
    },
    [scheduledPostsLoading, morePostsLoading, scheduledPosts.length]
  );

  // Visible window for the calendar. Drives both the range-fetch effect below
  // and the per-range cache lookup that feeds `filteredAndSortedPosts` when in
  // calendar mode.
  const calendarRange = useMemo(
    () => calendarVisibleRange(calendarMode, calendarCursor),
    [calendarMode, calendarCursor]
  );
  const calendarRangeKey = `${calendarRange.fromMs}_${calendarRange.toMs}`;
  const calendarPosts = useMemo(
    () => calendarRangeCache.get(calendarRangeKey) ?? [],
    [calendarRangeCache, calendarRangeKey]
  );

  const filteredAndSortedPosts = useMemo(() => {
    const isRemoved = (p: ScheduledPost) => p.lifecycle === 'removed';
    const isRejected = (p: ScheduledPost) => p.lifecycle === 'rejected';
    const isFailed = (p: ScheduledPost) => p.lifecycle === 'failed';
    const isPosted = (p: ScheduledPost) => p.lifecycle === 'published';

    // List view: server has already filtered by `activeTab`, so the cached
    // page contents are authoritative — skip the client-side tab filter.
    //
    // Calendar view: the range fetch is tab-agnostic (it returns every post
    // inside the visible month/week so a single network call can serve any
    // tab the user picks). We replay the same tab logic on top of that
    // bounded source so switching tabs feels instant.
    const source = viewMode === 'calendar' ? calendarPosts : scheduledPosts;
    let posts = source;

    if (viewMode === 'calendar') {
      if (activeTab === 'removed') {
        posts = source.filter(isRemoved);
      } else if (activeTab === 'rejected') {
        posts = source.filter(isRejected);
      } else if (activeTab === 'upcoming') {
        // Spec: "pending for approval from admin/user, going to post from
        // today's date or future". Past-due pending docs that haven't been
        // swept by the backend yet shouldn't sneak into Upcoming — the
        // date floor catches them client-side too.
        const todayMs = startOfToday().getTime();
        posts = source.filter((p) => {
          if (isPosted(p) || isRemoved(p) || isRejected(p) || isFailed(p)) {
            return false;
          }
          const ms = (p.schedule?.at?._seconds ?? 0) * 1000;
          return ms >= todayMs;
        });
      } else if (activeTab === 'posted') {
        posts = source.filter(
          (p) => isPosted(p) && !isRemoved(p) && !isRejected(p) && !isFailed(p)
        );
      } else if (activeTab === 'failed') {
        posts = source.filter(isFailed);
      }
    }

    if (selectedScheduleDate) {
      posts = posts.filter(
        (p) =>
          fmtTimestamp(p.schedule.at, { format: 'yyyy-MM-dd' }) ===
          selectedScheduleDate
      );
    }

    return posts;
  }, [
    viewMode,
    calendarPosts,
    scheduledPosts,
    activeTab,
    selectedScheduleDate,
    fmtTimestamp,
  ]);

  // Keep the detail modal in sync after regeneration refreshes list/calendar data.
  useEffect(() => {
    if (!selectedPost?.postId) return;
    const updated = filteredAndSortedPosts.find(
      (p) => p.postId === selectedPost.postId
    );
    if (!updated) return;
    const prevCount =
      selectedPost.regenratedCount ?? selectedPost.regeneratedCount ?? 0;
    const nextCount = updated.regenratedCount ?? updated.regeneratedCount ?? 0;
    if (
      updated.imageUrl !== selectedPost.imageUrl ||
      updated.videoUrl !== selectedPost.videoUrl ||
      updated.mediaType !== selectedPost.mediaType ||
      updated.message !== selectedPost.message ||
      nextCount !== prevCount
    ) {
      setSelectedPost(updated);
    }
  }, [filteredAndSortedPosts, selectedPost]);

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  // Keep the calendar viewport in sync with the date filter so a date picked
  // from the input always lands on a visible cell — works for both month and
  // week modes.
  useEffect(() => {
    if (!selectedScheduleDate) return;
    const parsed = parseISO(selectedScheduleDate);
    if (Number.isNaN(parsed.getTime())) return;
    setCalendarCursor((prev) => {
      if (calendarMode === 'month') {
        return isSameMonth(prev, parsed) ? prev : startOfMonth(parsed);
      }
      const prevWeekStart = startOfWeek(prev, { weekStartsOn: 0 });
      const newWeekStart = startOfWeek(parsed, { weekStartsOn: 0 });
      return isSameDay(prevWeekStart, newWeekStart) ? prev : parsed;
    });
  }, [selectedScheduleDate, calendarMode]);

  // Range-based fetch for the calendar — replaces the previous "auto-paginate
  // through all history" cascade. One request per (mode, cursor) window;
  // results are cached so navigating back to a previously-viewed month is
  // free. We never read posts outside the visible range, which keeps both
  // Firestore reads and user bandwidth bounded to "what's on screen".
  useEffect(() => {
    if (viewMode !== 'calendar') return;
    if (calendarRangeCache.has(calendarRangeKey)) return;

    let cancelled = false;
    setCalendarLoading(true);
    (async () => {
      try {
        const response = await getScheduledPostsInRange({
          fromMs: calendarRange.fromMs,
          toMs: calendarRange.toMs,
        });
        if (cancelled) return;
        const posts = dedupeScheduledPosts(response.data?.posts ?? []);
        setCalendarRangeCache((prev) => {
          if (prev.has(calendarRangeKey)) return prev;
          const next = new Map(prev);
          next.set(calendarRangeKey, posts);
          return next;
        });
      } catch (error) {
        if (!cancelled) {
          console.error('[calendar range fetch] failed', error);
          showErrorToast('Failed to load calendar posts');
          // Cache the empty result so we don't refire the same failing
          // request on every re-render — the user can navigate to another
          // month and come back to retry.
          setCalendarRangeCache((prev) => {
            if (prev.has(calendarRangeKey)) return prev;
            const next = new Map(prev);
            next.set(calendarRangeKey, []);
            return next;
          });
        }
      } finally {
        if (!cancelled) setCalendarLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    viewMode,
    calendarRangeKey,
    calendarRange.fromMs,
    calendarRange.toMs,
    calendarRangeCache,
  ]);

  if (loading) return <PageLoadingState />;
  if (!user) return null;

  const postActionDisabled =
    actingPostId !== null && !regeneratingPostIds.has(actingPostId);

  return (
    <div className="mx-auto max-w-6xl animate-in fade-in duration-500">
      <div
        id="tour-pq-list"
        className="overflow-hidden rounded-3xl border border-default bg-default"
      >
        <div className="px-6 pb-8 pt-8 sm:px-10 sm:pt-10">
          <header className="mb-8">
            <h1 className="text-page-title text-default">
              <span className="text-default">
                {workspacePageTitle(WORKSPACE_NAV_HREFS.postQueue)}
              </span>
            </h1>
            <div className="flex sm:flex-row flex-col w-full justify-between gap-2">
              <p className="mt-3 text-base text-secondary">
                Plan and track what goes out — upcoming and published in one
                place.
              </p>
              <label className="flex items-center gap-2 text-sm text-secondary">
                <span className="whitespace-nowrap font-medium">
                  Schedule date
                </span>
                <input
                  type="date"
                  value={selectedScheduleDate}
                  onChange={(e) => setSelectedScheduleDate(e.target.value)}
                  className="date-input-light h-10 rounded-lg border border-default bg-default px-3 text-sm text-default outline-none transition-expo focus:border-primary-blue focus:ring-2 focus:ring-strong"
                />
                {selectedScheduleDate ? (
                  <button
                    type="button"
                    onClick={() => setSelectedScheduleDate('')}
                    className="rounded-full px-3 py-2 text-xs font-semibold text-secondary transition-expo hover:bg-element hover:text-default"
                  >
                    Clear
                  </button>
                ) : null}
              </label>
            </div>
          </header>

          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="flex flex-wrap gap-1 rounded-xl border border-default bg-element p-1"
              role="tablist"
              aria-label="Filter scheduled posts"
            >
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'upcoming', label: 'Upcoming' },
                  { id: 'posted', label: 'Posted' },
                  { id: 'removed', label: 'Removed' },
                  { id: 'failed', label: 'Failed' },
                  { id: 'rejected', label: 'Rejected' },
                ] as const
              ).map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'rounded-full px-4 py-2 text-xs font-semibold transition-expo',
                      active
                        ? 'bg-default text-default'
                        : 'text-secondary hover:text-default'
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setViewMode((prev) =>
                      prev === 'list' ? 'calendar' : 'list'
                    )
                  }
                  aria-label={
                    viewMode === 'list'
                      ? 'Switch to calendar view'
                      : 'Switch to list view'
                  }
                  title={
                    viewMode === 'list'
                      ? 'Switch to calendar view'
                      : 'Switch to list view'
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-default bg-default px-3 text-sm font-semibold text-default transition-expo hover:border-strong hover:text-default focus:outline-none focus:ring-2 focus:ring-strong"
                >
                  {viewMode === 'list' ? (
                    <>
                      <CalendarDays className="h-4 w-4 text-link" />
                      Calendar view
                    </>
                  ) : (
                    <>
                      <LayoutGrid className="h-4 w-4 text-link" />
                      List view
                    </>
                  )}
                </button>
              </div>
              <p className="text-sm text-secondary">
                {filteredAndSortedPosts.length} in view
              </p>
            </div>
          </div>

          {scheduledPostsLoading ? (
            viewMode === 'calendar' ? (
              <div
                className="h-[520px] animate-pulse rounded-2xl border border-default bg-element"
                aria-busy="true"
              />
            ) : (
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
            )
          ) : viewMode === 'calendar' ? (
            <CalendarView
              mode={calendarMode}
              cursor={calendarCursor}
              posts={filteredAndSortedPosts}
              onSelectMode={setCalendarMode}
              onSelectCursor={setCalendarCursor}
              onSelectPost={setSelectedPost}
              fmtTimestamp={fmtTimestamp}
              selectedDateKey={selectedScheduleDate}
              regeneratingPostIds={regeneratingPostIds}
              rangeStatus={{
                isLoading: calendarLoading,
                loadedCount: filteredAndSortedPosts.length,
              }}
            />
          ) : filteredAndSortedPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-default bg-element px-6 py-16 text-center">
              <Calendar className="mx-auto mb-3 h-10 w-10 text-link/60" />
              <p className="text-sm font-medium text-default">
                {activeTab === 'removed'
                  ? 'No posts removed by you yet'
                  : activeTab === 'rejected'
                    ? 'No rejected posts yet'
                    : activeTab === 'failed'
                      ? 'No failed posts'
                      : activeTab === 'posted'
                        ? 'No posted posts yet'
                        : activeTab === 'upcoming'
                          ? 'No upcoming posts'
                          : selectedScheduleDate
                            ? 'No posts scheduled for this date'
                            : 'No posts in this queue yet'}
              </p>
              <p className="mt-1 text-sm text-secondary">
                {activeTab === 'removed'
                  ? 'When you remove a scheduled post, it will appear here.'
                  : activeTab === 'rejected'
                    ? 'Posts you reject from approval will appear here.'
                    : activeTab === 'failed'
                      ? 'Posts that failed to publish — or were never approved in time — will appear here.'
                      : activeTab === 'posted'
                        ? 'Posts already published will appear here.'
                        : activeTab === 'upcoming'
                          ? 'Posts awaiting approval, or scheduled for today and beyond, will appear here.'
                          : selectedScheduleDate
                            ? `Pick another date or clear the date filter. Showing dates in ${userTz}.`
                            : 'When you schedule content, it will show up here as cards.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedPosts.map((post, index) => {
                const scheduleAt = fmtTimestamp(post.schedule.at);

                const isLast = index === filteredAndSortedPosts.length - 1;

                const isRegenerating = post.postId
                  ? regeneratingPostIds.has(post.postId)
                  : false;

                return (
                  <ScheduledPostCard
                    key={post.postId ?? `post-${index}`}
                    post={post}
                    scheduleAt={scheduleAt}
                    onSelect={() => setSelectedPost(post)}
                    cardRef={isLast ? lastPostRef : undefined}
                    onRegenerate={() => handlePostAction(post, 'regenerate')}
                    onRemove={() => handlePostAction(post, 'remove')}
                    actionDisabled={!post.postId || postActionDisabled}
                    actionsAllowed={planActionsAllowed}
                    onPreviewImage={imagePreview.open}
                    isRegenerating={isRegenerating}
                  />
                );
              })}
            </div>
          )}

          {viewMode === 'list' &&
            !scheduledPostsLoading &&
            (hasMore || morePostsLoading) && (
              <div
                className="mt-8 flex flex-col items-center gap-2 rounded-xl border border-default bg-element px-4 py-4 text-sm text-secondary"
                aria-live="polite"
              >
                {morePostsLoading ? (
                  <div
                    className="flex items-center gap-2"
                    aria-busy="true"
                    aria-label="Loading more posts"
                  >
                    <span
                      className="size-4 shrink-0 animate-spin rounded-full border-2 border-default border-t-primary-blue"
                      aria-hidden
                    />
                    Loading more posts…
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-secondary">
                      {scheduledPosts.length} post
                      {scheduledPosts.length === 1 ? '' : 's'} loaded
                    </p>
                    <button
                      type="button"
                      onClick={() => void fetchScheduledPosts()}
                      className="rounded-full border border-default bg-default px-4 py-2 text-xs font-semibold text-default transition-expo hover:border-strong hover:text-default focus:outline-none focus:ring-2 focus:ring-strong"
                    >
                      Load more posts
                    </button>
                  </>
                )}
              </div>
            )}
        </div>
      </div>

      {selectedPost && (
        <DetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          formatTimestamp={fmtTimestamp}
          onRegenerate={() => handlePostAction(selectedPost, 'regenerate')}
          onRemove={() => handlePostAction(selectedPost, 'remove')}
          actionDisabled={!selectedPost.postId || postActionDisabled}
          actionsAllowed={planActionsAllowed}
          onPreviewImage={imagePreview.open}
          isRegenerating={
            !!selectedPost.postId &&
            regeneratingPostIds.has(selectedPost.postId)
          }
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
