export const COOKIE_CONSENT_STORAGE_KEY = 'sg-cookie-consent';

export function hasGlobalPrivacyControl(): boolean {
  return typeof navigator !== 'undefined' &&
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

export type CookieConsent = {
  version: 2;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

export function readStoredConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (
      parsed.version !== 2 ||
      typeof parsed.analytics !== 'boolean' ||
      typeof parsed.marketing !== 'boolean'
    ) {
      return null;
    }
    return {
      version: 2,
      necessary: true,
      analytics: parsed.analytics && !hasGlobalPrivacyControl(),
      marketing: parsed.marketing && !hasGlobalPrivacyControl(),
      updatedAt:
        typeof parsed.updatedAt === 'string'
          ? parsed.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function persistConsent(analytics: boolean, marketing: boolean) {
  const consent: CookieConsent = {
    version: 2,
    necessary: true,
    analytics: analytics && !hasGlobalPrivacyControl(),
    marketing: marketing && !hasGlobalPrivacyControl(),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(consent));
  window.dispatchEvent(
    new CustomEvent<CookieConsent>('cookieConsentUpdated', { detail: consent })
  );
}

export function openCookieSettings() {
  window.dispatchEvent(new Event('openCookieSettings'));
}
