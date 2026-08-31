'use client';

import * as React from 'react';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { CookieConsent } from '@/lib/cookie-consent';
import { readStoredConsent } from '@/lib/cookie-consent';

function hasAnalyticsConsent(): boolean {
  return readStoredConsent()?.analytics === true;
}

export function ConsentAwareAnalytics() {
  const [enabled, setEnabled] = React.useState(false);

  React.useEffect(() => {
    setEnabled(hasAnalyticsConsent());

    const onConsentUpdated = (event: Event) => {
      const detail = (event as CustomEvent<CookieConsent>).detail;
      setEnabled(detail.analytics === true);
    };

    window.addEventListener('cookieConsentUpdated', onConsentUpdated);
    return () => {
      window.removeEventListener('cookieConsentUpdated', onConsentUpdated);
    };
  }, []);

  const beforeSend = React.useCallback(
    <T,>(event: T): T | null => (hasAnalyticsConsent() ? event : null),
    []
  );

  if (!enabled) return null;

  return (
    <>
      <Analytics beforeSend={beforeSend} />
      <SpeedInsights beforeSend={beforeSend} />
    </>
  );
}
