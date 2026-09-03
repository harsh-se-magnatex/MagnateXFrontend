/**
 * Display-only currency localisation.
 *
 * IMPORTANT: nothing here decides what a customer is charged. The charge is
 * set entirely by the Dodo product in the Dodo dashboard — this repo sends no
 * price and no currency at checkout. Every figure produced by this module is a
 * *reference* conversion from the USD list price and must be rendered with the
 * `≈` marker and an accompanying "billed as $X USD" line.
 *
 * See `PRICING_DISCLAIMER` below for the wording that has to sit next to it.
 */

export const USD = 'USD' as const;

export type SupportedCurrency =
  | 'USD'
  | 'INR'
  | 'EUR'
  | 'GBP'
  | 'AED'
  | 'SGD'
  | 'AUD'
  | 'CAD'
  | 'JPY'
  | 'BRL'
  | 'ZAR'
  | 'MXN';

/**
 * Deliberately small. Every currency here is liquid enough that a hand-refreshed
 * rate stays roughly right for months; highly volatile currencies are excluded
 * on purpose so a stale table can't produce an embarrassing number. Anything
 * unmatched falls back to USD rather than guessing.
 */
export const SUPPORTED_CURRENCIES: {
  code: SupportedCurrency;
  label: string;
}[] = [
  { code: 'USD', label: 'US Dollar' },
  { code: 'INR', label: 'Indian Rupee' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'AED', label: 'UAE Dirham' },
  { code: 'SGD', label: 'Singapore Dollar' },
  { code: 'AUD', label: 'Australian Dollar' },
  { code: 'CAD', label: 'Canadian Dollar' },
  { code: 'JPY', label: 'Japanese Yen' },
  { code: 'BRL', label: 'Brazilian Real' },
  { code: 'ZAR', label: 'South African Rand' },
  { code: 'MXN', label: 'Mexican Peso' },
];

const SUPPORTED_SET = new Set<string>(SUPPORTED_CURRENCIES.map((c) => c.code));

export function isSupportedCurrency(
  value: string | undefined | null
): value is SupportedCurrency {
  return !!value && SUPPORTED_SET.has(value.toUpperCase());
}

/** ISO-3166 alpha-2 → display currency. Unlisted countries get USD. */
const COUNTRY_TO_CURRENCY: Record<string, SupportedCurrency> = {
  IN: 'INR',
  GB: 'GBP',
  AE: 'AED',
  SG: 'SGD',
  AU: 'AUD',
  NZ: 'AUD',
  CA: 'CAD',
  JP: 'JPY',
  BR: 'BRL',
  ZA: 'ZAR',
  MX: 'MXN',
  // Eurozone
  AT: 'EUR',
  BE: 'EUR',
  CY: 'EUR',
  DE: 'EUR',
  EE: 'EUR',
  ES: 'EUR',
  FI: 'EUR',
  FR: 'EUR',
  GR: 'EUR',
  HR: 'EUR',
  IE: 'EUR',
  IT: 'EUR',
  LT: 'EUR',
  LU: 'EUR',
  LV: 'EUR',
  MT: 'EUR',
  NL: 'EUR',
  PT: 'EUR',
  SI: 'EUR',
  SK: 'EUR',
};

export function currencyForCountry(
  countryCode: string | undefined | null
): SupportedCurrency {
  if (!countryCode) return USD;
  return COUNTRY_TO_CURRENCY[countryCode.toUpperCase()] ?? USD;
}

/** Currencies conventionally written without minor units. */
const ZERO_DECIMAL: ReadonlySet<SupportedCurrency> = new Set(['JPY']);

/** USD list price → Frankfurter reference-rate amount, truncated for display. */
export function convertFromUsd(
  usd: number,
  currency: SupportedCurrency,
  exchangeRate?: number | null
): number {
  if (currency === USD) return usd;
  if (typeof exchangeRate !== 'number' || !Number.isFinite(exchangeRate)) {
    return usd;
  }

  const converted = usd * exchangeRate;
  return ZERO_DECIMAL.has(currency)
    ? Math.trunc(converted)
    : Math.trunc(converted * 100) / 100;
}

/** Formats an amount already in `currency`. */
export function formatAmount(
  amount: number,
  currency: SupportedCurrency
): string {
  const fractionDigits = ZERO_DECIMAL.has(currency)
    ? 0
    : Number.isInteger(amount)
      ? 0
      : 2;
  // USD is pinned to en-US because it is the only currency ever rendered during
  // SSR (the provider starts as USD and upgrades after mount). Leaving it on the
  // runtime default would let Node's locale and the browser's disagree and
  // produce a hydration mismatch. Every other currency is client-only, so it can
  // safely use the visitor's own locale conventions.
  const locale = currency === USD ? 'en-US' : undefined;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

/** The canonical USD string, e.g. `$14.99`. */
export function formatUsdPrice(usd: number): string {
  return formatAmount(usd, USD);
}

export type LocalizedPrice = {
  /** What to render large. Carries `≈` when converted. */
  display: string;
  /** The authoritative USD figure, always shown alongside. */
  usdDisplay: string;
  /** True when `display` is a conversion rather than the real charge. */
  isConverted: boolean;
  currency: SupportedCurrency;
};

export function localizePrice(
  usd: number,
  currency: SupportedCurrency,
  exchangeRate?: number | null
): LocalizedPrice {
  const usdDisplay = formatUsdPrice(usd);
  if (currency === USD) {
    return {
      display: usdDisplay,
      usdDisplay,
      isConverted: false,
      currency: USD,
    };
  }
  if (typeof exchangeRate !== 'number' || !Number.isFinite(exchangeRate)) {
    return {
      display: usdDisplay,
      usdDisplay,
      isConverted: false,
      currency: USD,
    };
  }
  return {
    display: `≈ ${formatAmount(convertFromUsd(usd, currency, exchangeRate), currency)}`,
    usdDisplay,
    isConverted: true,
    currency,
  };
}

/**
 * Worded to hold true whichever Dodo currency mode is active — we genuinely do
 * not control, or currently know, which one applies. Do not soften this into a
 * promise about the final figure.
 */
export const PRICING_DISCLAIMER =
  "Converted using Frankfurter's latest reference rate for display only. Your final amount and currency are set at checkout by Dodo Payments and may differ slightly based on checkout rates and taxes.";

export const COUNTRY_COOKIE = 'sg-country';
export const CURRENCY_COOKIE = 'sg-currency';
export const PREFERENCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;
