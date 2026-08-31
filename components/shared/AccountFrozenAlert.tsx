'use client';

import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUserPlanCredits } from '@/app/(main)/_components/UserPlanCreditsProvider';

type Props = {
  className?: string;
  /** Hide the billing CTA when already on the billing page. */
  showBillingLink?: boolean;
};

export function AccountFrozenAlert({
  className,
  showBillingLink = true,
}: Props) {
  const { billing } = useUserPlanCredits();

  if (billing?.isAccountFrozen !== true) return null;

  return (
    <Alert
      variant="default"
      role="alert"
      className={cn(
        'rounded-2xl border-2 border-warning bg-warning text-warning',
        'dark:border-warning dark:bg-warning dark:text-warning',
        className
      )}
    >
      <TriangleAlert
        className="size-5 text-warning dark:text-warning"
        aria-hidden
      />
      <AlertTitle className="text-base font-semibold text-warning dark:text-warning">
        Your account is frozen
      </AlertTitle>
      <AlertDescription className="mt-1.5 space-y-3 text-sm text-warning dark:text-warning">
        <p>
          Most of the app is locked until your account is unfrozen. You can
          still manage billing, linked profiles, and contact support.
        </p>
        {showBillingLink ? (
          <Button
            asChild
            size="sm"
            className="rounded-full bg-[var(--amber-9)] text-white hover:bg-warning dark:bg-[var(--amber-9)] dark:hover:bg-warning"
          >
            <Link href="/settings/billings">Go to billing</Link>
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
