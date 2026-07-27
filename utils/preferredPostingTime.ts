/** Fallback when analytics-based optimal time is off or unavailable. */
export const DEFAULT_PREFERRED_POSTING_TIME = '20:00';

/** Normalize a stored `HH:MM` preference; invalid/missing values use `fallback`. */
export function normalizePreferredPostingTime(
  value: unknown,
  fallback: string = DEFAULT_PREFERRED_POSTING_TIME
): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return fallback;
  const h = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const m = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
