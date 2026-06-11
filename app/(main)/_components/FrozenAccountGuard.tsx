'use client';

import { useLayoutEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUserPlanCredits } from './UserPlanCreditsProvider';

const REDIRECT_WHEN_FROZEN = '/settings/billings';

/** Billing page + linked social accounts — only routes accessible when account is frozen. */
export function isPathAllowedWhenFrozen(pathname: string): boolean {
  if (
    pathname === '/settings/billings' ||
    pathname.startsWith('/settings/billings/')
  ) {
    return true;
  }
  if (
    pathname === '/social-media-integration' ||
    pathname.startsWith('/social-media-integration/')
  ) {
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
