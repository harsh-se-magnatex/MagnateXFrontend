/**
 * Scheduled-post regeneration pricing — mirrors
 * `backend/apps/worker/src/pipelines/ai-engine/regenerate/regenerate_scheduled_post.ts`:
 * first user regen is free (`regenratedCount` starts at `0`), every regen after
 * that deducts {@link SCHEDULED_POST_REGENERATE_CREDIT} credit when
 * `priorRegenCount >= 1`.
 */
export const SCHEDULED_POST_REGENERATE_CREDIT = 1;

export type ScheduledPostRegenFields = {
  regenratedCount?: number;
  regeneratedCount?: number;
};

export function getScheduledPostRegenCount(
  post: ScheduledPostRegenFields
): number {
  const n = post.regeneratedCount ?? post.regenratedCount;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

/** True when the *next* regen will charge credits (count already >= 1). */
export function willScheduledPostRegenChargeCredits(
  post: ScheduledPostRegenFields
): boolean {
  return getScheduledPostRegenCount(post) >= 1;
}
