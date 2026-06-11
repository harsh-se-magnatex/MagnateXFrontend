/**
 * Shared status helpers for scheduled posts.
 *
 * The Post Queue (`/scheduled-post`) and the User Approval page (`/approval`)
 * both render scheduled posts using the same status pill semantics. Keeping
 * the mapping in one place stops the two pages from drifting (e.g. relabelling
 * `pending` differently or applying different colours).
 *
 * Status resolution priority (high → low):
 *   1. `postStatus === 'failed'`        → Failed (with reason from `error` or
 *                                          `errors[]`)
 *   2. `postStatus === 'posted'`        → Posted
 *   3. `UserApprovalStatus === 'rejected'` → Rejected
 *   4. `UserApprovalStatus !== 'approved'` → Approval pending by you
 *      (user-side approval check intentionally wins over
 *      `postStatus === 'approved'`, because the AI engine sometimes
 *      pre-stamps `postStatus: 'approved'` while still leaving
 *      `UserApprovalStatus: 'pending'`)
 *   5. `postStatus === 'approved'`      → Approved
 *   6. `postStatus === 'processing'`    → Processing
 *   7. otherwise                        → Approval pending by admin
 */

import { AlertCircle, CheckCircle2, Clock, RotateCw } from 'lucide-react';
import { cn } from './utils';

export type ScheduledPostStatusInput = {
  postStatus?: string | null;
  UserApprovalStatus?: string | null;
  error?: string | null;
  errors?: string[] | null;
};

export type DisplayStatusVariant =
  | 'failed'
  | 'posted'
  | 'approved'
  | 'processing'
  | 'rejected'
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
      return 'bg-red-50 text-red-700 border-red-200';
    case 'posted':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'approved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'processing':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'rejected':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'pendingByYou':
      return 'bg-sky-50 text-sky-800 border-sky-200';
    case 'pendingByAdmin':
      return 'bg-indigo-50 text-indigo-800 border-indigo-200';
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
    case 'pendingByYou':
    case 'pendingByAdmin':
      return <Clock className={cls} />;
  }
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
    case 'scheduler':
      return 'Schedule Post';
    case 'instant-generation':
      return 'Quick Create';
    case 'bulk-create':
      return 'Bulk Create';
    case 'quick-create':
      return 'Quick Create';
    default:
      return trimmed;
  }
}
