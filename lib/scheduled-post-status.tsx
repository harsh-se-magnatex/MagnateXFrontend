/**
 * Shared status helpers for scheduled posts.
 *
 * The Post Queue (`/scheduled-post`) and the User Approval page (`/approval`)
 * both render scheduled posts using the same status pill semantics. Keeping
 * the mapping in one place stops the two pages from drifting (e.g. relabelling
 * `pending` differently or applying different colours).
 *
 * Status resolution priority (high → low):
 *   1. `removedByUser === true`         → Removed by you (terminal user action,
 *                                          beats every backend status)
 *   2. `postStatus === 'removed'` or
 *      `UserApprovalStatus === 'removed'` → Removed by admin
 *   3. `postStatus === 'failed'`        → Failed (with reason from `error` or
 *                                          `errors[]`)
 *   4. `postStatus === 'posted'`        → Posted
 *   5. `UserApprovalStatus === 'rejected'` → Rejected
 *   6. `UserApprovalStatus !== 'approved'` → Approval pending by you
 *      (user-side approval check intentionally wins over
 *      `postStatus === 'approved'`, because the AI engine sometimes
 *      pre-stamps `postStatus: 'approved'` while still leaving
 *      `UserApprovalStatus: 'pending'`)
 *   7. `postStatus === 'approved'`      → Approved
 *   8. `postStatus === 'processing'`    → Processing
 *   9. otherwise                        → Approval pending by admin
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
  postStatus?: string | null;
  UserApprovalStatus?: string | null;
  /**
   * `true` when the *end user* (not an admin) deleted the post from the queue.
   * Terminal state — beats every other status because it reflects the user's
   * own explicit action, which is the most useful signal to surface back.
   */
  removedByUser?: boolean | null;
  error?: string | null;
  errors?: string[] | null;
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
  if (typeof post.error === 'string' && post.error.trim()) {
    return post.error.trim();
  }
  if (Array.isArray(post.errors)) {
    const cleaned = post.errors
      .map((e) => (typeof e === 'string' ? e.trim() : ''))
      .filter((e) => e.length > 0);
    if (cleaned.length > 0) return cleaned.join('\n');
  }
  return null;
}

export function getDisplayStatus(post: ScheduledPostStatusInput): DisplayStatus {
  const ps = String(post.postStatus ?? '').toLowerCase();
  const ua = String(post.UserApprovalStatus ?? '').toLowerCase();

  // Removal beats every other status — it's a terminal user/admin action
  // and the most relevant thing to surface back. The `removedByUser` flag
  // is what the current Remove button writes; `postStatus === 'removed'` and
  // `UserApprovalStatus === 'removed'` are kept here for forward
  // compatibility with an admin-side remove action (no producer in-tree yet,
  // but the badge is ready when it lands).
  if (post.removedByUser === true) {
    return { label: 'Removed by you', variant: 'removedByYou', reason: null };
  }
  if (ps === 'removed' || ua === 'removed') {
    return {
      label: 'Removed by admin',
      variant: 'removedByAdmin',
      reason: null,
    };
  }

  if (ps === 'failed') {
    return {
      label: 'Failed',
      variant: 'failed',
      reason: extractFailureReason(post),
    };
  }
  if (ps === 'posted')
    return { label: 'Posted', variant: 'posted', reason: null };
  if (ua === 'rejected')
    return { label: 'Rejected', variant: 'rejected', reason: null };

  if (ua !== 'approved') {
    return {
      label: 'Approval pending by you',
      variant: 'pendingByYou',
      reason: null,
    };
  }

  if (ps === 'approved')
    return { label: 'Approved', variant: 'approved', reason: null };
  if (ps === 'processing')
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
  const ps = String(post.postStatus ?? '').toLowerCase();
  const ua = String(post.UserApprovalStatus ?? '').toLowerCase();

  if (ps === 'posted') return 'posted';
  if (ps === 'failed') return 'failed';
  if (ua === 'pending' || ps === 'pending') return 'pending';
  if (ua === 'approved' && ps === 'approved') return 'approved';
  return null;
}

export type ScheduledPostScheduleInput = ScheduledPostStatusInput & {
  scheduleAt?: { _seconds: number } | null;
};

/**
 * Matches the Post Queue "Upcoming" tab and `isUpcomingPost` in
 * `scheduled-post/page.tsx` / `applyScheduledPostsTabFilter` on the API.
 */
export function isUpcomingScheduledPost(
  post: ScheduledPostScheduleInput,
  scheduleFloorMs: number = Date.now()
): boolean {
  const ps = String(post.postStatus ?? '').toLowerCase();
  const ua = String(post.UserApprovalStatus ?? '').toLowerCase();
  if (post.removedByUser === true) return false;
  if (ua === 'rejected' || ua === 'removed') return false;
  if (ps === 'posted' || ps === 'failed' || ps === 'removed') return false;
  if (!['pending', 'processing', 'approved'].includes(ps)) return false;
  const scheduleMs = (post.scheduleAt?._seconds ?? 0) * 1000;
  return scheduleMs >= scheduleFloorMs;
}

/** Friendly label for the backend `GeneratedBy` pipeline tag. */
export function generatedByLabel(value: string | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  switch (trimmed.toLowerCase()) {
    case 'ai-engine':
      return 'AI Engine';
    case 'batch-generation':
      return 'Bulk Create';
    case 'events-post':
      return 'Festive Post';
    case 'product-advert':
      return 'Product advert';
    case 'video-generation':
      return 'Video Generation';
    case 'scheduler':
      return 'Schedule Post';
    case 'instant-generation':
      return 'Quick Create';
    case 'bulk-create':
      return 'Bulk Create';
    case 'quick-create':
      return 'Quick Create';
    case 'carousel-engine':
    case 'carousel':
    case 'carousel-create':
      return 'Carousel Create';
    default:
      return trimmed;
  }
}
