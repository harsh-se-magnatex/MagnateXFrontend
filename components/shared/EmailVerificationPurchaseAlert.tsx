'use client';

import Link from 'next/link';
import type { User } from 'firebase/auth';
import { Mail } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  EMAIL_VERIFICATION_PURCHASE_MESSAGE,
  needsEmailVerificationForPurchase,
} from '@/lib/email-verification-for-purchase';

type Props = {
  user: User;
  className?: string;
};

export function EmailVerificationPurchaseAlert({ user, className }: Props) {
  if (!needsEmailVerificationForPurchase(user)) return null;

  return (
    <Alert
      variant="default"
      className={className ?? 'rounded-2xl border-amber-500/30 bg-amber-500/5'}
    >
      <Mail className="size-5 text-amber-600 dark:text-amber-500" />
      <AlertTitle className="text-foreground">Verify your email</AlertTitle>
      <AlertDescription className="mt-2 space-y-3 text-foreground/90">
        <p>{EMAIL_VERIFICATION_PURCHASE_MESSAGE}</p>
        <Button
          asChild
          size="sm"
          className="rounded-lg bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
        >
          <Link href="/settings/account">Go to account settings</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
