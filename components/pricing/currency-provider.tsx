'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  COUNTRY_COOKIE,
  CURRENCY_COOKIE,
  PREFERENCE_COOKIE_MAX_AGE,
  USD,
  currencyForCountry,
  isSupportedCurrency,
  type SupportedCurrency,
} from '@/lib/geo-currency';

/**
 * Display currency, resolved on the client.
 *
 * Deliberately client-side rather than reading cookies() in a Server Component:
 * that would opt every marketing page out of static rendering for a purely
 * cosmetic value. Instead the server renders USD — which is the authoritative
 * settlement currency, so the pre-hydration state is correct rather than a wrong
 * guess — and this upgrades it once mounted. Non-USD visitors see one brief
 * swap on first paint, then the cookie makes it stable.
 *
 * Resolution order: explicit user choice > detected country > USD.
 */

type CurrencyContextValue = {
  currency: SupportedCurrency;
  /** False until the client has resolved, so callers can avoid flashing. */
  isResolved: boolean;
  /** True when the user picked it, rather than it being inferred. */
  isExplicit: boolean;
  setCurrency: (next: SupportedCurrency) => void;
};

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: USD,
  isResolved: false,
  isExplicit: false,
  setCurrency: () => {},
});

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]*)`)
  );
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${PREFERENCE_COOKIE_MAX_AGE}; samesite=lax`;
}

/**
 * Country of last resort, inferred from the IANA time zone the browser already
 * reports. No network call, no IP processing, no permission prompt — and it
 * works on hosts that expose no geo header at all, which matters here because
 * the deployment target isn't settled. Same technique already used for
 * scheduling in `lib/user-timezone.tsx`.
 */
const TIMEZONE_COUNTRY: Record<string, string> = {
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Europe/London': 'GB',
  'Europe/Dublin': 'IE',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Vienna': 'AT',
  'Europe/Lisbon': 'PT',
  'Europe/Helsinki': 'FI',
  'Europe/Athens': 'GR',
  'Asia/Dubai': 'AE',
  'Asia/Singapore': 'SG',
  'Asia/Tokyo': 'JP',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Edmonton': 'CA',
  'America/Sao_Paulo': 'BR',
  'Africa/Johannesburg': 'ZA',
  'America/Mexico_City': 'MX',
};

function countryFromTimeZone(): string | undefined {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz ? TIMEZONE_COUNTRY[tz] : undefined;
  } catch {
    return undefined;
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<SupportedCurrency>(USD);
  const [isResolved, setIsResolved] = useState(false);
  const [isExplicit, setIsExplicit] = useState(false);

  useEffect(() => {
    const chosen = readCookie(CURRENCY_COOKIE);
    if (isSupportedCurrency(chosen)) {
      setCurrencyState(chosen.toUpperCase() as SupportedCurrency);
      setIsExplicit(true);
      setIsResolved(true);
      return;
    }

    // Middleware writes this when the host provides a geo header.
    let country = readCookie(COUNTRY_COOKIE);
    if (!country) {
      country = countryFromTimeZone();
      // Cache it so later navigations skip the inference entirely.
      if (country) writeCookie(COUNTRY_COOKIE, country);
    }
    setCurrencyState(currencyForCountry(country));
    setIsResolved(true);
  }, []);

  const setCurrency = useCallback((next: SupportedCurrency) => {
    setCurrencyState(next);
    setIsExplicit(true);
    writeCookie(CURRENCY_COOKIE, next);
  }, []);

  const value = useMemo(
    () => ({ currency, isResolved, isExplicit, setCurrency }),
    [currency, isResolved, isExplicit, setCurrency]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext);
}
