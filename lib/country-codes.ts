import countryCodeData from '@/src/data/countrycode.json';

export type CountryDialCode = {
  name: string;
  dial_code: string;
  code: string;
};

export const COUNTRY_DIAL_CODES: CountryDialCode[] = (
  countryCodeData as CountryDialCode[]
)
  .filter(
    (row) =>
      typeof row?.name === 'string' &&
      typeof row?.dial_code === 'string' &&
      row.dial_code.trim().startsWith('+')
  )
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name));

/** Dial digits only (no +), longest first for prefix matching. */
const DIAL_DIGITS_LONGEST_FIRST: string[] = Array.from(
  new Set(
    COUNTRY_DIAL_CODES.map((row) => row.dial_code.replace(/\D/g, '')).filter(
      Boolean
    )
  )
).sort((a, b) => b.length - a.length);

export const CUSTOM_COUNTRY_CODE_VALUE = '__custom__';

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizeDialDigits(value: string): string {
  return digitsOnly(value);
}

export function findCountryByIsoCode(
  isoCode: string | null | undefined
): CountryDialCode | undefined {
  const code = String(isoCode ?? '')
    .trim()
    .toUpperCase();
  if (!code) return undefined;
  return COUNTRY_DIAL_CODES.find((row) => row.code.toUpperCase() === code);
}

export function findCountryByDialDigits(
  dialDigits: string
): CountryDialCode | undefined {
  const digits = normalizeDialDigits(dialDigits);
  if (!digits) return undefined;
  const matches = COUNTRY_DIAL_CODES.filter(
    (row) => normalizeDialDigits(row.dial_code) === digits
  );
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];
  // Shared dial codes (e.g. +1 US/CA): prefer United States as the default label.
  return matches.find((row) => row.code.toUpperCase() === 'US') ?? matches[0];
}

export function splitStoredPhone(stored: unknown): {
  countryCode: string;
  nationalNumber: string;
} {
  const raw = String(stored ?? '').trim();
  const hasExplicitPlus = raw.startsWith('+');
  const digits = digitsOnly(raw.replace(/^\+/, ''));
  if (!digits) return { countryCode: '', nationalNumber: '' };

  if (!hasExplicitPlus) {
    return { countryCode: '', nationalNumber: digits };
  }

  for (const dial of DIAL_DIGITS_LONGEST_FIRST) {
    if (digits.startsWith(dial) && digits.length > dial.length) {
      return {
        countryCode: dial,
        nationalNumber: digits.slice(dial.length),
      };
    }
  }

  if (digits.length <= 10) {
    return { countryCode: '', nationalNumber: digits };
  }

  return {
    countryCode: digits.slice(0, 2),
    nationalNumber: digits.slice(2),
  };
}

export function joinPhone(countryCode: string, nationalNumber: string): string {
  const nationalDigits = digitsOnly(nationalNumber);
  if (!nationalDigits) return '';

  const dialDigits = normalizeDialDigits(countryCode);
  if (!dialDigits) return nationalDigits;

  const combined = `${dialDigits}${nationalDigits}`;
  return combined ? `+${combined}` : '';
}

/** Normalize any stored/scraped contact using the same local-vs-international rule as `joinPhone()`. */
export function toE164BusinessContact(raw: unknown): string {
  if (raw == null) return '';

  const text = String(raw).trim();
  const digits = digitsOnly(text);
  if (!digits) return '';

  return text.startsWith('+') ? `+${digits}` : digits;
}

/** Match profile-save behavior: invalid / placeholder contact values become ''. */
export function normalizeBusinessContactValue(raw: unknown): string {
  const text = String(raw ?? '').trim();
  if (!text) return '';

  const digits = digitsOnly(text);
  if (!digits || /^0+$/.test(digits)) return '';
  if (digits.length < 6) return '';

  return text.startsWith('+') ? `+${digits}` : digits;
}

export function formatCountryOptionLabel(row: CountryDialCode): string {
  return `${row.name} (${row.dial_code})`;
}
