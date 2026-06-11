import { FirestoreTimestamp } from '@/app/(main)/_components/types';
import { formatTimestampInTz, type TimestampInput } from '@/lib/user-timezone';

/**
 * @deprecated Use `useTimestampFormatter()` from `@/lib/user-timezone` instead
 * so timestamps render in the user's preferred timezone with 24-hour clock.
 *
 * This helper formats in the *browser* timezone and is kept only for
 * backwards compatibility with callers that don't have React context
 * available (server components, plain utilities).
 */
export function formatTimestamp(ts: FirestoreTimestamp | null): string {
  if (!ts) return '—';
  return formatTimestampInTz(ts as TimestampInput, '', { style: 'datetime' });
}
