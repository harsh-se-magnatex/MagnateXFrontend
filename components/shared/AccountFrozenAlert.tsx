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
        'rounded-2xl border-2 border-amber-500/60 bg-amber-50 text-amber-950 shadow-sm',
        'dark:border-amber-500/50 dark:bg-amber-950/40 dark:text-amber-50',
        className
      )}
    >
      <TriangleAlert
        className="size-5 text-amber-600 dark:text-amber-400"
        aria-hidden
      />
      <AlertTitle className="text-base font-semibold text-amber-950 dark:text-amber-50">
        Your account is frozen
      </AlertTitle>
      <AlertDescription className="mt-1.5 space-y-3 text-sm text-amber-900/95 dark:text-amber-100/90">
        <p>
          Most of the app is locked until your account is unfrozen. You can still
          manage billing, linked profiles, and contact support.
        </p>
        {showBillingLink ? (
          <Button
            asChild
            size="sm"
            className="rounded-lg bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            <Link href="/settings/billings">Go to billing</Link>
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
