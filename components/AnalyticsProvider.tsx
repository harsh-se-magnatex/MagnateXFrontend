'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import type { CookieConsent } from '@/lib/cookie-consent';
import {
  applyAnalyticsConsent,
  syncAnalyticsWithStoredConsent,
  trackPageView,
} from '@/lib/analytics';
import {
  applyMetaPixelConsent,
  syncMetaPixelWithStoredConsent,
  trackMetaPixelPageView,
} from '@/lib/meta-pixel';

export function AnalyticsProvider() {
  const pathname = usePathname();

  useEffect(() => {
    void syncAnalyticsWithStoredConsent();
    syncMetaPixelWithStoredConsent();

    const onConsentUpdated = (event: Event) => {
      const detail = (event as CustomEvent<CookieConsent>).detail;
      void applyAnalyticsConsent(detail.analytics).then(() => {
        if (detail.analytics && pathname) {
          void trackPageView(pathname);
        }
      });
      applyMetaPixelConsent(detail.marketing);
    };

    window.addEventListener('cookieConsentUpdated', onConsentUpdated);
    return () => {
      window.removeEventListener('cookieConsentUpdated', onConsentUpdated);
    };
  }, [pathname]);

  useEffect(() => {
    if (!pathname) return;
    void trackPageView(pathname);
    trackMetaPixelPageView();
  }, [pathname]);

  return null;
}
