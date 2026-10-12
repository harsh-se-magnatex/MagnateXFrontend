type Analytics = Record<string, unknown> | null | undefined;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Require two complete, adjacent weeks instead of splitting sparse syncs. */
function weeklyGrowth(analytics: Analytics, key: string): number | null {
  const trend = analytics?.[key];
  if (!Array.isArray(trend)) return null;
  const points = trend.map((point: unknown) => {
    if (!point || typeof point !== 'object') return null;
    const { date, value } = point as { date?: unknown; value?: unknown };
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const day = Date.parse(`${date}T00:00:00Z`);
    if (!Number.isFinite(day) || new Date(day).toISOString().slice(0, 10) !== date) return null;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
    return { day, value };
  });
  // Missing or malformed observations must not become artificial zeroes.
  if (points.some((point) => point === null)) return null;
  const sorted = points.filter((point) => point !== null).sort((a, b) => a.day - b.day);
  if (sorted.length < 14) return null;
  const weeks = sorted.slice(-14);
  if (weeks.some((point, i) => i > 0 && point.day - weeks[i - 1].day !== DAY_MS)) return null;
  const previous = weeks.slice(0, 7).reduce((sum, point) => sum + point.value, 0);
  const current = weeks.slice(7).reduce((sum, point) => sum + point.value, 0);
  if (previous <= 0 || !Number.isFinite(previous) || !Number.isFinite(current)) return null;
  const pct = ((current - previous) / previous) * 100;
  return Number.isFinite(pct) ? pct : null;
}

/** Home's bounded overview; detailed analytics retain their signed deltas. */
export function averageGrowthOverviewPct(
  facebook: Analytics,
  instagram: Analytics,
  linkedin: Analytics,
  connectedPlatforms: readonly string[],
): number | null {
  const platforms = [
    { id: 'facebook', analytics: facebook, primary: 'reachTrend', fallback: 'engagementsTrend' },
    { id: 'instagram', analytics: instagram, primary: 'reachTrend', fallback: 'interactionsTrend' },
    { id: 'linkedin', analytics: linkedin, primary: 'pageViewsTrend', fallback: 'engagementsTrend' },
  ];
  const growth = platforms
    .filter((platform) => connectedPlatforms.includes(platform.id))
    .map(({ analytics, primary, fallback }) => weeklyGrowth(analytics, primary) ?? weeklyGrowth(analytics, fallback))
    .filter((pct): pct is number => pct !== null);
  if (growth.length === 0) return null;
  const average = growth.reduce((sum, pct) => sum + pct / growth.length, 0);
  return Math.round(Math.min(100, Math.max(0, average)) * 10) / 10;
}
