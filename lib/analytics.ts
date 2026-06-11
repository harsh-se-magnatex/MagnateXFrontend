'use client';

import type { Analytics } from 'firebase/analytics';
import {
  getAnalytics,
  isSupported,
  logEvent,
  setAnalyticsCollectionEnabled,
} from 'firebase/analytics';
import app from '@/lib/firebase';
import { readStoredConsent } from '@/lib/cookie-consent';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

let analyticsInstance: Analytics | null = null;
let initPromise: Promise<Analytics | null> | null = null;

function hasMeasurementId(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_MEASUREMENT_ID?.trim());
}

function shouldEnableDebugMode(): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('ga_debug');
}

function enableGaDebugMode(): void {
  const measurementId = process.env.NEXT_PUBLIC_MEASUREMENT_ID?.trim();
  if (!measurementId || typeof window.gtag !== 'function') return;
  window.gtag('config', measurementId, { debug_mode: true });
}

async function getOrInitAnalytics(): Promise<Analytics | null> {
  if (typeof window === 'undefined' || !hasMeasurementId()) return null;
  if (analyticsInstance) return analyticsInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const supported = await isSupported();
    if (!supported) return null;
    analyticsInstance = getAnalytics(app);
    if (shouldEnableDebugMode()) {
      enableGaDebugMode();
    }
    return analyticsInstance;
  })();

  return initPromise;
}

export async function applyAnalyticsConsent(enabled: boolean): Promise<void> {
  if (!hasMeasurementId()) return;

  if (!enabled) {
    if (analyticsInstance) {
      setAnalyticsCollectionEnabled(analyticsInstance, false);
    }
    return;
  }

  const analytics = await getOrInitAnalytics();
  if (analytics) {
    setAnalyticsCollectionEnabled(analytics, true);
  }
}

export async function syncAnalyticsWithStoredConsent(): Promise<void> {
  const consent = readStoredConsent();
  await applyAnalyticsConsent(Boolean(consent?.analytics));
}

type AuthMethod = 'google' | 'password' | 'phone' | string;

export async function trackSignUp(method: AuthMethod): Promise<void> {
  const consent = readStoredConsent();
  if (!consent?.analytics || !hasMeasurementId()) return;

  const analytics = await getOrInitAnalytics();
  if (!analytics) return;

  logEvent(analytics, 'sign_up', { method });
}

export async function trackLogin(method: AuthMethod): Promise<void> {
  const consent = readStoredConsent();
  if (!consent?.analytics || !hasMeasurementId()) return;

  const analytics = await getOrInitAnalytics();
  if (!analytics) return;

  logEvent(analytics, 'login', { method });
}

export async function trackPageView(path: string): Promise<void> {
  const consent = readStoredConsent();
  if (!consent?.analytics || !hasMeasurementId()) return;

  const analytics = await getOrInitAnalytics();
  if (!analytics) return;

  logEvent(analytics, 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
