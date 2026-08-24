import axiosClient from '@/lib/axios';

export type AIPlanPlatform = 'facebook' | 'instagram' | 'linkedin';
export type AIPlanGeneratedKind = 'campaign' | 'ai-engine' | 'quick-create' | 'product-advert' | 'video-generation' | 'carousel' | 'festive' | 'other';
export type AIPlanCell = {
  id: string;
  date: string;
  platform: AIPlanPlatform;
  kind: string;
  status: string;
  userId?: string;
  cycleId?: string;
  runKey?: string;
  reason?: string;
  briefKey?: string;
  videoVariant?: string;
  sharedVideoKey?: string;
  targetPlatforms?: AIPlanPlatform[];
  updatedAt?: unknown;
  festivals?: Array<{ id: string; name: string; status?: string }>;
  campaign?: {
    dayNumber?: number;
    title?: string;
    reference?: string;
    caption?: string | null;
    theme?: string;
    description?: string | null;
    goal?: string | null;
    windowStart?: string;
    windowEnd?: string;
    batchId?: string;
  };
};
export type AIPlanGeneratedItem = {
  kind: AIPlanGeneratedKind;
  status: 'draft' | 'scheduled' | 'queued' | 'removed' | 'rejected' | 'rejected-by-user' | 'rejected-by-admin';
  title?: string;
  captionPreview?: string;
  scheduledPostId?: string;
  draftId?: string;
  contentId?: string;
  source?: string;
  cell?: AIPlanCell;
  raw?: RawAIPlanContent;
};
export type AIPlanUpcomingItem = {
  kind: 'festival' | 'ai-engine' | 'quick-create' | 'campaign' | 'video-generation' | 'carousel' | 'empty';
  label: string;
  note?: string;
  status?: string;
  eventId?: string;
  cellId?: string;
  date?: string;
  platform?: AIPlanPlatform;
  rawKind?: string;
  runKey?: string;
  cycleId?: string;
  userId?: string;
  updatedAt?: unknown;
  campaign?: AIPlanCell['campaign'];
  festivals?: AIPlanCell['festivals'];
  targetPlatforms?: AIPlanCell['targetPlatforms'];
  cell?: AIPlanCell;
};
export type AIPlanDay = {
  date: string;
  festivals: Array<{ id: string; name: string }>;
  byPlatform: Partial<Record<AIPlanPlatform, { generated: AIPlanGeneratedItem[]; upcoming: AIPlanUpcomingItem[] }>>;
};

type RawAIPlan = {
  aiPlan: {
    status: 'awaiting_selection' | 'calendar_ready' | 'inactive';
    selectedPlatforms: AIPlanPlatform[];
    lockedAt: unknown | null;
    nextCycle?: { planId: string; platformLimit: number; selectedPlatforms: AIPlanPlatform[] } | null;
  };
  plan: { id: string; displayName: string; platformLimit: number };
  connectionState: Record<AIPlanPlatform, { connected: boolean; status?: string }>;
  cycle: { id: string } | null;
  cells: AIPlanCell[];
  content: RawAIPlanContent[];
};

type RawAIPlanContent = {
  id: string;
  platform: AIPlanPlatform;
  lifecycle: string;
  caption?: string;
  message?: string;
  eventName?: string;
  source?: string;
  targetDate?: string;
  aiPlan?: { cellId?: string };
};

export type AIPlanResponse = {
  from: string;
  to: string;
  platforms: AIPlanPlatform[];
  days: AIPlanDay[];
  calendarSeeded: boolean;
  initialCalendarGenerationPending: boolean;
  canGenerateCalendar: boolean;
  platformLimit: number;
  selectedPlatforms: AIPlanPlatform[];
  locked: boolean;
  connectionState: RawAIPlan['connectionState'];
  nextCycle: RawAIPlan['aiPlan']['nextCycle'];
};

function generatedStatus(value: string): AIPlanGeneratedItem['status'] {
  if (value === 'scheduled' || value === 'draft' || value === 'removed' || value === 'rejected') return value;
  return 'queued';
}

function upcomingKind(value: string): AIPlanUpcomingItem['kind'] {
  if (value === 'video') return 'video-generation';
  if (value === 'campaign' || value === 'ai-engine' || value === 'quick-create' || value === 'carousel' || value === 'empty') return value;
  return 'empty';
}

function normalize(raw: RawAIPlan): AIPlanResponse {
  const selectedPlatforms = Array.isArray(raw.aiPlan?.selectedPlatforms)
    ? raw.aiPlan.selectedPlatforms.filter(
        (platform): platform is AIPlanPlatform =>
          platform === 'facebook' ||
          platform === 'instagram' ||
          platform === 'linkedin'
      )
    : [];
  const dates = [...new Set(raw.cells.map((cell) => cell.date))].sort();
  const days = dates.map<AIPlanDay>((date) => {
    const byPlatform: AIPlanDay['byPlatform'] = {};
    const festivals = raw.cells
      .filter((cell) => cell.date === date)
      .flatMap((cell) => cell.festivals ?? [])
      .filter(
        (festival, index, all) =>
          all.findIndex((candidate) => candidate.id === festival.id) === index
      );
    for (const platform of selectedPlatforms) {
      const cell = raw.cells.find((item) => item.date === date && item.platform === platform);
      if (!cell) continue;
      const generated = raw.content
        .filter(
          (item) =>
            item.platform === platform &&
            (item.aiPlan?.cellId === cell.id ||
              (cell.kind === 'campaign' &&
                item.source === 'campaign' &&
                item.targetDate === date))
        )
        .map<AIPlanGeneratedItem>((item) => ({
          kind: (item.source === 'ai_plan' ? upcomingKind(cell.kind) : item.source ?? 'other') as AIPlanGeneratedKind,
          status: generatedStatus(item.lifecycle),
          title: item.eventName,
          captionPreview: item.caption ?? item.message,
          scheduledPostId: item.id,
          contentId: item.id,
          source: item.source,
          cell,
          raw: item,
        }));
      for (const festival of cell.festivals ?? []) {
        const festivalStatus = String(festival.status ?? '').toLowerCase();
        if (festivalStatus === 'done') {
          generated.push({
            kind: 'festive',
            status: 'scheduled',
            title: festival.name,
            cell,
          });
        }
      }
      if (
        cell.status === 'done' &&
        !generated.some(
          (item) => item.kind !== 'festive' && item.kind === upcomingKind(cell.kind)
        )
      ) {
        generated.push({
          kind: upcomingKind(cell.kind) as AIPlanGeneratedKind,
          status: 'scheduled',
          title:
            cell.kind === 'campaign'
              ? cell.campaign?.title
              : kindLabelFromCellKind(cell.kind),
          captionPreview: cell.reason,
          cell,
        });
      }
      const generatedForPlannedCell = generated.filter(
        (item) => item.kind !== 'festive'
      );
      byPlatform[platform] = {
        generated,
        upcoming: [
          ...(generatedForPlannedCell.length || (cell.status !== 'planned' && cell.status !== 'enqueued' && cell.status !== 'failed')
            ? []
            : [{
                kind: upcomingKind(cell.kind),
                label:
                  cell.kind === 'campaign'
                    ? cell.campaign?.title || `Campaigns · Day ${cell.campaign?.dayNumber ?? ''}`.trim()
                    : cell.kind,
                note: cell.reason,
                status: cell.status,
                cellId: cell.id,
                date: cell.date,
                platform: cell.platform,
                rawKind: cell.kind,
                runKey: cell.runKey,
                cycleId: cell.cycleId,
                userId: cell.userId,
                updatedAt: cell.updatedAt,
                campaign: cell.campaign,
                festivals: cell.festivals,
                targetPlatforms: cell.targetPlatforms,
                cell,
              }]),
          ...(cell.status === 'planned' || cell.status === 'enqueued' || cell.status === 'failed'
            ? (cell.festivals ?? [])
                .filter((festival) => {
                  const status = String(festival.status ?? cell.status).toLowerCase();
                  return status !== 'done';
                })
                .map((festival) => ({
                kind: 'festival' as const,
                label: festival.name,
                eventId: festival.id,
                status: festival.status ?? cell.status,
                cellId: cell.id,
                date: cell.date,
                platform: cell.platform,
                rawKind: cell.kind,
                runKey: cell.runKey,
                cycleId: cell.cycleId,
                userId: cell.userId,
                updatedAt: cell.updatedAt,
                festivals: cell.festivals,
                cell,
              }))
            : []),
        ],
      };
    }
    return { date, festivals, byPlatform };
  });
  return {
    from: dates[0] ?? '',
    to: dates.at(-1) ?? '',
    platforms: selectedPlatforms,
    days,
    calendarSeeded: raw.aiPlan.status === 'calendar_ready',
    initialCalendarGenerationPending: raw.aiPlan.status === 'awaiting_selection' && raw.aiPlan.lockedAt != null,
    canGenerateCalendar: raw.aiPlan.lockedAt != null,
    platformLimit: raw.plan.platformLimit,
    selectedPlatforms,
    locked: raw.aiPlan.lockedAt != null,
    connectionState: raw.connectionState,
    nextCycle: raw.aiPlan.nextCycle,
  };
}

function kindLabelFromCellKind(kind: string): string {
  if (kind === 'video') return 'Video generated';
  if (kind === 'quick-create') return 'Content Studio generated';
  if (kind === 'ai-engine') return 'AutoPilot generated';
  if (kind === 'carousel') return 'Carousel generated';
  if (kind === 'campaign') return 'Campaign generated';
  return 'Generated';
}

export async function getAIPlanApi(): Promise<AIPlanResponse> {
  const response = await axiosClient.get<{ success: boolean; data: RawAIPlan }>('/api/v1/user/ai-plan');
  return normalize(response.data.data);
}
export async function selectAIPlanPlatformsApi(platforms: AIPlanPlatform[]) {
  const response = await axiosClient.put('/api/v1/user/ai-plan/platforms', { platforms });
  return response.data.data;
}
export async function selectNextCycleAIPlanPlatformsApi(platforms: AIPlanPlatform[]) {
  const response = await axiosClient.put('/api/v1/user/ai-plan/next-cycle-platforms', { platforms });
  return response.data.data;
}
export async function generateAIPlanApi() {
  const response = await axiosClient.post('/api/v1/user/ai-plan/generate');
  return response.data.data as { cycleId: string; cellCount: number };
}
export type AIPlanForceRunResult = { date: string; platform: AIPlanPlatform; calendarKind: string; enqueuedCount: number; outcomes: Array<{ kind: string; reason?: string }> };
export async function forceRunAIPlanApi(args: { date: string; platform: AIPlanPlatform; kind: AIPlanUpcomingItem['kind']; eventId?: string }): Promise<AIPlanForceRunResult> {
  const response = await axiosClient.post<{ success: boolean; data: AIPlanForceRunResult }>('/api/v1/user/ai-plan/force-run', args);
  return response.data.data;
}
