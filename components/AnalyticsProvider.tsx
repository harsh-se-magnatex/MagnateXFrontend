'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import type { CookieConsent } from '@/lib/cookie-consent';
import {
  applyAnalyticsConsent,
  syncAnalyticsWithStoredConsent,
  trackPageView,
} from '@/lib/analytics';

export function AnalyticsProvider() {
  const pathname = usePathname();

  useEffect(() => {
    void syncAnalyticsWithStoredConsent();

    const onConsentUpdated = (event: Event) => {
      const detail = (event as CustomEvent<CookieConsent>).detail;
      void applyAnalyticsConsent(detail.analytics).then(() => {
        if (detail.analytics && pathname) {
          void trackPageView(pathname);
        }
      });
    };

    window.addEventListener('cookieConsentUpdated', onConsentUpdated);
    return () => {
      window.removeEventListener('cookieConsentUpdated', onConsentUpdated);
    };
  }, [pathname]);

  useEffect(() => {
    if (!pathname) return;
    void trackPageView(pathname);
  }, [pathname]);

  return null;
}
