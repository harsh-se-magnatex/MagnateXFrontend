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
  return kind;
}

function generatedMatchesTarget(
  item: { kind: string },
  target: ForceRunTarget
): boolean {
  if (normalizedKind(item.kind) !== normalizedKind(target.kind)) {
    return false;
  }
  return true;
}

/** True when Force Run finished (success, draft, scheduled, or terminal). */
export function isForceRunTargetComplete(
  days: ForceRunCalendarDay[],
  target: ForceRunTarget
): boolean {
  const day = days.find((d) => d.date === target.date);
  if (!day) return false;
  const slot = day.byPlatform[target.platform];
  if (!slot) return false;

  const generated = slot.generated.find((g) => generatedMatchesTarget(g, target));
  if (!generated) {
    return false;
  }
  if (generated.status === 'queued') {
    return false;
  }
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
