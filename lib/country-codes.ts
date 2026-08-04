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

export function findCountryByDialDigits(
  dialDigits: string
): CountryDialCode | undefined {
  const digits = normalizeDialDigits(dialDigits);
  if (!digits) return undefined;
  return COUNTRY_DIAL_CODES.find(
    (row) => normalizeDialDigits(row.dial_code) === digits
  );
}

export function splitStoredPhone(stored: unknown): {
  countryCode: string;
  nationalNumber: string;
} {
  const digits = digitsOnly(String(stored ?? '').replace(/^\+/, ''));
  if (!digits) return { countryCode: '', nationalNumber: '' };

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
  const combined = `${normalizeDialDigits(countryCode)}${digitsOnly(nationalNumber)}`;
  return combined ? `+${combined}` : '';
}

/** Normalize any stored/scraped contact to E.164-style `+digits` (or ''). */
export function toE164BusinessContact(raw: unknown): string {
  if (raw == null) return '';
  const digits = digitsOnly(String(raw));
  return digits ? `+${digits}` : '';
}

export function formatCountryOptionLabel(row: CountryDialCode): string {
  return `${row.name} (${row.dial_code})`;
}
