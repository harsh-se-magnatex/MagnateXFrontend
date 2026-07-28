'use client';

/**
 * User-preferred timezone helpers.
 *
 * All timestamp display in the app flows through these helpers so that:
 *   • The user's preferred timezone (saved in `users/{uid}.preferences.TimeZone`)
 *     drives what they see, regardless of browser locale.
 *   • Output is always 24-hour clock (`HH:mm`) — no AM/PM ambiguity.
 *   • Daylight Saving Time transitions are handled correctly: date-fns-tz's
 *     `formatInTimeZone` looks up IANA tz rules, so e.g. `America/New_York`
 *     shifts between EDT and EST automatically depending on the instant.
 */

import { useContext, useMemo } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { UserPlanCreditsContext } from '@/app/(main)/_components/UserPlanCreditsProvider';

export type TimestampInput =
  | Date
  | number
  | string
  | { _seconds: number; _nanoseconds?: number }
  | { seconds: number; nanoseconds?: number }
  | { toDate: () => Date }
  | null
  | undefined;

/** Named format presets. All are 24-hour. */
export type TimestampStyle =
  /** `Mar 14, 2025, 18:42` — default for most "when did this happen" UI. */
  | 'datetime'
  /** `Mar 14, 2025` — for billing dates etc. */
  | 'date'
  /** `March 14, 2025` */
  | 'date-long'
  /** `14/03/25, 18:42` — compact, used in success/failure alerts. */
  | 'datetime-short'
  /** `18:42` — clock only. */
  | 'time'
  /** `Mar 14, 2025, 18:42 GMT+5:30` — when the timezone label matters. */
  | 'datetime-with-zone';

const PRESET_FORMATS: Record<TimestampStyle, string> = {
  datetime: 'MMM d, yyyy, HH:mm',
  date: 'MMM d, yyyy',
  'date-long': 'MMMM d, yyyy',
  'datetime-short': 'dd/MM/yy, HH:mm',
  time: 'HH:mm',
  'datetime-with-zone': "MMM d, yyyy, HH:mm 'GMT'XXX",
};

const DEFAULT_PLACEHOLDER = '—';

/** Browser timezone, evaluated lazily so SSR doesn't crash. */
export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Convert any of the supported timestamp shapes into a `Date` (UTC instant).
 * Returns `null` for missing / unparseable input.
 */
export function parseTimestampInput(input: TimestampInput): Date | null {
  if (input == null) return null;

  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }

  if (typeof input === 'number') {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof input === 'object') {
    const o = input as Record<string, unknown> & { toDate?: () => Date };
    if (typeof o.toDate === 'function') {
      try {
        const d = o.toDate();
        return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
      } catch {
        return null;
      }
    }
    const sec =
      typeof o._seconds === 'number'
        ? o._seconds
        : typeof o.seconds === 'number'
          ? o.seconds
          : typeof o.seconds === 'string' && /^\d+$/.test(o.seconds)
            ? Number(o.seconds)
            : null;
    if (sec == null || !Number.isFinite(sec)) return null;
    const ns =
      typeof o._nanoseconds === 'number'
        ? o._nanoseconds
        : typeof o.nanoseconds === 'number'
          ? o.nanoseconds
          : 0;
    return new Date(sec * 1000 + ns / 1e6);
  }

  return null;
}

export type FormatOptions = {
  /** Named preset; defaults to `'datetime'`. */
  style?: TimestampStyle;
  /** Raw date-fns format string. Overrides `style` when provided. */
  format?: string;
  /** What to render for null / unparseable input. Default `'—'`. */
  placeholder?: string;
};

/**
 * Format a timestamp in an explicit IANA timezone using 24-hour clock.
 *
 * Uses `date-fns-tz#formatInTimeZone`, which consults the embedded IANA
 * timezone database in the runtime (V8 `Intl` ICU data) — so daylight
 * saving transitions are applied automatically.
 *
 * @example
 *   formatTimestampInTz(post.scheduleAt, 'Europe/London');
 *   // → "Mar 14, 2025, 18:42"  (BST in summer, GMT in winter)
 */
export function formatTimestampInTz(
  input: TimestampInput,
  timeZone: string,
  options: FormatOptions = {}
): string {
  const placeholder = options.placeholder ?? DEFAULT_PLACEHOLDER;
  const date = parseTimestampInput(input);
  if (!date) return placeholder;

  const tz = timeZone && timeZone.trim() ? timeZone : getBrowserTimeZone();
  const fmt = options.format ?? PRESET_FORMATS[options.style ?? 'datetime'];

  try {
    return formatInTimeZone(date, tz, fmt);
  } catch {
    // Bad tz string (e.g. user-supplied garbage) → fall back to browser tz
    // rather than blowing up the UI.
    try {
      return formatInTimeZone(date, getBrowserTimeZone(), fmt);
    } catch {
      return placeholder;
    }
  }
}

/**
 * Returns the user's preferred timezone (as saved in their profile), falling
 * back to the browser's resolved timezone when no preference is loaded yet.
 *
 * Safe to call from anywhere under the app `(main)` layout, where the
 * `UserPlanCreditsProvider` is mounted. When called outside that provider
 * (rare; e.g. auth pages), it transparently returns the browser timezone.
 */
export function useUserTimezone(): string {
  const ctx = useContext(UserPlanCreditsContext);
  const preferred = ctx?.billing?.preferences?.TimeZone;
  return useMemo(() => {
    if (typeof preferred === 'string' && preferred.trim()) return preferred;
    return getBrowserTimeZone();
  }, [preferred]);
}

/**
 * Hook that returns a formatter bound to the user's preferred timezone.
 *
 * @example
 *   const fmt = useTimestampFormatter();
 *   <span>{fmt(post.scheduleAt)}</span>            // 24-hour, user's tz
 *   <span>{fmt(post.createdAt, { style: 'date' })}</span>
 */
export function useTimestampFormatter(): (
  input: TimestampInput,
  options?: FormatOptions
) => string {
  const tz = useUserTimezone();
  return useMemo(
    () => (input, options) => formatTimestampInTz(input, tz, options),
    [tz]
  );
}

/**
 * Drop-in JSX wrapper. Renders a `<time>` element with the formatted label
 * and an ISO `dateTime` attribute for accessibility / hover tooltips.
 */
export function FormattedTimestamp({
  value,
  style,
  format,
  placeholder,
  className,
  title,
}: {
  value: TimestampInput;
  style?: TimestampStyle;
  format?: string;
  placeholder?: string;
  className?: string;
  title?: string;
}) {
  const fmt = useTimestampFormatter();
  const date = parseTimestampInput(value);
  const label = fmt(value, { style, format, placeholder });
  return (
    <time
      className={className}
      dateTime={date ? date.toISOString() : undefined}
      title={title}
    >
      {label}
    </time>
  );
}
