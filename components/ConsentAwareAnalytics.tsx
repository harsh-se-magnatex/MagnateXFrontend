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
      window.clarity?.('consentv2', {
        analytics_Storage: detail.analytics ? 'granted' : 'denied',
        ad_Storage: detail.marketing && detail.analytics ? 'granted' : 'denied',
      });
      // Denied storage can still allow cookieless Clarity tracking. Reload
      // after withdrawal to unload the running tracker; the saved choice
      // prevents it from loading again.
      if (detail.analytics !== true && window.clarity) {
        // Clear first-party identifiers on both the host and parent domains.
        const parts = window.location.hostname.split('.');
        for (const name of ['_clck', '_clsk']) {
          document.cookie = `${name}=; Max-Age=0; path=/`;
          for (let i = 0; i < parts.length - 1; i++) {
            document.cookie = `${name}=; Max-Age=0; path=/; domain=${parts.slice(i).join('.')}`;
          }
        }
        window.location.reload();
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
          var consent;
          try { consent=JSON.parse(localStorage.getItem('sg-cookie-consent')); } catch(e) { return; }
          if (!consent || consent.version !== 2 || consent.analytics !== true || navigator.globalPrivacyControl === true) return;
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          c[a]('consentv2', { analytics_Storage: 'granted', ad_Storage: consent.marketing === true ? 'granted' : 'denied' });
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");`}
      </Script>
    </>
  );
}
