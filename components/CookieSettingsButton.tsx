'use client';

import { openCookieSettings } from '@/lib/cookie-consent';

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className="text-sm text-link underline underline-offset-4"
    >
      Cookie settings
    </button>
  );
}
