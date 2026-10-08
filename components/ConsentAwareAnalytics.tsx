'use client';

import * as React from 'react';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { CookieConsent } from '@/lib/cookie-consent';
import { readStoredConsent } from '@/lib/cookie-consent';

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

const CLARITY_PROJECT_ID = 'yuhpx1o7d7';

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
      // Unmounting <Script> doesn't unload Clarity once it has run, so tell
      // it directly to stop tracking and clear its cookies.
      if (detail.analytics !== true) {
        window.clarity?.('consent', false);
      }
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
      <Script id="microsoft-clarity" strategy="afterInteractive">
        {`(function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");`}
      </Script>
    </>
  );
}
