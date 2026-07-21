import type { UserPlanCredits } from '@/app/(main)/_components/UserPlanCreditsProvider';

type PlanExpiryTs = {
  seconds: number;
  nanoseconds: number;
} | null | undefined;

export function planExpiresAtToMs(ts: PlanExpiryTs): number | null {
  if (!ts) return null;
  return ts.seconds * 1000 + ts.nanoseconds / 1e6;
}

/** True when `planExpiresAt` is set and already in the past. */
export function isPlanExpired(planExpiresAt: PlanExpiryTs, now = Date.now()): boolean {
  const ms = planExpiresAtToMs(planExpiresAt);
  return ms != null && ms < now;
}

/**
 * True when the user cannot use subscribed features:
 * - `activePlan` is missing / `non-subscribed`, or
 * - `planExpiresAt` is in the past (plan id may still be set).
 *
 * Returns `false` when `billing` is null/undefined so callers can keep a
 * separate loading gate (same as checking `billing?.activePlan === …`).
 */
export function isPlanInactive(
  billing:
    | Pick<UserPlanCredits, 'activePlan' | 'planExpiresAt'>
    | null
    | undefined,
  now = Date.now()
): boolean {
  if (!billing) return false;
  if (!billing.activePlan || billing.activePlan === 'non-subscribed') {
    return true;
  }
  return isPlanExpired(billing.planExpiresAt, now);
}
