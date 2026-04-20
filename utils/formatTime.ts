import { FirestoreTimestamp } from "@/app/(main)/_components/types";

export function formatTimestamp(ts: FirestoreTimestamp | null): string {
    if (!ts) return '—';
    const date = new Date(ts._seconds * 1000 + ts._nanoseconds / 1e6);
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }