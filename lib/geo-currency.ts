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

/**
 * Dodo's Adaptive Currency converts the USD base at live rates and adds a 4%
 * markup on orders under $500 — which is every plan and pack we sell. Building
 * that into the displayed figure keeps us from quoting *below* what the card is
 * actually charged, which is the one direction it is unacceptable to be wrong in.
 *
 * Set this to 0 ONLY after confirming Localized Pricing is configured in the
 * Dodo dashboard for these products — that mode overrides Adaptive Currency and
 * absorbs the FX fee, so the markup would then over-quote.
 * https://docs.dodopayments.com/features/adaptive-currency
 */
export const DODO_FX_MARKUP = 0.04;

/**
 * Hand-maintained, intentionally not a live API call: the figure is approximate
 * by construction, a static table adds no runtime dependency and no new
 * sub-processor to disclose, and it renders identically on server and client
 * (no hydration mismatch). Refresh periodically and move the date with it — the
 * date is shown to users, so drift is self-evident rather than silent.
 */
export const RATES_AS_OF = '2026-08-30';

const FX_RATES: Record<SupportedCurrency, number> = {
  USD: 1,
  INR: 87.5,
  EUR: 0.92,
  GBP: 0.78,
  AED: 3.67,
  SGD: 1.34,
  AUD: 1.52,
  CAD: 1.37,
  JPY: 152,
  BRL: 5.45,
  ZAR: 18.2,
  MXN: 18.6,
};

/** Currencies conventionally written without minor units. */
const ZERO_DECIMAL: ReadonlySet<SupportedCurrency> = new Set(['JPY']);

/**
 * Round UP to a tidy local increment. Up, never down — a rounded-down figure
 * would under-quote the real charge, and the whole point of this module is that
 * the number a nervous international buyer sees is not lower than their bill.
 */
function roundUpToIncrement(value: number, currency: SupportedCurrency): number {
  if (currency === USD) return value;
  // Increment scales with magnitude so the rounding error stays under ~1%.
  // Rounding a £12.16 up to a tidy £13 would overstate by 7% — safe, but it
  // gives away the very saving the localised price is meant to communicate.
  if (ZERO_DECIMAL.has(currency)) return Math.ceil(value / 10) * 10;
  if (value >= 1000) return Math.ceil(value / 10) * 10;
  if (value >= 100) return Math.ceil(value);
  return Math.ceil(value * 100) / 100;
}

/** USD list price → approximate local amount, markup applied. */
export function convertFromUsd(
  usd: number,
  currency: SupportedCurrency
): number {
  if (currency === USD) return usd;
  const rate = FX_RATES[currency];
  if (!rate) return usd;
  return roundUpToIncrement(usd * rate * (1 + DODO_FX_MARKUP), currency);
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
  currency: SupportedCurrency
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
  return {
    display: `≈ ${formatAmount(convertFromUsd(usd, currency), currency)}`,
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
  'Converted from USD for reference only. Your final amount and currency are set at checkout by Dodo Payments, our Merchant of Record, and may differ slightly depending on your billing country, local taxes, and exchange rate.';

export const COUNTRY_COOKIE = 'sg-country';
export const CURRENCY_COOKIE = 'sg-currency';
export const PREFERENCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;
