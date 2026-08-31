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

  const hasEmail = Boolean(user.email?.trim());

  return (
    <Alert
      variant="default"
      className={className ?? 'rounded-2xl border-warning bg-warning'}
    >
      <Mail className="size-5 text-warning dark:text-warning" />
      <AlertTitle className="text-default">
        {hasEmail ? 'Verify your email' : 'Add a verified email'}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3 text-secondary">
        <p>{EMAIL_VERIFICATION_PURCHASE_MESSAGE}</p>
        <Button
          asChild
          size="sm"
          className="rounded-full bg-[var(--amber-9)] text-white hover:bg-warning dark:bg-[var(--amber-9)] dark:hover:bg-warning"
        >
          <Link href="/settings/account">Go to account settings</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
