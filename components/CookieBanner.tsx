'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Cookie } from 'lucide-react';
// 11april2026
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  type CookieConsent,
  persistConsent,
  readStoredConsent,
} from '@/lib/cookie-consent';

export type { CookieConsent };

type Step = 'main' | 'customize';

/**
 * Blocking consent gate. Necessary cookies are required to run the app, so
 * this renders as a modal over an inert page rather than a dismissible
 * bottom banner — there is no path past it except making a choice.
 *
 * Optional categories stay genuinely optional: "Essential only" is a
 * first-class exit that grants access while declining analytics. The gate
 * is on acknowledging the required cookies, never on accepting the
 * optional ones.
 */
export function CookieBanner() {
  const [mounted, setMounted] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const [step, setStep] = React.useState<Step>('main');
  const [analytics, setAnalytics] = React.useState(false);
  const [marketing, setMarketing] = React.useState(false);
  const dialogRef = React.useRef<HTMLDivElement>(null);

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

  // Freeze the page behind the gate. The landing page scrolls on <html>,
  // not <body>, so locking body alone leaves the document scrollable —
  // both elements have to be pinned.
  React.useEffect(() => {
    if (!visible) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [visible]);

  // Keep focus inside the dialog — nothing behind it is actionable, so
  // tabbing out would strand keyboard users on inert content.
  React.useEffect(() => {
    if (!visible) return;
    dialogRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [visible, step]);

  const close = React.useCallback(
    (nextAnalytics: boolean, nextMarketing: boolean) => {
      persistConsent(nextAnalytics, nextMarketing);
      setVisible(false);
      setStep('main');
    },
    []
  );

  const handleAcceptAll = () => close(true, true);
  /** Declines every optional category but still grants access. */
  const handleEssentialOnly = () => close(false, false);
  const handleSaveCustom = () => close(analytics, marketing);

  if (!mounted || !visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-gate-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          'my-auto w-full max-w-lg rounded-2xl border border-default bg-default text-default outline-none',
          'dark:border-default dark:bg-default'
        )}
      >
        {step === 'main' ? (
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-link ring-1 ring-strong">
                <Cookie className="size-5" aria-hidden />
              </span>
              <h2 id="cookie-gate-title" className="text-section text-default">
                Before you continue
              </h2>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-secondary sm:text-[0.9375rem]">
              SocioGenie needs a small number of{' '}
              <span className="font-medium text-default">
                essential cookies
              </span>{' '}
              to sign you in and keep your session secure — the app can&apos;t
              run without them. Analytics cookies are optional and entirely your
              choice. Read our{' '}
              <Link
                href="/legal/cookie"
                className="font-medium text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strong rounded-sm"
              >
                Cookie Policy
              </Link>
              .
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <Button
                type="button"
                variant="default"
                className="w-full"
                onClick={handleAcceptAll}
              >
                Accept all cookies
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleEssentialOnly}
              >
                Accept essential only
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setStep('customize')}
              >
                Customize settings
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex max-h-[min(85vh,32rem)] flex-col">
            <div className="flex shrink-0 items-center gap-2 border-b border-default px-4 py-3 sm:px-5">
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
              <h2 className="text-section text-default">Cookie settings</h2>
            </div>
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
              <p className="text-sm leading-relaxed text-secondary">
                Our website uses cookies to distinguish you from other users of
                our website. This helps us provide you with a more personalized
                experience when you browse our website and also allows us to
                improve our site. Cookies may collect information that is used
                to tailor ads shown to you on our website and other websites.
                The information might be about you, your preferences or your
                device. The information does not usually directly identify you,
                but it can give you a more personalized web experience. You can
                choose not to allow some types of cookies.
              </p>

              <ul className="mt-6 space-y-5">
                <li className="rounded-xl border border-default bg-element p-4 dark:bg-element">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-default">Necessary</p>
                      <p className="mt-1 text-sm text-secondary">
                        Enables security, sign-in and basic functionality.
                        Required to use SocioGenie.
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Switch
                        checked
                        disabled
                        aria-readonly
                        className="pointer-events-none"
                      />
                      <span className="text-xs font-medium text-secondary">
                        Required
                      </span>
                    </div>
                  </div>
                </li>

                <li className="rounded-xl border border-default bg-element p-4 dark:bg-element">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-default">Analytics</p>
                      <p className="mt-1 text-sm text-secondary">
                        Enables tracking of site performance.
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Switch
                        checked={analytics}
                        onCheckedChange={setAnalytics}
                        aria-label="Analytics cookies"
                      />
                      <span className="text-xs font-medium text-secondary">
                        {analytics ? 'On' : 'Off'}
                      </span>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
            <div className="flex shrink-0 flex-col gap-2 border-t border-default p-4 sm:flex-row sm:justify-end sm:px-5 sm:py-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => setStep('main')}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="w-full sm:w-auto"
                onClick={handleSaveCustom}
              >
                Accept &amp; continue
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
