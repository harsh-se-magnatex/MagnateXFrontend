'use client';

import { useLayoutEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUserPlanCredits } from './UserPlanCreditsProvider';

const REDIRECT_WHEN_FROZEN = '/settings/billings';

import { WORKSPACE_NAV_HREFS } from '@/lib/workspace-nav';

/** Billing page + connected accounts — only routes accessible when account is frozen. */
export function isPathAllowedWhenFrozen(pathname: string): boolean {
  if (
    pathname === '/settings/billings' ||
    pathname.startsWith('/settings/billings/')
  ) {
    return true;
  }
  const linked = WORKSPACE_NAV_HREFS.linkedProfiles;
  if (pathname === linked || pathname.startsWith(`${linked}/`)) {
    return true;
  }
  return false;
}

export function FrozenAccountGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { billing, loading } = useUserPlanCredits();

  const frozen = billing?.isAccountFrozen === true;
  const allowed = isPathAllowedWhenFrozen(pathname);

  useLayoutEffect(() => {
    if (loading || !frozen || allowed) return;
    router.replace(REDIRECT_WHEN_FROZEN);
  }, [loading, frozen, allowed, router]);

  if (!loading && frozen && !allowed) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
        <p className="text-sm text-muted-foreground">
          This area is unavailable while your account is frozen. Taking you to
          billing…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
