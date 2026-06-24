/**
 * Scheduled-post regeneration pricing — mirrors
 * `backend/apps/worker/src/pipelines/ai-engine/regenerate/regenerate_scheduled_post.ts`:
 *
 * - `regenratedCount` starts at `0` on a new post.
 * - 1st regen (count 0): free.
 * - 2nd regen (count 1): 1 credit.
 * - 3rd regen onward (count ≥ 2): not allowed.
 */
export const SCHEDULED_POST_REGENERATE_CREDIT = 1;
export const SCHEDULED_POST_MAX_REGENERATIONS = 2;

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

/** True when another regen is still allowed on this post. */
export function canScheduledPostRegenerate(
  post: ScheduledPostRegenFields
): boolean {
  return getScheduledPostRegenCount(post) < SCHEDULED_POST_MAX_REGENERATIONS;
}

/** True when the *next* regen will charge credits (2nd attempt only). */
export function willScheduledPostRegenChargeCredits(
  post: ScheduledPostRegenFields
): boolean {
  return getScheduledPostRegenCount(post) === 1;
}
