import {
  FirestoreTimestamp,
  IgTrendKey,
  InstagramAnalytics,
  PageAnalytics,
  Post,
} from '../../types';
import { trendSeries } from './facebook_components/util_component';

export function postFrequencyEntries(
  page:
    | Pick<PageAnalytics, 'postFrequency'>
    | Pick<InstagramAnalytics, 'postFrequency'>
    | null
    | undefined
): { date: string; count: number }[] {
  const pf = page?.postFrequency;
  if (!pf || typeof pf !== 'object' || Array.isArray(pf)) return [];
  return [...Object.entries(pf)]
    .map(([date, n]) => ({ date, count: Number(n) || 0 }))
    .sort((x, y) => y.date.localeCompare(x.date));
}

export const merged = (pageAnalytics: PageAnalytics, allPosts: Post[]) => {
  if (!pageAnalytics) {
    const engagementsFromPosts = allPosts.reduce(
      (s, p) => s + (Number(p.engagementScore) || 0),
      0
    );
    return {
      followersTrend: [] as { date: string; value: number }[],
      reachTrend: [] as { date: string; value: number }[],
      uniqueReachTrend: [] as { date: string; value: number }[],
      engagementsTrend: [] as { date: string; value: number }[],
      totalFollowers: 0,
      totalReach: 0,
      totalUniqueReach: 0,
      totalEngagementsPage: 0,
      engagementsFromPosts,
      postFrequencyTop: [] as { date: string; count: number }[],
    };
  }
  const followersTrend = trendSeries(pageAnalytics, 'followersTrend');
  const reachTrend = trendSeries(pageAnalytics, 'reachTrend');
  const uniqueReachTrend = trendSeries(pageAnalytics, 'uniqueReachTrend');
  const engagementsTrend = trendSeries(pageAnalytics, 'engagementsTrend');
  const totalFollowers = Number(pageAnalytics.followers) || 0;
  const totalReach = Number(pageAnalytics.reach) || 0;
  const totalUniqueReach = Number(pageAnalytics.uniqueReach) || 0;
  const totalEngagementsPage = Number(pageAnalytics.engagements) || 0;
  const engagementsFromPosts = allPosts.reduce(
    (s, p) => s + (Number(p.engagementScore) || 0),
    0
  );
  const postFrequencyTop = postFrequencyEntries(pageAnalytics).slice(0, 7);
  return {
    followersTrend,
    reachTrend,
    uniqueReachTrend,
    engagementsTrend,
    totalFollowers,
    totalReach,
    totalUniqueReach,
    totalEngagementsPage,
    engagementsFromPosts,
    postFrequencyTop,
  };
};

export function igTrendSeries(
  ig: InstagramAnalytics | null | undefined,
  trendKey: IgTrendKey
): { date: string; value: number }[] {
  const trend = ig?.[trendKey];
  if (!Array.isArray(trend)) return [];
  return [...trend]
    .filter((point) => point?.date)
    .map((point) => ({
      date: String(point.date),
      value: Number(point.value) || 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function audienceCounts(
  page:
    | Pick<PageAnalytics, 'topCountries' | 'topCities'>
    | Pick<InstagramAnalytics, 'topCountries' | 'topCities'>
    | null
    | undefined,
  key: 'topCountries' | 'topCities'
): { name: string; count: number }[] {
  const map = new Map<string, number>();
  const raw = page?.[key];
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    for (const name of raw) {
      if (typeof name === 'string' && name)
        map.set(name, (map.get(name) ?? 0) + 1);
    }
  } else if (typeof raw === 'object') {
    for (const [name, n] of Object.entries(raw)) {
      const v = Number(n) || 0;
      if (v > 0) map.set(name, (map.get(name) ?? 0) + v);
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

export function rankedRecordEntries(
  record: Record<string, number> | undefined | null
): { name: string; value: number }[] {
  if (!record || typeof record !== 'object') return [];
  return Object.entries(record)
    .map(([name, value]) => ({ name, value: Number(value) || 0 }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function formatLastUpdated(
  ts: FirestoreTimestamp | Date | undefined | null
): string {
  if (!ts) return '';
  const ms =
    ts instanceof Date
      ? ts.getTime()
      : '_seconds' in ts
        ? ts._seconds * 1000 + (ts._nanoseconds ?? 0) / 1e6
        : NaN;
  if (!Number.isFinite(ms)) return '';
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
export function formatWatchSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '—';
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s}s`;
}
