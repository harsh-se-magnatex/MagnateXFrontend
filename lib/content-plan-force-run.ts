import type { ContentPlanPlatform } from '@/src/service/api/content-plan.service';

export type ForceRunTarget = {
  date: string;
  platform: ContentPlanPlatform;
  kind: string;
  eventId?: string;
};

/** Minimal shape shared by user Content Plan and admin review calendars. */
export type ForceRunCalendarDay = {
  date: string;
  byPlatform: Partial<
    Record<
      ContentPlanPlatform,
      {
        generated: Array<{ kind: string; status: string }>;
      }
    >
  >;
};

export function forceRunLockKey(target: ForceRunTarget): string {
  return `${target.date}::${target.platform}::${target.kind}::${target.eventId ?? ''}`;
}

function normalizedKind(kind: string): string {
  if (kind === 'festival') return 'festive';
  if (kind === 'video') return 'video-generation';
  return kind;
}

/**
 * Force Run of Content Studio / Video can fall through to AI Engine when
 * brief/data is missing. Treat AI Engine occupancy as completing that lock
 * so the UI does not keep Content Studio in a Generating state.
 */
function forceRunFallbackKinds(kind: string): string[] {
  const k = normalizedKind(kind);
  if (k === 'quick-create') return ['ai-engine'];
  if (k === 'video-generation') return ['ai-engine'];
  return [];
}

/**
 * True when Force Run finished — or when a fallback pipeline (AI Engine)
 * has taken over the cell so the original card should stop showing Generating.
 *
 * For fallback aliases we clear as soon as AI Engine appears (even while still
 * queued), so the user never sees Content Studio + AI Engine Generating together.
 */
export function isForceRunTargetComplete(
  days: ForceRunCalendarDay[],
  target: ForceRunTarget
): boolean {
  const day = days.find((d) => d.date === target.date);
  if (!day) return false;
  const slot = day.byPlatform[target.platform];
  if (!slot) return false;

  const exact = slot.generated.find(
    (g) => normalizedKind(g.kind) === normalizedKind(target.kind)
  );
  if (exact && exact.status !== 'queued') {
    return true;
  }

  const fallbackKinds = forceRunFallbackKinds(target.kind);
  if (fallbackKinds.length > 0) {
    const fallback = slot.generated.find((g) =>
      fallbackKinds.includes(normalizedKind(g.kind))
    );
    // Fallback pipeline owns the cell — drop the original Force Run lock.
    if (fallback) return true;
  }

  if (!exact) return false;
  if (exact.status === 'queued') return false;
  return true;
}

export function parseForceRunLockKey(key: string): ForceRunTarget | null {
  const parts = key.split('::');
  if (parts.length < 4) return null;
  const [date, platform, kind, eventId] = parts;
  if (!date || !platform || !kind) return null;
  return {
    date,
    platform: platform as ContentPlanPlatform,
    kind,
    ...(eventId ? { eventId } : {}),
  };
}

export function adminForceRunLockKey(
  target: ForceRunTarget & { userId: string }
): string {
  return `${target.userId}::${forceRunLockKey(target)}`;
}

export function parseAdminForceRunLockKey(
  key: string
): (ForceRunTarget & { userId: string }) | null {
  const parts = key.split('::');
  if (parts.length < 5) return null;
  const [userId, date, platform, kind, eventId] = parts;
  if (!userId || !date || !platform || !kind) return null;
  return {
    userId,
    date,
    platform: platform as ContentPlanPlatform,
    kind,
    ...(eventId ? { eventId } : {}),
  };
}
