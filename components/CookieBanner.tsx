'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
// 11april2026
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'sg-cookie-consent';

export type CookieConsent = {
  version: 1;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

function readStoredConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (parsed.version !== 1 || typeof parsed.analytics !== 'boolean' || typeof parsed.marketing !== 'boolean') {
      return null;
    }
    return {
      version: 1,
      necessary: true,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function persistConsent(analytics: boolean, marketing: boolean) {
  const consent: CookieConsent = {
    version: 1,
    necessary: true,
    analytics,
    marketing,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent<CookieConsent>('cookieConsentUpdated', { detail: consent }));
}

type Step = 'main' | 'customize';

export function CookieBanner() {
  const [mounted, setMounted] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const [step, setStep] = React.useState<Step>('main');
  const [analytics, setAnalytics] = React.useState(false);
  const [marketing, setMarketing] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const existing = readStoredConsent();
    if (!existing) {
      setVisible(true);
      return;
    }
    setAnalytics(existing.analytics);
    setMarketing(existing.marketing);
  }, []);

  const close = React.useCallback((nextAnalytics: boolean, nextMarketing: boolean) => {
    persistConsent(nextAnalytics, nextMarketing);
    setVisible(false);
    setStep('main');
  }, []);

  const handleAcceptAll = () => close(true, true);
  const handleRejectAll = () => close(false, false);

  const handleSaveCustom = () => close(analytics, marketing);

  if (!mounted || !visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6 pointer-events-none"
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
    >
      <div
        className={cn(
          'pointer-events-auto mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card/95 text-card-foreground shadow-xl backdrop-blur-md',
          'dark:border-border dark:bg-card/90'
        )}
      >
        {step === 'main' ? (
          <div className="p-5 sm:p-6">
            <p className="text-sm leading-relaxed text-foreground sm:text-[0.9375rem]">
              We use cookies to deliver and improve our services, analyze site usage, and if you agree, to
              customize or personalize your experience and market our services to you. You can read our{' '}
              <Link
                href="/legal/cookie"
                className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                Cookie Policy
              </Link>{' '}
              here.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
              <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setStep('customize')}>
                Customize Cookie Settings
              </Button>
              <Button type="button" variant="ghost" size="sm" className="w-full sm:w-auto" onClick={handleRejectAll}>
                Reject all Cookies
              </Button>
              <Button type="button" variant="default" size="sm" className="w-full sm:w-auto" onClick={handleAcceptAll}>
                Accept all cookies
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex max-h-[min(85vh,32rem)] flex-col">
            <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3 sm:px-5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                onClick={() => setStep('main')}
                aria-label="Back to cookie summary"
              >
                <ArrowLeft className="size-4" />
              </Button>
              <h2 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">Cookie settings</h2>
            </div>
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Our website uses cookies to distinguish you from other users of our website. This helps us provide
                you with a more personalized experience when you browse our website and also allows us to improve our
                site. Cookies may collect information that is used to tailor ads shown to you on our website and other
                websites. The information might be about you, your preferences or your device. The information does not
                usually directly identify you, but it can give you a more personalized web experience. You can choose
                not to allow some types of cookies.
              </p>

              <ul className="mt-6 space-y-5">
                <li className="rounded-xl border border-border bg-muted/30 p-4 dark:bg-muted/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">Necessary</p>
                      <p className="mt-1 text-sm text-muted-foreground">Enables security and basic functionality.</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Switch checked disabled aria-readonly className="pointer-events-none" />
                      <span className="text-xs font-medium text-muted-foreground">Required</span>
                    </div>
                  </div>
                </li>

                <li className="rounded-xl border border-border bg-muted/30 p-4 dark:bg-muted/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">Analytics</p>
                      <p className="mt-1 text-sm text-muted-foreground">Enables tracking of site performance.</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Switch checked={analytics} onCheckedChange={setAnalytics} aria-label="Analytics cookies" />
                      <span className="text-xs font-medium text-muted-foreground">{analytics ? 'On' : 'Off'}</span>
                    </div>
                  </div>
                </li>

                <li className="rounded-xl border border-border bg-muted/30 p-4 dark:bg-muted/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">Marketing</p>
                      <p className="mt-1 text-sm text-muted-foreground">Enables ads personalization and tracking.</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Switch checked={marketing} onCheckedChange={setMarketing} aria-label="Marketing cookies" />
                      <span className="text-xs font-medium text-muted-foreground">{marketing ? 'On' : 'Off'}</span>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
            <div className="flex shrink-0 flex-col gap-2 border-t border-border p-4 sm:flex-row sm:justify-end sm:px-5 sm:py-4">
              <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setStep('main')}>
                Back
              </Button>
              <Button type="button" variant="default" size="sm" className="w-full sm:w-auto" onClick={handleSaveCustom}>
                Save preferences
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
