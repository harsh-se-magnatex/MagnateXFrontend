'use client';

import Link from 'next/link';
import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { CreditCard, Lock, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PaymentReturnContent } from './context/payment-return-content';

function PaymentLanding() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12 font-(--font-sora) text-default">
      <div className="relative w-full max-w-lg animate-in fade-in duration-500">
        <div className="glass-card rounded-3xl border border-default bg-default p-8 dark:border-default dark:bg-default sm:p-10">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-preview text-preview ring-1 ring-[var(--border-preview)] dark:bg-preview dark:text-preview dark:ring-[var(--border-preview)]">
            <CreditCard className="h-8 w-8" aria-hidden />
          </div>

          <p className="text-center text-xs font-bold uppercase tracking-[0.15em] text-secondary">
            Payments
          </p>
          <h1 className="text-page-title text-default mt-2">
            <span className="bg-gradient-primary-text">Secure</span> checkout
          </h1>
          <p className="mt-4 text-center text-sm leading-relaxed text-secondary font-(--font-dm-sans)">
            Continue to our encrypted payment flow powered by Dodo Payments.
            Your card details stay on their secure form.
          </p>

          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-secondary font-(--font-dm-sans)">
            <Lock className="size-3.5 shrink-0 text-link" aria-hidden />
            <span>TLS-encrypted session</span>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="w-full sm:w-auto gap-2">
              <Link href="/payment/checkout">
                Continue to checkout
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
            >
              <Link href="/settings/billings">Billings &amp; credits</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentPageBody() {
  const searchParams = useSearchParams();

  const isCheckoutReturn = useMemo(() => {
    const status = searchParams.get('status')?.trim() ?? '';
    const subscriptionId = searchParams.get('subscription_id')?.trim() ?? '';
    const email = searchParams.get('email')?.trim() ?? '';
    const sessionId = searchParams.get('session_id')?.trim() ?? '';
    const orderId = searchParams.get('order_id')?.trim() ?? '';
    return Boolean(status || subscriptionId || email || sessionId || orderId);
  }, [searchParams]);

  if (isCheckoutReturn) {
    return <PaymentReturnContent />;
  }

  return <PaymentLanding />;
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<PaymentLanding />}>
      <PaymentPageBody />
    </Suspense>
  );
}
