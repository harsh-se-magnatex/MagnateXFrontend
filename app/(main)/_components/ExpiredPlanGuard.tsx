'use client';

import { useLayoutEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { WORKSPACE_NAV_HREFS } from '@/lib/workspace-nav';
import { isPlanExpired } from '@/lib/plan-access';
import { useUserPlanCredits } from './UserPlanCreditsProvider';

const REDIRECT_WHEN_EXPIRED = '/settings/billings';

/** Same allow-list as frozen accounts — billing / support / linked profiles. */
const EXPIRED_ALLOWED_PREFIXES = [
  '/settings/billings',
  '/settings/support-legal',
  WORKSPACE_NAV_HREFS.linkedProfiles,
] as const;

export function isPathAllowedWhenPlanExpired(pathname: string): boolean {
  return EXPIRED_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Blocks paid workspace routes only while `planExpiresAt` is in the past
 * (stale paid state before/while backend reconcile clears fields).
 *
 * Does NOT treat never-subscribed / already-cleared `non-subscribed` users
 * as expired — those keep normal free-tier navigation; individual pages
 * still use `isPlanInactive` for feature gates.
 */
export function ExpiredPlanGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { billing, loading } = useUserPlanCredits();

  const expired = isPlanExpired(billing?.planExpiresAt);
  const frozen = billing?.isAccountFrozen === true;
  const allowed = isPathAllowedWhenPlanExpired(pathname);
  const shouldBlock = !loading && expired && !frozen && !allowed;

  useLayoutEffect(() => {
    if (!shouldBlock) return;
    router.replace(REDIRECT_WHEN_EXPIRED);
  }, [shouldBlock, router]);

  if (shouldBlock) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
        <p className="text-sm text-secondary">
          Your plan has ended. Taking you to billing…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
