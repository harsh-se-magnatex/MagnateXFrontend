'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { CalendarRange, Loader2, Play, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { NonSubscribedFeatureBlock } from '@/components/shared/NonSubscribedFeatureBlock';
import { useAuth } from '@/src/hooks/useAuth';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import { useUserTimezone } from '@/lib/user-timezone';
import { isPlanInactive } from '@/lib/plan-access';
import {
  forceRunAIPlanApi,
  generateAIPlanApi,
  getAIPlanApi,
  type AIPlanCell,
  selectAIPlanPlatformsApi,
  type AIPlanDay,
  type AIPlanGeneratedItem,
  type AIPlanGeneratedKind,
  type AIPlanPlatform,
  type AIPlanUpcomingItem,
} from '@/src/service/api/ai-plan.service';
import { cn } from '@/lib/utils';
import {
  forceRunLockKey,
  isForceRunTargetComplete,
  parseForceRunLockKey,
} from '@/lib/content-plan-force-run';
import { WORKSPACE_NAV_HREFS, workspacePageTitle } from '@/lib/workspace-nav';

const PLATFORM_LABEL: Record<AIPlanPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
};

const PLATFORM_SHORT: Record<AIPlanPlatform, string> = {
  facebook: 'FB',
  instagram: 'IG',
  linkedin: 'LI',
};

function kindLabel(kind: AIPlanGeneratedKind | string): string {
  switch (kind) {
    case 'campaign':
      return workspacePageTitle(WORKSPACE_NAV_HREFS.createCampaign);
    case 'ai-engine':
      return 'AutoPilot';
    case 'bulk-create':
      return workspacePageTitle(WORKSPACE_NAV_HREFS.quickCreate);
    case 'quick-create':
      return workspacePageTitle(WORKSPACE_NAV_HREFS.quickCreate);
    case 'product-advert':
      return workspacePageTitle(WORKSPACE_NAV_HREFS.productAdvert);
    case 'video-generation':
      return workspacePageTitle(WORKSPACE_NAV_HREFS.videoGeneration);
    case 'carousel':
      return workspacePageTitle(WORKSPACE_NAV_HREFS.carouselCreate);
    case 'festive':
    case 'festival':
      return workspacePageTitle(WORKSPACE_NAV_HREFS.festivePost);
    case 'empty':
      return '—';
    default:
      if (typeof kind === 'string' && kind.toLowerCase().includes('campaign')) {
        return 'Campaign';
      }
      return kind === 'other' ? 'Manual post' : 'Planned';
  }
}

function statusLabel(status: AIPlanGeneratedItem['status']): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'queued':
      return 'Generating';
    case 'pending-approval':
      return 'Pending approval';
    case 'failed':
      return 'Failed';
    case 'scheduled':
      return 'Scheduled';
    case 'removed':
      return 'Removed by user';
    case 'rejected-by-admin':
      return 'Rejected by admin';
    case 'rejected-by-user':
    case 'rejected':
      return 'Rejected by user';
    default:
      return status;
  }
}

function isTerminalGeneratedStatus(
  status: AIPlanGeneratedItem['status']
): boolean {
  return (
    status === 'removed' ||
    status === 'rejected' ||
    status === 'rejected-by-user' ||
    status === 'rejected-by-admin'
  );
}

function cellToneClass(kind: string): string {
  switch (kind) {
    case 'campaign':
      return 'bg-success text-success';
    case 'festival':
    case 'festive':
      return 'bg-warning text-warning';
    case 'quick-create':
      return 'bg-info text-info';
    case 'product-advert':
      return 'bg-preview text-preview';
    case 'video-generation':
      return 'bg-info text-info';
    case 'carousel':
      return 'bg-success text-success';
    case 'bulk-create':
    case 'ai-engine':
      return 'bg-primary-purple/25 text-preview';
    case 'empty':
      return 'bg-element text-default';
    default:
      return 'bg-warning text-warning';
  }
}

type CellEntry = {
  kind: string;
  label: string;
  status?: string;
  note?: string;
  href?: string | null;
  source: 'generated' | 'upcoming';
  origin?: 'auto' | 'manual';
  eventId?: string;
  alreadyGenerated?: boolean;
  hideStatus?: boolean;
};

function videoScheduleDetails(cell?: AIPlanCell | null): string | undefined {
  if (!cell || cell.kind !== 'video') return undefined;
  const logoPosition =
    cell.videoVariant === 'logo-first-memory-last' ? 'First' : 'Last';
  const avatarUsage = cell.videoUseAvatar === true ? 'Used' : 'Not used';
  return `Avatar: ${avatarUsage} · Logo: ${logoPosition}`;
}

type GlobalForceRunTarget = {
  date: string;
  platform: AIPlanPlatform;
  kind: AIPlanUpcomingItem['kind'];
  eventId?: string;
};

type GlobalForceRunProgress = {
  phase: 'queueing' | 'generating';
  completed: number;
  total: number;
  queued: number;
  failed: number;
  targets: GlobalForceRunTarget[];
};

/** Kinds that Force Run can enqueue (including campaign). */
function canForceRunKind(kind: string): boolean {
  return (
    kind === 'campaign' ||
    kind === 'ai-engine' ||
    kind === 'quick-create' ||
    kind === 'video-generation' ||
    kind === 'carousel' ||
    kind === 'festival' ||
    kind === 'festive'
  );
}

function hasGeneratedCounterpart(
  generated: AIPlanGeneratedItem[],
  upcomingKind: AIPlanUpcomingItem['kind']
): boolean {
  const matchingKinds =
    upcomingKind === 'festival'
      ? ['festive']
      : upcomingKind === 'quick-create' || upcomingKind === 'video-generation'
        ? [upcomingKind, 'ai-engine']
        : [upcomingKind];

  return generated.some(
    (item) => item.origin === 'auto' && matchingKinds.includes(item.kind)
  );
}

function globalForceRunTargets(args: {
  days: AIPlanDay[];
  platforms: AIPlanPlatform[];
  todayIso: string;
}): GlobalForceRunTarget[] {
  const targets: GlobalForceRunTarget[] = [];
  const seen = new Set<string>();
  for (const day of args.days) {
    if (day.date < args.todayIso) continue;
    for (const platform of args.platforms) {
      const slot = day.byPlatform[platform];
      if (!slot) continue;
      for (const item of slot.upcoming) {
        const status = String(item.status ?? '').toLowerCase();
        if (
          !canForceRunKind(item.kind) ||
          item.kind === 'empty' ||
          hasGeneratedCounterpart(slot.generated, item.kind) ||
          status === 'enqueued' ||
          status === 'done'
        ) {
          continue;
        }
        // One video job is shared across all selected platforms.
        const key =
          item.kind === 'video-generation'
            ? `${day.date}:video-generation`
            : `${day.date}:${platform}:${item.kind}:${item.eventId ?? ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        targets.push({
          date: day.date,
          platform,
          kind: item.kind,
          ...(item.eventId ? { eventId: item.eventId } : {}),
        });
      }
    }
  }
  return targets;
}

function entriesForSlot(args: {
  generated: AIPlanGeneratedItem[];
  upcoming: AIPlanUpcomingItem[];
}): CellEntry[] {
  const generated: CellEntry[] = args.generated.map((item) => {
    const isTerminal = isTerminalGeneratedStatus(item.status);
    const hideDetail = isTerminal || item.status === 'failed';
    return {
      kind: item.kind,
      label: kindLabel(item.kind),
      status: statusLabel(item.status),
      hideStatus: item.kind === 'video-generation' && item.status === 'failed',
      note:
        videoScheduleDetails(item.cell) ||
        (hideDetail
          ? undefined
          : item.title?.trim() || item.captionPreview?.trim() || undefined),
      href: isTerminal
        ? null
        : item.scheduledPostId
          ? WORKSPACE_NAV_HREFS.postQueue
          : item.draftId
            ? WORKSPACE_NAV_HREFS.createCampaign
            : null,
      source: 'generated' as const,
      origin: item.origin,
    };
  });

  // Empty placeholders render through PlatformCell's zero-entry state. Keep
  // any real sibling cards, such as a pending festival, visible.
  const upcoming: CellEntry[] = args.upcoming
    .filter((item) => item.kind !== 'empty')
    .map((item) => {
      const suppliedLabel = item.label.trim();
      const isOccasion = item.kind === 'festival';
      const isFailed = String(item.status ?? '').toLowerCase() === 'failed';
      return {
        kind: item.kind,
        label:
          item.kind === 'campaign' && suppliedLabel
            ? suppliedLabel.toLowerCase().includes('campaign')
              ? suppliedLabel
              : `Campaign · ${suppliedLabel}`
            : kindLabel(item.kind),
        note:
          (item.kind === 'video-generation'
            ? videoScheduleDetails(item.cell)
            : isOccasion
              ? suppliedLabel
              : isFailed
                ? undefined
                : item.note?.trim()) || undefined,
        href: null,
        source: 'upcoming' as const,
        status: item.status,
        hideStatus:
          item.kind === 'video-generation' &&
          String(item.status ?? '').toLowerCase() === 'failed',
        alreadyGenerated: hasGeneratedCounterpart(args.generated, item.kind),
        ...(item.eventId ? { eventId: item.eventId } : {}),
      };
    });

  if (generated.length === 0) return upcoming;
  if (upcoming.length === 0) return generated;
  return [...generated, ...upcoming];
}

function formatDateParts(isoDate: string): { weekday: string; day: string } {
  try {
    const d = parseISO(`${isoDate}T12:00:00`);
    return {
      weekday: format(d, 'EEE'),
      day: format(d, 'MMM d'),
    };
  } catch {
    return { weekday: '', day: isoDate };
  }
}

function forceRunVisualKey(args: {
  date: string;
  platform: AIPlanPlatform;
  kind: string;
  eventId?: string;
}): string {
  return forceRunLockKey({
    date: args.date,
    platform: args.platform,
    kind: args.kind,
    eventId: args.eventId,
  });
}

function PlatformCell({
  date,
  platform,
  entries,
  todayIso,
  forceRunEnabled,
  suppressVideoForceRun = false,
  sharedVideoRunning = false,
  runningForceRunKeys,
  onForceRun,
}: {
  date: string;
  platform: AIPlanPlatform;
  entries: CellEntry[];
  todayIso: string;
  forceRunEnabled: boolean;
  suppressVideoForceRun?: boolean;
  sharedVideoRunning?: boolean;
  runningForceRunKeys: Set<string>;
  onForceRun: (
    date: string,
    platform: AIPlanPlatform,
    kind: AIPlanUpcomingItem['kind'],
    eventId?: string
  ) => void;
}) {
  if (entries.length === 0) {
    return (
      <div className="flex h-full min-h-[3.25rem] items-center justify-center px-2 py-2 text-[11px] text-secondary/70">
        —
      </div>
    );
  }

  const isPast = date < todayIso;
  return (
    <div className="flex h-full min-h-[3.25rem] flex-col gap-1 px-1.5 py-1.5">
      {entries.map((entry, idx) => {
        const runKey = forceRunVisualKey({
          date,
          platform,
          kind: entry.kind,
          eventId: entry.eventId,
        });
        const isRunning =
          runningForceRunKeys.has(runKey) ||
          (sharedVideoRunning && entry.kind === 'video-generation') ||
          entry.status === 'enqueued' ||
          entry.status === 'queued';
        const displayStatus = entry.hideStatus
          ? undefined
          : isRunning ||
              entry.status === 'enqueued' ||
              entry.status === 'queued'
            ? 'Generating'
            : (entry.status ??
              (entry.source === 'upcoming' && entry.kind !== 'empty'
                ? 'Planned'
                : undefined));
        const body = (
          <div
            className={cn(
              'cursor-default rounded-md px-1.5 py-1 text-left leading-tight transition hover:brightness-110 hover:ring-2 hover:ring-white/50',
              cellToneClass(entry.kind),
              entry.href && 'hover:ring-strong'
            )}
            title={[
              entry.label,
              displayStatus,
              entry.origin === 'manual' ? 'Manual' : undefined,
              entry.note,
            ]
              .filter(Boolean)
              .join(' · ')}
          >
            <div className="text-[11px] font-bold tracking-tight">
              {entry.label}
            </div>
            {displayStatus ? (
              <div className="flex items-center gap-1 text-[10px] font-medium opacity-90">
                {displayStatus === 'Generating' ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                ) : null}
                {displayStatus}
                {entry.origin === 'manual' ? ' · Manual' : ''}
              </div>
            ) : null}
            {entry.note ? (
              <div
                className="mt-0.5 line-clamp-3 text-[10px] font-medium leading-snug opacity-85"
                title={entry.note}
              >
                {entry.note}
              </div>
            ) : null}
          </div>
        );

        const showForceRun =
          forceRunEnabled &&
          !isPast &&
          !isRunning &&
          entry.source === 'upcoming' &&
          !entry.alreadyGenerated &&
          canForceRunKind(entry.kind) &&
          !(suppressVideoForceRun && entry.kind === 'video-generation');

        const card = !entry.href ? (
          body
        ) : (
          <Link href={entry.href} className="block">
            {body}
          </Link>
        );

        return (
          <div
            key={`${entry.kind}-${entry.eventId ?? ''}-${idx}`}
            className="flex flex-col gap-1"
          >
            {card}
            {showForceRun ? (
              <button
                type="button"
                onClick={() =>
                  onForceRun(
                    date,
                    platform,
                    entry.kind as AIPlanUpcomingItem['kind'],
                    entry.eventId
                  )
                }
                className={cn(
                  'inline-flex items-center justify-center gap-1 rounded-full border border-default bg-background/80 px-1.5 py-1 text-[10px] font-semibold text-default transition hover:bg-hover disabled:cursor-not-allowed disabled:text-quaternary'
                )}
              >
                {isRunning ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                ) : (
                  <Play className="h-3 w-3" aria-hidden />
                )}
                {isRunning ? 'Running…' : 'Force Run'}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function AIPlanSheet({
  days,
  platforms,
  todayIso,
  forceRunEnabled,
  runningForceRunKeys,
  onForceRun,
}: {
  days: AIPlanDay[];
  platforms: AIPlanPlatform[];
  /** YYYY-MM-DD in the user's timezone — highlighted as Today. */
  todayIso: string;
  forceRunEnabled: boolean;
  runningForceRunKeys: Set<string>;
  onForceRun: (
    date: string,
    platform: AIPlanPlatform,
    kind: AIPlanUpcomingItem['kind'],
    eventId?: string
  ) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-default bg-default">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead>
            <tr className="bg-element">
              <th
                scope="col"
                className="sticky left-0 z-20 w-[7.5rem] border-b border-r border-default bg-element px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-secondary backdrop-blur-sm"
              >
                Date
              </th>
              {platforms.map((platform) => (
                <th
                  key={platform}
                  scope="col"
                  className="border-b border-r border-default px-2 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-secondary last:border-r-0"
                >
                  <span className="hidden sm:inline">
                    {PLATFORM_LABEL[platform]}
                  </span>
                  <span className="sm:hidden">{PLATFORM_SHORT[platform]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day, rowIdx) => {
              const { weekday, day: dayLabel } = formatDateParts(day.date);
              const festivalNames = day.festivals
                .map((f) => f.name)
                .join(' · ');
              const isToday = day.date === todayIso;
              const zebra = rowIdx % 2 === 1;
              const entriesByPlatform = Object.fromEntries(
                platforms.map((platform) => {
                  const slot = day.byPlatform[platform] ?? {
                    generated: [],
                    upcoming: [],
                  };
                  return [platform, entriesForSlot(slot)];
                })
              ) as Record<AIPlanPlatform, CellEntry[]>;
              const sharedVideoPlanned = platforms.some((platform) =>
                entriesByPlatform[platform].some(
                  (entry) =>
                    entry.source === 'upcoming' &&
                    !entry.alreadyGenerated &&
                    entry.kind === 'video-generation'
                )
              );
              const videoLeader =
                platforms.find((platform) =>
                  entriesByPlatform[platform].some(
                    (entry) =>
                      entry.source === 'upcoming' &&
                      !entry.alreadyGenerated &&
                      entry.kind === 'video-generation'
                  )
                ) ?? platforms[0];
              const sharedVideoRunKey = videoLeader
                ? forceRunVisualKey({
                    date: day.date,
                    platform: videoLeader,
                    kind: 'video-generation',
                  })
                : '';
              const sharedVideoRunning =
                runningForceRunKeys.has(sharedVideoRunKey) ||
                platforms.some((platform) =>
                  entriesByPlatform[platform].some(
                    (entry) =>
                      entry.kind === 'video-generation' &&
                      (entry.status === 'enqueued' || entry.status === 'queued')
                  )
                );

              return (
                <tr
                  key={day.date}
                  className={cn(
                    'align-top transition-expo hover:bg-hover',
                    isToday
                      ? 'bg-primary/10 ring-1 ring-inset ring-strong'
                      : zebra && 'bg-element'
                  )}
                >
                  <th
                    scope="row"
                    className={cn(
                      'sticky left-0 z-10 border-b border-r border-default px-3 py-2 text-left font-normal backdrop-blur-sm',
                      isToday
                        ? 'bg-primary/15'
                        : zebra
                          ? 'bg-element'
                          : 'bg-default'
                    )}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-secondary">
                        {weekday}
                        {isToday ? (
                          <span className="ml-1 rounded bg-primary px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-link-foreground">
                            Today
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          'text-[13px] font-semibold',
                          isToday ? 'text-link' : 'text-default'
                        )}
                      >
                        {dayLabel}
                      </span>
                      {festivalNames ? (
                        <span
                          className="mt-0.5 line-clamp-2 text-[10px] font-medium text-warning"
                          title={festivalNames}
                        >
                          {festivalNames}
                        </span>
                      ) : null}
                    </div>
                  </th>
                  {sharedVideoPlanned && videoLeader ? (
                    <td
                      colSpan={platforms.length}
                      className="border-b border-default"
                    >
                      <div
                        className="grid"
                        style={{
                          gridTemplateColumns: `repeat(${platforms.length}, minmax(0, 1fr))`,
                        }}
                      >
                        {platforms.map((platform) => (
                          <div
                            key={platform}
                            className="border-r border-default last:border-r-0"
                          >
                            <PlatformCell
                              date={day.date}
                              platform={platform}
                              entries={entriesByPlatform[platform]}
                              todayIso={todayIso}
                              forceRunEnabled={forceRunEnabled}
                              suppressVideoForceRun
                              sharedVideoRunning={sharedVideoRunning}
                              runningForceRunKeys={runningForceRunKeys}
                              onForceRun={onForceRun}
                            />
                          </div>
                        ))}
                        {forceRunEnabled && day.date >= todayIso ? (
                          <div
                            className="border-t border-info bg-info p-1.5"
                            style={{ gridColumn: '1 / -1' }}
                          >
                            <button
                              type="button"
                              disabled={sharedVideoRunning}
                              onClick={() =>
                                onForceRun(
                                  day.date,
                                  videoLeader,
                                  'video-generation'
                                )
                              }
                              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-info bg-info px-2 py-1.5 text-[11px] font-bold text-info transition hover:bg-info disabled:cursor-wait disabled:text-quaternary"
                            >
                              {sharedVideoRunning ? (
                                <Loader2
                                  className="h-3.5 w-3.5 animate-spin"
                                  aria-hidden
                                />
                              ) : (
                                <Play className="h-3.5 w-3.5" aria-hidden />
                              )}
                              {sharedVideoRunning
                                ? 'Generating one shared video…'
                                : 'Force Run one video for all platforms'}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  ) : (
                    platforms.map((platform) => (
                      <td
                        key={platform}
                        className="border-b border-r border-default last:border-r-0"
                      >
                        <PlatformCell
                          date={day.date}
                          platform={platform}
                          entries={entriesByPlatform[platform]}
                          todayIso={todayIso}
                          forceRunEnabled={forceRunEnabled}
                          runningForceRunKeys={runningForceRunKeys}
                          onForceRun={onForceRun}
                        />
                      </td>
                    ))
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const LEGEND: Array<{ kind: string; label: string }> = [
  { kind: 'campaign', label: kindLabel('campaign') },
  { kind: 'ai-engine', label: kindLabel('ai-engine') },
  { kind: 'quick-create', label: kindLabel('quick-create') },
  { kind: 'video-generation', label: kindLabel('video-generation') },
  { kind: 'carousel', label: kindLabel('carousel') },
  { kind: 'festival', label: kindLabel('festival') },
  { kind: 'empty', label: 'Empty' },
];

export default function AIPlanPage() {
  const { user, loading: authLoading } = useAuth();
  const { billing, loading: creditsLoading } = useUserPlanCredits();
  const timeZone = useUserTimezone();
  const todayIso = useMemo(
    () => formatInTimeZone(new Date(), timeZone, 'yyyy-MM-dd'),
    [timeZone]
  );
  const [days, setDays] = useState<AIPlanDay[]>([]);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [runningForceRunKeys, setRunningForceRunKeys] = useState<Set<string>>(
    () => new Set()
  );
  const [calendarSeeded, setCalendarSeeded] = useState(false);
  const [initialGenerationPending, setInitialGenerationPending] =
    useState(false);
  const [canGenerateCalendar, setCanGenerateCalendar] = useState(false);
  const [generatingCalendar, setGeneratingCalendar] = useState(false);
  const [platformLimit, setPlatformLimit] = useState(0);
  const [platformChoice, setPlatformChoice] = useState<AIPlanPlatform[]>([]);
  const [savingPlatforms, setSavingPlatforms] = useState(false);
  const [globalForceRunProgress, setGlobalForceRunProgress] =
    useState<GlobalForceRunProgress | null>(null);
  const initialLoadUidRef = useRef<string | null>(null);

  const isAuto = billing?.mode === 'auto';
  const hasAccess = isAuto;
  const planInactive = isPlanInactive(billing);

  const selectedPlatforms = useMemo((): AIPlanPlatform[] => {
    const selected = billing?.aiPlanSelected;
    if (!selected) return [];
    const order: AIPlanPlatform[] = ['facebook', 'instagram', 'linkedin'];
    return order.filter((p) => selected[p] === true);
  }, [billing?.aiPlanSelected]);

  const platforms = selectedPlatforms;

  const visibleDays = useMemo(() => {
    if (platforms.length === 0) return [];
    return days.map((day) => {
      const byPlatform: AIPlanDay['byPlatform'] = {};
      for (const platform of platforms) {
        byPlatform[platform] = day.byPlatform[platform] ?? {
          generated: [],
          upcoming: [],
        };
      }
      return { ...day, byPlatform };
    });
  }, [days, platforms]);

  const hasEnqueuedCells = useMemo(
    () =>
      days.some((day) =>
        Object.values(day.byPlatform).some((slot) =>
          Boolean(
            slot?.upcoming.some((item) => item.status === 'enqueued') ||
            slot?.generated.some((item) => item.status === 'queued')
          )
        )
      ),
    [days]
  );

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const data = await getAIPlanApi();
      setDays(data.days);
      setRange({ from: data.from, to: data.to });
      setCalendarSeeded(data.calendarSeeded);
      setInitialGenerationPending(data.initialCalendarGenerationPending);
      setCanGenerateCalendar(data.canGenerateCalendar);
      setPlatformLimit(data.platformLimit);
      setPlatformChoice(data.selectedPlatforms);
      setRunningForceRunKeys((prev) => {
        if (prev.size === 0) return prev;
        const next = new Set(prev);
        for (const key of prev) {
          const target = parseForceRunLockKey(key);
          if (target && isForceRunTargetComplete(data.days, target)) {
            next.delete(key);
          }
        }
        return next.size === prev.size ? prev : next;
      });
      if (silent) setError('');
    } catch (err) {
      const message =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message
          ? String(
              (err as { response?: { data?: { message?: string } } }).response
                ?.data?.message
            )
          : err instanceof Error
            ? err.message
            : 'Failed to load AI Plan';
      if (!silent) {
        setError(message);
        setDays([]);
      } else {
        toast.error(`Could not refresh calendar: ${message}`);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const handleSavePlatforms = useCallback(async () => {
    if (platformChoice.length !== platformLimit) {
      toast.error(
        `Select exactly ${platformLimit} platform${platformLimit === 1 ? '' : 's'}`
      );
      return;
    }
    setSavingPlatforms(true);
    try {
      await selectAIPlanPlatformsApi(platformChoice);
      toast.success('Platforms locked and your monthly AI Plan was created');
      await load();
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? String(
              (err as { response?: { data?: { message?: string } } }).response
                ?.data?.message ?? 'Could not save AI Plan platforms'
            )
          : err instanceof Error
            ? err.message
            : 'Could not save AI Plan platforms';
      toast.error(message);
    } finally {
      setSavingPlatforms(false);
    }
  }, [load, platformChoice, platformLimit]);

  const handleGenerateCalendar = useCallback(async () => {
    setGeneratingCalendar(true);
    try {
      await generateAIPlanApi();
      toast.success('Your AI Plan is ready');
      await load({ silent: true });
    } catch (err) {
      const message =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message
          ? String(
              (err as { response?: { data?: { message?: string } } }).response
                ?.data?.message
            )
          : err instanceof Error
            ? err.message
            : 'Failed to generate AI Plan';
      toast.error(message);
    } finally {
      setGeneratingCalendar(false);
    }
  }, [load]);

  const handleForceRun = useCallback(
    async (
      date: string,
      platform: AIPlanPlatform,
      kind: AIPlanUpcomingItem['kind'],
      eventId?: string
    ) => {
      if (date < todayIso) {
        toast.error('Force Run is not available for past dates');
        return;
      }
      if (kind === 'empty') {
        toast.error('No planned generation on this date');
        return;
      }
      const lockKey = forceRunLockKey({ date, platform, kind, eventId });
      setRunningForceRunKeys((prev) => new Set(prev).add(lockKey));
      try {
        await forceRunAIPlanApi({
          date,
          platform,
          kind,
          ...(eventId ? { eventId } : {}),
        });
        toast.success(
          kind === 'video-generation'
            ? `Generating one shared video for all platforms on ${date}`
            : `Generating for ${platform} on ${date}`
        );
        // The shared video row keeps its merged running control. Other kinds
        // optimistically update only the clicked platform.
        setDays((prev) =>
          prev.map((day) => {
            if (day.date !== date) return day;
            // Keep the shared video row intact while its continuous button
            // displays the running state. The silent reload replaces it with
            // generated records once the backend reports completion.
            if (kind === 'video-generation') return day;
            const matchesClicked = (u: AIPlanUpcomingItem) => {
              if (u.kind !== kind) return false;
              if (kind === 'festival' && eventId) {
                return u.eventId === eventId;
              }
              return true;
            };
            const nextByPlatform = { ...day.byPlatform };
            for (const targetPlatform of [platform]) {
              const slot = day.byPlatform[targetPlatform];
              if (!slot) continue;
              const remainingUpcoming = slot.upcoming.filter(
                (u) => !matchesClicked(u)
              );
              const queuedItem = slot.upcoming.find(matchesClicked);
              const queuedGenerated: AIPlanGeneratedItem = {
                kind:
                  kind === 'festival'
                    ? 'festive'
                    : (kind as AIPlanGeneratedItem['kind']),
                status: 'queued',
                origin: 'auto',
                title: queuedItem?.label ?? 'Queued',
                captionPreview: queuedItem?.note,
              };
              nextByPlatform[targetPlatform] = {
                generated: [...slot.generated, queuedGenerated],
                upcoming: remainingUpcoming,
              };
            }
            return {
              ...day,
              byPlatform: nextByPlatform,
            };
          })
        );
        void load({ silent: true });
      } catch (err) {
        setRunningForceRunKeys((prev) => {
          const next = new Set(prev);
          next.delete(lockKey);
          return next;
        });
        const message =
          err &&
          typeof err === 'object' &&
          'response' in err &&
          (err as { response?: { data?: { message?: string } } }).response?.data
            ?.message
            ? String(
                (err as { response?: { data?: { message?: string } } }).response
                  ?.data?.message
              )
            : err instanceof Error
              ? err.message
              : 'Force Run failed';
        toast.error(message);
      }
    },
    [load, todayIso]
  );

  const handleGlobalForceRun = useCallback(async () => {
    const targets = globalForceRunTargets({ days, platforms, todayIso });
    if (targets.length === 0) {
      toast.error(
        'There is no remaining AI Plan content available to Force Run'
      );
      return;
    }

    let queued = 0;
    let failed = 0;
    setGlobalForceRunProgress({
      phase: 'queueing',
      completed: 0,
      total: targets.length,
      queued,
      failed,
      targets: [],
    });
    const queuedTargets: GlobalForceRunTarget[] = [];
    try {
      for (let index = 0; index < targets.length; index += 1) {
        const target = targets[index];
        try {
          await forceRunAIPlanApi(target);
          queued += 1;
          queuedTargets.push(target);
        } catch {
          // A card can become unavailable while the batch is being queued;
          // continue with the rest of the plan and report the aggregate.
          failed += 1;
        }
        setGlobalForceRunProgress({
          phase: 'queueing',
          completed: index + 1,
          total: targets.length,
          queued,
          failed,
          targets: [],
        });
      }
      await load({ silent: true });
      if (queuedTargets.length === 0) {
        setGlobalForceRunProgress(null);
      } else {
        setGlobalForceRunProgress({
          phase: 'generating',
          // Failed requests are terminal; the remaining percentage tracks
          // the jobs that were successfully queued.
          completed: failed,
          total: targets.length,
          queued,
          failed,
          targets: queuedTargets,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Force Run failed';
      toast.error(message);
      setGlobalForceRunProgress(null);
    }
  }, [days, load, platforms, todayIso]);

  useEffect(() => {
    if (globalForceRunProgress?.phase !== 'generating') return;
    const generatedCount = globalForceRunProgress.targets.filter((target) =>
      isForceRunTargetComplete(days, target)
    ).length;
    const completed = globalForceRunProgress.failed + generatedCount;
    if (completed < globalForceRunProgress.total) {
      if (completed !== globalForceRunProgress.completed) {
        setGlobalForceRunProgress({ ...globalForceRunProgress, completed });
      }
      return;
    }
    if (globalForceRunProgress.failed === 0) {
      toast.success('All remaining AI Plan content has finished generating');
    }
    setGlobalForceRunProgress(null);
  }, [days, globalForceRunProgress]);

  useEffect(() => {
    if (runningForceRunKeys.size === 0 && !hasEnqueuedCells) return;
    const id = window.setInterval(() => {
      void load({ silent: true });
    }, 4000);
    return () => window.clearInterval(id);
  }, [hasEnqueuedCells, runningForceRunKeys.size, load]);

  useEffect(() => {
    if (authLoading || creditsLoading) return;
    if (!user) {
      initialLoadUidRef.current = null;
      return;
    }
    if (planInactive || !hasAccess) return;
    if (initialLoadUidRef.current === user.uid) return;
    initialLoadUidRef.current = user.uid;
    // Initial API hydration intentionally owns this page's loading state.
    void load();
  }, [authLoading, creditsLoading, user, planInactive, hasAccess, load]);

  if (authLoading || creditsLoading) {
    return <PageLoadingState />;
  }

  if (planInactive) {
    return <NonSubscribedFeatureBlock />;
  }

  if (!hasAccess) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <CalendarRange className="h-10 w-10 text-secondary" />
        <h1 className="text-page-title text-default">
          Upgrade to unlock AI Plan
        </h1>
        <p className="text-sm text-secondary">
          AI Plan automation is available on Prime AI, Elite AI, and Legacy AI
          plans.
        </p>
        <Link
          href="/settings/billings"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-link-foreground hover:opacity-90"
        >
          View plans
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6">
      {globalForceRunProgress ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 px-6 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-label="Generating all AI Plan content"
        >
          <div className="w-full max-w-md rounded-xl border border-default bg-default p-6 text-center">
            <Loader2
              className="mx-auto h-9 w-9 animate-spin text-link"
              aria-hidden
            />
            <h2 className="text-section text-default mt-4">Loading</h2>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-element">
              <div
                className="h-full rounded-full bg-default transition-expo"
                style={{
                  width: `${Math.round((globalForceRunProgress.completed / globalForceRunProgress.total) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-3 text-sm font-semibold tabular-nums text-default">
              {Math.round(
                (globalForceRunProgress.completed /
                  globalForceRunProgress.total) *
                  100
              )}
              % · {globalForceRunProgress.completed} of{' '}
              {globalForceRunProgress.total}
            </p>
          </div>
        </div>
      ) : null}
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-link">
          <CalendarRange className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Auto mode
          </span>
        </div>
        <h1 className="text-page-title text-default">AI Plan</h1>
        <p className="max-w-2xl text-sm text-secondary">
          Your AI Plan calendar from start to end — rows are days, columns are
          the platforms locked for this billing cycle.
        </p>
        {range?.from && range?.to ? (
          <p className="text-xs font-medium text-default">
            Plan period:{' '}
            <span className="tabular-nums text-secondary">
              {formatDateParts(range.from).day} →{' '}
              {formatDateParts(range.to).day}
            </span>
          </p>
        ) : null}
      </header>

      {platforms.length === 0 && !loading ? (
        <div
          id="platform-selection"
          className="border border-default bg-default px-5 py-8 text-center"
        >
          <Share2 className="mx-auto mb-3 h-8 w-8 text-secondary" />
          <p className="text-sm font-medium text-default">
            Select platforms for this AI Plan cycle
          </p>
          <p className="mt-1 text-xs text-secondary">
            Select exactly the number included with your tier. Accounts can be
            connected later; the selection locks until renewal.
          </p>
          <div className="mx-auto mt-5 grid max-w-xl gap-3 sm:grid-cols-3">
            {(Object.keys(PLATFORM_LABEL) as AIPlanPlatform[]).map(
              (platform) => {
                const checked = platformChoice.includes(platform);
                return (
                  <label
                    key={platform}
                    className={cn(
                      'cursor-pointer rounded-xl border border-default p-4 text-left',
                      checked && 'border-primary bg-primary/10'
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={checked}
                      disabled={
                        !checked && platformChoice.length >= platformLimit
                      }
                      onChange={() =>
                        setPlatformChoice((current) =>
                          checked
                            ? current.filter((item) => item !== platform)
                            : [...current, platform]
                        )
                      }
                    />
                    <span className="font-semibold">
                      {PLATFORM_LABEL[platform]}
                    </span>
                  </label>
                );
              }
            )}
          </div>
          <p className="mt-4 text-xs text-secondary">
            Your tier requires exactly {platformLimit}. This choice cannot
            change during the billing cycle.
          </p>
          <button
            type="button"
            onClick={() => void handleSavePlatforms()}
            disabled={savingPlatforms}
            className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-link-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:text-quaternary"
          >
            {savingPlatforms
              ? 'Creating AI Plan…'
              : 'Lock selection and create AI Plan'}
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your AI Plan…
        </div>
      ) : null}

      {error ? (
        <div className="border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
          <button
            type="button"
            onClick={() => void load()}
            className="ml-3 font-semibold underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      {!loading &&
      !error &&
      isAuto &&
      initialGenerationPending &&
      platforms.length > 0 ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center border border-default bg-default px-6 text-center">
          <CalendarRange className="mb-4 h-10 w-10 text-link" />
          <h2 className="text-section text-default">
            Generate your AI Plan calendar
          </h2>
          <p className="mt-2 max-w-md text-sm text-secondary">
            We’ll allocate Create Post, Videos, Carousel Posts, Occasion Posts,
            and Campaigns across your current plan.
          </p>
          <button
            type="button"
            onClick={() => void handleGenerateCalendar()}
            disabled={!canGenerateCalendar || generatingCalendar}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-link-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:text-quaternary"
          >
            {generatingCalendar ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {generatingCalendar ? 'Generating AI Plan…' : 'Generate AI Plan'}
          </button>
          {!canGenerateCalendar ? (
            <p className="mt-3 text-xs text-secondary">
              Complete your business profile and platform selection first.
            </p>
          ) : null}
        </div>
      ) : null}

      {!loading &&
      !error &&
      platforms.length > 0 &&
      (!isAuto || calendarSeeded) ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 px-0.5">
            {isAuto ? (
              <button
                type="button"
                onClick={() => void handleGlobalForceRun()}
                disabled={globalForceRunProgress !== null}
                className="mr-auto inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-link-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:text-quaternary"
              >
                <Play className="h-3.5 w-3.5" aria-hidden />
                Force Run all remaining
              </button>
            ) : null}
            <span className="text-[10px] font-semibold uppercase tracking-wider text-secondary">
              Legend
            </span>
            {LEGEND.map((item) => (
              <span
                key={item.kind}
                className={cn(
                  'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold',
                  cellToneClass(item.kind)
                )}
              >
                {item.label}
              </span>
            ))}
          </div>
          {isAuto ? (
            <p className="rounded-md border border-default bg-element px-3 py-2 text-sm text-secondary">
              Tip: hover over a cell for details. Force Run appears on planned
              Campaigns, Create Post, Videos, Carousel Posts, or Occasion Posts
              Studio cells — it hides after Force Run, when content is already
              generating/generated, or when the post was removed or rejected by
              the user.
            </p>
          ) : (
            <p className="rounded-md border border-default bg-element px-3 py-2 text-sm text-secondary">
              Tip: hover over a cell for details. Empty cells mean no content is
              scheduled yet for that day and platform.
            </p>
          )}
          <AIPlanSheet
            days={visibleDays}
            platforms={platforms}
            todayIso={todayIso}
            forceRunEnabled={isAuto}
            runningForceRunKeys={runningForceRunKeys}
            onForceRun={handleForceRun}
          />
        </div>
      ) : null}
    </div>
  );
}
