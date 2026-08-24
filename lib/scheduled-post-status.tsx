/**
 * Shared status helpers for scheduled posts.
 *
 * The Scheduled Posts page (`/scheduled-posts`) and the User Approval page (`/approval`)
 * both render scheduled posts using the same status pill semantics. Keeping
 * the mapping in one place stops the two pages from drifting (e.g. relabelling
 * `pending` differently or applying different colours).
 *
 * The backend exposes one canonical lifecycle and one approval stage. The UI
 * does not translate or merge any retired scheduling status fields.
 */

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCw,
  Trash2,
} from 'lucide-react';
import { cn } from './utils';

export type ScheduledPostStatusInput = {
  lifecycle?: string | null;
  approval?: {
    status?: string | null;
    stage?: string | null;
    actor?: string | null;
  } | null;
  publication?: {
    lastError?: string | null;
    errors?: string[] | null;
  } | null;
};

export type DisplayStatusVariant =
  | 'failed'
  | 'posted'
  | 'approved'
  | 'processing'
  | 'rejected'
  | 'removedByYou'
  | 'removedByAdmin'
  | 'pendingByYou'
  | 'pendingByAdmin';

export type DisplayStatus = {
  label: string;
  variant: DisplayStatusVariant;
  /** Populated only when the post is failed. */
  reason: string | null;
};

export function extractFailureReason(
  post: ScheduledPostStatusInput
): string | null {
  if (typeof post.publication?.lastError === 'string' && post.publication.lastError.trim()) {
    return post.publication.lastError.trim();
  }
  if (Array.isArray(post.publication?.errors)) {
    const cleaned = post.publication.errors
      .map((e) => (typeof e === 'string' ? e.trim() : ''))
      .filter((e) => e.length > 0);
    if (cleaned.length > 0) return cleaned.join('\n');
  }
  return null;
}

export function getDisplayStatus(post: ScheduledPostStatusInput): DisplayStatus {
  const lifecycle = String(post.lifecycle ?? '').toLowerCase();
  const stage = String(post.approval?.stage ?? '').toLowerCase();
  const actor = String(post.approval?.actor ?? '').toLowerCase();

  if (lifecycle === 'removed') {
    if (actor === 'user') {
      return { label: 'Removed by you', variant: 'removedByYou', reason: null };
    }
    return {
      label: 'Removed by admin',
      variant: 'removedByAdmin',
      reason: null,
    };
  }

  if (lifecycle === 'failed') {
    return {
      label: 'Failed',
      variant: 'failed',
      reason: extractFailureReason(post),
    };
  }
  if (lifecycle === 'published')
    return { label: 'Posted', variant: 'posted', reason: null };
  if (lifecycle === 'rejected') {
    const byAdmin = actor !== 'user';
    return {
      label: byAdmin ? 'Rejected by admin' : 'Rejected by user',
      variant: 'rejected',
      reason: null,
    };
  }

  if (lifecycle === 'review_pending' && stage === 'user') {
    return {
      label: 'Approval pending by you',
      variant: 'pendingByYou',
      reason: null,
    };
  }

  if (lifecycle === 'scheduled')
    return { label: 'Approved', variant: 'approved', reason: null };
  if (lifecycle === 'publishing' || lifecycle === 'generating')
    return { label: 'Processing', variant: 'processing', reason: null };
  return {
    label: 'Approval pending by admin',
    variant: 'pendingByAdmin',
    reason: null,
  };
}

export function statusBadgeClasses(variant: DisplayStatusVariant): string {
  switch (variant) {
    case 'failed':
      return 'bg-red-500/15 text-red-300 border-red-500/30';
    case 'posted':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'approved':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'processing':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'rejected':
      return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    case 'removedByYou':
      return 'bg-muted text-muted-foreground border-border';
    case 'removedByAdmin':
      return 'bg-muted text-muted-foreground border-border';
    case 'pendingByYou':
      return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
    case 'pendingByAdmin':
      return 'bg-primary/15 text-primary border-primary/30';
  }
}

export function StatusBadgeIcon({
  variant,
  className,
}: {
  variant: DisplayStatusVariant;
  className?: string;
}) {
  const cls = className ?? 'h-3 w-3';
  switch (variant) {
    case 'posted':
    case 'approved':
      return <CheckCircle2 className={cls} />;
    case 'failed':
    case 'rejected':
      return <AlertCircle className={cls} />;
    case 'processing':
      return <RotateCw className={cn(cls, 'animate-spin')} />;
    case 'removedByYou':
    case 'removedByAdmin':
      return <Trash2 className={cls} />;
    case 'pendingByYou':
    case 'pendingByAdmin':
      return <Clock className={cls} />;
  }
}

/** Activity row icon — exactly four states on the home dashboard. */
export type ActivityScheduleState = 'posted' | 'failed' | 'approved' | 'pending';

export function getActivityScheduleState(
  post: ScheduledPostStatusInput
): ActivityScheduleState | null {
  const lifecycle = String(post.lifecycle ?? '').toLowerCase();
  if (lifecycle === 'published') return 'posted';
  if (lifecycle === 'failed') return 'failed';
  if (lifecycle === 'review_pending') return 'pending';
  if (lifecycle === 'scheduled') return 'approved';
  return null;
}

export type ScheduledPostScheduleInput = ScheduledPostStatusInput & {
  schedule?: { at?: { _seconds: number } | null } | null;
};

/**
 * Matches the Scheduled Posts "Upcoming" tab and `isUpcomingPost` in
 * `scheduled-post/page.tsx` / `applyScheduledPostsTabFilter` on the API.
 */
export function isUpcomingScheduledPost(
  post: ScheduledPostScheduleInput,
  scheduleFloorMs: number = Date.now()
): boolean {
  const lifecycle = String(post.lifecycle ?? '').toLowerCase();
  if (!['review_pending', 'scheduled', 'publishing'].includes(lifecycle)) return false;
  const scheduleMs = (post.schedule?.at?._seconds ?? 0) * 1000;
  return scheduleMs >= scheduleFloorMs;
}

/** Friendly label for the backend `GeneratedBy` pipeline tag. */
export function generatedByLabel(value: string | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  switch (trimmed.toLowerCase()) {
    case 'ai-engine':
      return 'Autopilot';
    case 'batch-generation':
      return 'Legacy bulk';
    case 'events-post':
      return 'Occasion Posts';
    case 'product-advert':
      return 'Product Posts';
    case 'video-generation':
      return 'Videos';
    case 'scheduler':
      return 'Schedule a Post';
    case 'instant-generation':
      return 'Create Post';
    case 'bulk-create':
      return 'Legacy bulk';
    case 'quick-create':
      return 'Create Post';
    case 'campaign':
    case 'create-campaign':
      return 'Campaigns';
    case 'carousel-engine':
    case 'carousel':
    case 'carousel-create':
      return 'Carousel Posts';
    default:
      return trimmed;
  }
}
