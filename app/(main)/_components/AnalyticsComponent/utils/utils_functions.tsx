import {
  FirestoreTimestamp,
  IgTrendKey,
  InstagramAnalytics,
  PageAnalytics,
  Post,
} from '../../types';
import { trendSeries } from './facebook_components/util_component';
import { formatTimestampInTz, type TimestampInput } from '@/lib/user-timezone';

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

/**
 * @deprecated Use `useTimestampFormatter()` from `@/lib/user-timezone` so the
 * label respects the user's preferred timezone (and DST). Kept only for
 * backwards compatibility with non-React callers.
 */
export function formatLastUpdated(
  ts: FirestoreTimestamp | Date | undefined | null
): string {
  if (!ts) return '';
  return formatTimestampInTz(ts as TimestampInput, '', {
    style: 'datetime',
    placeholder: '',
  });
}
export function formatWatchSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '—';
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s}s`;
}

/**
 * Compares the most recent 7 days to the prior 7-day window inside an
 * analytics trend (e.g. reachTrend, engagementsTrend). Returns null when
 * we don't have enough data to be meaningful so the UI can hide the badge.
 *
 * `pct` is a signed percentage change versus the previous window.
 *
 * First-connect / sparse syncs often produce absurd spikes (e.g. +365% or
 * +4000%) when the prior window is empty or near-zero. In those cases we
 * return null instead of a misleading percentage.
 */
export function weeklyDeltaFromTrend(
  trend: { date: string; value: number }[] | null | undefined
): { pct: number; current: number; previous: number } | null {
  if (!Array.isArray(trend) || trend.length === 0) return null;
  const sorted = [...trend]
    .filter((p) => p && typeof p.date === 'string')
    .sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return null;

  const totalLen = sorted.length;
  // Need enough points for a real week-over-week compare (≈7 vs ≈7).
  // With fewer than 8 points the prior window is too thin for first-connect users.
  if (totalLen < 8) return null;

  // Use up to the last 14 points; split into "recent 7" vs "prior 7".
  // If we only have 8-13 points we still split, biasing recent half.
  const window = Math.min(14, totalLen);
  const tail = sorted.slice(totalLen - window);
  const split = Math.ceil(tail.length / 2);
  const previous = tail.slice(0, tail.length - split);
  const current = tail.slice(tail.length - split);

  // Each window should have several days — a 1-point "previous week" is not meaningful.
  if (current.length < 3 || previous.length < 3) return null;

  const currentSum = current.reduce((s, p) => s + (Number(p.value) || 0), 0);
  const previousSum = previous.reduce((s, p) => s + (Number(p.value) || 0), 0);

  // No prior baseline (common right after connecting) — cannot compute WoW %.
  if (previousSum === 0) return null;

  const pct = ((currentSum - previousSum) / Math.abs(previousSum)) * 100;

  // Near-zero prior windows create runaway percentages (prev=1 → +4000%).
  // Treat those as "not enough history" rather than celebrating fake growth.
  if (!Number.isFinite(pct) || Math.abs(pct) > 250) return null;

  return {
    pct: Math.round(pct * 10) / 10,
    current: currentSum,
    previous: previousSum,
  };
}

/**
 * Builds a weekly delta from a postFrequency-style record `{ date: count }`.
 * Mirrors `weeklyDeltaFromTrend` so the Posts stat card can show a +/- vs
 * the prior 7-day window.
 */
export function weeklyDeltaFromPostFrequency(
  freq: Record<string, number> | null | undefined
): { pct: number; current: number; previous: number } | null {
  if (!freq || typeof freq !== 'object') return null;
  const trend = Object.entries(freq).map(([date, count]) => ({
    date,
    value: Number(count) || 0,
  }));
  return weeklyDeltaFromTrend(trend);
}

/* ────────────────────────── Nudge vs Dud ─────────────────────────── */

/**
 * Engagement-score multiplier above the cohort average at which a post is
 * promoted from "Dud" to "Nudge". 1.5× means a post needs to score at
 * least 150% of the average across the visible window to qualify.
 *
 * Change this constant in one place to retune the badge sensitivity for
 * every platform (Facebook / Instagram / LinkedIn share it).
 */
export const NUDGE_THRESHOLD_MULTIPLIER = 1.5;

export type PostClassification = 'nudge' | 'dud';

export type NudgeDudResult<T> = {
  /** Average engagement score across the input list (0 when empty). */
  average: number;
  /** `avg * NUDGE_THRESHOLD_MULTIPLIER` — the cutoff used to classify. */
  threshold: number;
  /** Map of post id → classification, preserving the input list order. */
  classifications: Map<string, PostClassification>;
  /** Posts whose engagement score ≥ threshold, sorted as in the input. */
  nudges: T[];
  /** Everything else (including posts with no engagement data). */
  duds: T[];
};

/**
 * Splits a list of posts into "Nudges" (engagement score ≥ avg × 1.5) and
 * "Duds" (the rest). Generic over the post shape so the same helper can
 * drive Facebook (`Post`), LinkedIn (`Post`-shaped), and Instagram
 * (`InstagramPost`) lists.
 *
 * `getId` and `getScore` keep the function agnostic to property names.
 */
export function classifyPostsAsNudgeOrDud<T>(
  posts: readonly T[],
  getId: (post: T) => string,
  getScore: (post: T) => number
): NudgeDudResult<T> {
  if (posts.length === 0) {
    return {
      average: 0,
      threshold: 0,
      classifications: new Map(),
      nudges: [],
      duds: [],
    };
  }

  const scores = posts.map((p) => Number(getScore(p)) || 0);
  const average =
    scores.reduce((sum, n) => sum + n, 0) / Math.max(scores.length, 1);
  const threshold = average * NUDGE_THRESHOLD_MULTIPLIER;

  const classifications = new Map<string, PostClassification>();
  const nudges: T[] = [];
  const duds: T[] = [];

  posts.forEach((post, i) => {
    const id = getId(post);
    const isNudge = average > 0 && scores[i] >= threshold;
    classifications.set(id, isNudge ? 'nudge' : 'dud');
    if (isNudge) nudges.push(post);
    else duds.push(post);
  });

  return { average, threshold, classifications, nudges, duds };
}
