'use client';

import { readStoredConsent } from '@/lib/cookie-consent';

type FbqFn = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  push?: FbqFn;
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;
  }
}

const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || '28610171068672379';

let scriptInjected = false;

function injectPixelScript(): void {
  if (typeof window === 'undefined' || scriptInjected) return;

  if (!window.fbq) {
    const fbq: FbqFn = function (...args: unknown[]) {
      if (fbq.callMethod) {
        fbq.callMethod.apply(fbq, args);
      } else {
        fbq.queue?.push(args);
      }
    };
    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }

  scriptInjected = true;
}

function clearPixelCookies(): void {
  if (typeof document === 'undefined') return;

  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim();
    if (!name || !/^_fbp$|^_fbc$/.test(name)) continue;
    document.cookie = `${name}=; Max-Age=0; path=/`;
  }
}

/** Loads and initialises the Meta Pixel, or tears it down, based on marketing consent. */
export function applyMetaPixelConsent(enabled: boolean): void {
  if (!enabled) {
    clearPixelCookies();
    return;
  }
  if (!META_PIXEL_ID) return;

  injectPixelScript();
  window.fbq?.('init', META_PIXEL_ID);
  window.fbq?.('track', 'PageView');
}

export function syncMetaPixelWithStoredConsent(): void {
  const consent = readStoredConsent();
  applyMetaPixelConsent(Boolean(consent?.marketing));
}

export function trackMetaPixelPageView(): void {
  const consent = readStoredConsent();
  if (!consent?.marketing || !scriptInjected) return;
  window.fbq?.('track', 'PageView');
}
