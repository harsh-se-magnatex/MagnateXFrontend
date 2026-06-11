'use client';

import {
  AiEngineCellState,
  AiEnginePlatform,
  AiEngineReviewCell,
  AiEngineReviewResponse,
  AiEngineReviewRow,
  getAdminAiEngineReview,
  triggerAdminAiEngineGenerate,
  triggerAdminAiEngineRegenerate,
} from '@/src/service/api/adminService';
import { useUser } from '../../_components/useUser';
import { useRouter } from 'next/navigation';
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { showErrorToast } from '@/lib/show-error-toast';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  Facebook,
  Image as ImageIcon,
  Instagram,
  Linkedin,
  Loader2,
  RefreshCw,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';

const PLATFORMS: AiEnginePlatform[] = ['instagram', 'facebook', 'linkedin'];

const PLATFORM_LABEL: Record<AiEnginePlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
};

const PLATFORM_ICON: Record<
  AiEnginePlatform,
  React.ComponentType<{ className?: string }>
> = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
};

/**
 * Pending row × platform action state for the optimistic spinner. Keyed by
 * `${userId}::${platform}`.
 */
type ActionKind = 'generate' | 'regenerate';

function actionKey(userId: string, platform: AiEnginePlatform): string {
  return `${userId}::${platform}`;
}

export default function AdminAiEngineReviewPage() {
  const { user } = useUser();
  const router = useRouter();

  const [date, setDate] = useState<string>(''); // empty until first response
  const [dateInput, setDateInput] = useState<string>('');
  // Server-provided upper bound — the picker is clamped to this so admins
  // cannot query future dates (the daily cron has not run for them yet).
  const [maxDate, setMaxDate] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('Asia/Kolkata');
  const [rows, setRows] = useState<AiEngineReviewRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [pendingActions, setPendingActions] = useState<
    Record<string, ActionKind | undefined>
  >({});
  const [previewCell, setPreviewCell] = useState<{
    row: AiEngineReviewRow;
    platform: AiEnginePlatform;
    cell: AiEngineReviewCell;
  } | null>(null);

  // Used by `silentRefresh` so we don't show a skeleton on auto-refresh after
  // an action — same pattern the post-queue / approval pages use.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (user && !user.admin) {
      router.replace('/home');
    }
  }, [router, user]);

  const fetchReview = useCallback(
    async (
      requestedDate: string | undefined,
      opts: { initial?: boolean; silent?: boolean } = {}
    ) => {
      const { initial, silent } = opts;
      if (!silent) {
        if (initial) setLoading(true);
        else setRefreshing(true);
      }
      try {
        const res = await getAdminAiEngineReview(requestedDate);
        if (!isMountedRef.current) return;
        const payload = res.data as AiEngineReviewResponse;
        setRows(payload.rows);
        setDate(payload.date);
        setTimezone(payload.timezone);
        setMaxDate(payload.today);
        if (!dateInput) setDateInput(payload.date);
      } catch (err) {
        if (!silent) {
          showErrorToast(
            err instanceof Error
              ? err.message
              : 'Failed to load AI engine review'
          );
        }
      } finally {
        if (!isMountedRef.current) return;
        if (!silent) {
          if (initial) setLoading(false);
          else setRefreshing(false);
        }
      }
    },
    // dateInput intentionally excluded — we only seed it once on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    if (!user?.admin) return;
    fetchReview(undefined, { initial: true });
  }, [user, fetchReview]);

  const onSubmitDate = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const requested = dateInput.trim();
      if (!requested) return;
      // Client-side guardrail; the backend rejects future dates too.
      if (maxDate && requested > maxDate) {
        showErrorToast(
          `Future dates are not supported. The latest reviewable date is ${maxDate}.`
        );
        return;
      }
      fetchReview(requested, { initial: false });
    },
    [dateInput, fetchReview, maxDate]
  );

  const handleAction = useCallback(
    async (
      row: AiEngineReviewRow,
      platform: AiEnginePlatform,
      kind: ActionKind
    ) => {
      const key = actionKey(row.userId, platform);
      const previousCell = row.cells[platform];
      if (!previousCell) return;

      // Optimistically flip cell to "running" so the user sees instant
      // feedback. Real state will be reconciled by the silent refresh below.
      setPendingActions((prev) => ({ ...prev, [key]: kind }));
      setRows((prev) =>
        prev.map((r) =>
          r.userId === row.userId
            ? {
                ...r,
                cells: {
                  ...r.cells,
                  [platform]: {
                    ...previousCell,
                    state: 'running',
                    error: null,
                  },
                },
              }
            : r
        )
      );
      // Mirror into the open preview modal so it doesn't show stale state.
      setPreviewCell((prev) =>
        prev && prev.row.userId === row.userId && prev.platform === platform
          ? {
              ...prev,
              cell: { ...previousCell, state: 'running', error: null },
            }
          : prev
      );

      try {
        if (kind === 'regenerate') {
          if (!previousCell.scheduledPostId) {
            throw new Error('No existing post to regenerate');
          }
          await triggerAdminAiEngineRegenerate(
            row.userId,
            platform,
            previousCell.scheduledPostId
          );
          toast.success(`Regeneration queued for ${PLATFORM_LABEL[platform]}`);
        } else {
          await triggerAdminAiEngineGenerate(row.userId, platform, date);
          toast.success(`Generation queued for ${PLATFORM_LABEL[platform]}`);
        }

        // Background refresh to pick up the lock-doc transition the worker
        // performs as soon as it dequeues. The optimistic "running" cell
        // remains in place until the response lands.
        await fetchReview(date || undefined, { silent: true });
      } catch (err) {
        // Roll back the optimistic state.
        setRows((prev) =>
          prev.map((r) =>
            r.userId === row.userId
              ? {
                  ...r,
                  cells: { ...r.cells, [platform]: previousCell },
                }
              : r
          )
        );
        setPreviewCell((prev) =>
          prev && prev.row.userId === row.userId && prev.platform === platform
            ? { ...prev, cell: previousCell }
            : prev
        );
        showErrorToast(
          err instanceof Error
            ? err.message
            : 'Failed to trigger AI engine job'
        );
      } finally {
        setPendingActions((prev) => {
          if (!(key in prev)) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [date, fetchReview]
  );

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.userId.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    let scheduled = 0;
    let running = 0;
    let failed = 0;
    let none = 0;
    let totalCells = 0;
    for (const row of rows) {
      for (const platform of row.selectedPlatforms) {
        const cell = row.cells[platform];
        if (!cell) continue;
        totalCells += 1;
        if (cell.state === 'scheduled') scheduled += 1;
        else if (cell.state === 'running') running += 1;
        else if (cell.state === 'failed') failed += 1;
        else none += 1;
      }
    }
    return { scheduled, running, failed, none, totalCells };
  }, [rows]);

  if (!user?.admin) return null;

  return (
    <div className="min-h-screen bg-[#0B1020] text-white px-4 py-8 md:px-10">
      <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-[#6C5CE7] to-[#00D1FF]">
            AI Engine Review
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Per-user × per-platform check for the daily AI-engine generation.
            Showing posts scheduled for{' '}
            <span className="font-semibold text-white">{date || '—'}</span>
            {timezone ? (
              <span className="text-white/40"> ({timezone})</span>
            ) : null}
            .
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchReview(date || undefined, { initial: false })}
          disabled={refreshing}
          className="self-start rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-60 transition flex items-center gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <form
        onSubmit={onSubmitDate}
        className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5"
      >
        <div className="grid gap-3 md:grid-cols-[260px_1fr_140px]">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
              Target date
            </span>
            <input
              type="date"
              value={dateInput}
              max={maxDate || undefined}
              onChange={(e) => setDateInput(e.target.value)}
              className="h-11 rounded-lg border border-white/20 bg-white/10 px-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/60 [color-scheme:dark]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
              Search user
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, or user id"
              className="h-11 rounded-lg border border-white/20 bg-white/10 px-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/60"
            />
          </label>
          <button
            type="submit"
            className="h-11 self-end rounded-lg bg-[#00D1FF] px-5 font-semibold text-[#0B1020] hover:bg-[#32dbff] transition-colors"
          >
            Apply date
          </button>
        </div>
      </form>

      {/* Stats strip */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatPill label="Eligible cells" value={stats.totalCells} tone="muted" />
        <StatPill
          label="Generated"
          value={stats.scheduled}
          tone="success"
          icon={CheckCircle2}
        />
        <StatPill
          label="Running"
          value={stats.running}
          tone="info"
          icon={Loader2}
          spinIcon
        />
        <StatPill
          label="Missing"
          value={stats.none}
          tone="warning"
          icon={Wand2}
        />
        <StatPill
          label="Failed"
          value={stats.failed}
          tone="danger"
          icon={AlertTriangle}
        />
      </div>

      {/* Table */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/10 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-white/80 min-w-[260px]">
                  User
                </th>
                {PLATFORMS.map((platform) => {
                  const Icon = PLATFORM_ICON[platform];
                  return (
                    <th
                      key={platform}
                      className="px-4 py-3 font-semibold text-white/80 min-w-[260px]"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {PLATFORM_LABEL[platform]}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={1 + PLATFORMS.length} className="px-4 py-12">
                    <div className="flex items-center justify-center gap-2 text-white/60">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading users…
                    </div>
                  </td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={1 + PLATFORMS.length}
                    className="px-4 py-12 text-center text-white/60"
                  >
                    {rows.length === 0
                      ? 'No subscribed users yet.'
                      : 'No users match your search.'}
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr
                    key={row.userId}
                    className="border-t border-white/10 align-top"
                  >
                    <td className="px-4 py-4">
                      <div className="font-semibold text-white">{row.name}</div>
                      <div className="text-xs text-white/50">{row.email}</div>
                      <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">
                        {row.activePlan}
                      </div>
                    </td>
                    {PLATFORMS.map((platform) => {
                      const isSelected =
                        row.selectedPlatforms.includes(platform);
                      const cell = row.cells[platform];
                      const key = actionKey(row.userId, platform);
                      const pending = pendingActions[key];
                      return (
                        <td key={platform} className="px-4 py-4">
                          {!isSelected || !cell ? (
                            <span className="text-xs text-white/30">
                              — Not selected
                            </span>
                          ) : (
                            <CellView
                              cell={cell}
                              pending={pending}
                              onView={() =>
                                setPreviewCell({ row, platform, cell })
                              }
                              onGenerate={() =>
                                handleAction(row, platform, 'generate')
                              }
                              onRegenerate={() =>
                                handleAction(row, platform, 'regenerate')
                              }
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {previewCell && (
        <PreviewModal
          row={previewCell.row}
          platform={previewCell.platform}
          cell={previewCell.cell}
          pending={pendingActions[actionKey(previewCell.row.userId, previewCell.platform)]}
          onClose={() => setPreviewCell(null)}
          onGenerate={() =>
            handleAction(previewCell.row, previewCell.platform, 'generate')
          }
          onRegenerate={() =>
            handleAction(previewCell.row, previewCell.platform, 'regenerate')
          }
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Subcomponents
// ────────────────────────────────────────────────────────────────────────────

type Tone = 'muted' | 'success' | 'warning' | 'danger' | 'info';

function StatPill({
  label,
  value,
  tone,
  icon: Icon,
  spinIcon,
}: {
  label: string;
  value: number;
  tone: Tone;
  icon?: React.ComponentType<{ className?: string }>;
  spinIcon?: boolean;
}) {
  const toneClass = {
    muted: 'bg-white/5 border-white/10 text-white/70',
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-200',
    danger: 'bg-red-500/10 border-red-500/30 text-red-200',
    info: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200',
  }[tone];
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${toneClass}`}
    >
      {Icon ? (
        <Icon
          className={`h-4 w-4 shrink-0 ${spinIcon ? 'animate-spin' : ''}`}
        />
      ) : null}
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-wider opacity-80">
          {label}
        </span>
        <span className="text-lg font-bold">{value}</span>
      </div>
    </div>
  );
}

function StateBadge({ state }: { state: AiEngineCellState }) {
  const map: Record<
    AiEngineCellState,
    { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }
  > = {
    none: {
      label: 'Not generated',
      cls: 'bg-white/5 border-white/15 text-white/70',
      Icon: Wand2,
    },
    running: {
      label: 'Running',
      cls: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200',
      Icon: Loader2,
    },
    scheduled: {
      label: 'Generated',
      cls: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200',
      Icon: CheckCircle2,
    },
    failed: {
      label: 'Failed',
      cls: 'bg-red-500/15 border-red-500/40 text-red-200',
      Icon: AlertTriangle,
    },
  };
  const { label, cls, Icon } = map[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cls}`}
    >
      <Icon
        className={`h-3 w-3 ${state === 'running' ? 'animate-spin' : ''}`}
      />
      {label}
    </span>
  );
}

function CellView({
  cell,
  pending,
  onView,
  onGenerate,
  onRegenerate,
}: {
  cell: AiEngineReviewCell;
  pending: ActionKind | undefined;
  onView: () => void;
  onGenerate: () => void;
  onRegenerate: () => void;
}) {
  const isLocked =
    pending !== undefined || (cell.state === 'running' && !pending);
  return (
    <div className="flex items-start gap-3">
      <Thumbnail cell={cell} onClick={cell.imageUrl ? onView : undefined} />
      <div className="flex-1 min-w-0 space-y-2">
        <StateBadge state={cell.state} />
        {cell.state === 'scheduled' && cell.postStatus ? (
          <div className="text-[11px] text-white/50">
            Admin Status:{' '}
            <span className="text-white/80">{cell.postStatus}</span>
            {cell.UserApprovalStatus ? (
              <>
                {' • '}
                UserApproval:{' '}
                <span className="text-white/80">
                  {cell.UserApprovalStatus}
                </span>
              </>
            ) : null}
          </div>
        ) : null}
        {cell.state === 'failed' && cell.error ? (
          <div className="text-[11px] text-red-200/90 line-clamp-2">
            {cell.error}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          {cell.state === 'scheduled' ? (
            <>
              <button
                type="button"
                onClick={onView}
                className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/80 hover:bg-white/10 transition disabled:opacity-50"
              >
                View
              </button>
              <button
                type="button"
                onClick={onRegenerate}
                disabled={isLocked}
                className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-[11px] font-semibold text-amber-100 hover:bg-amber-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending === 'regenerate' ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Regenerate
              </button>
            </>
          ) : cell.state === 'running' ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-cyan-200/80">
              <Loader2 className="h-3 w-3 animate-spin" />
              Worker running…
            </span>
          ) : (
            <button
              type="button"
              onClick={onGenerate}
              disabled={isLocked}
              className="inline-flex items-center gap-1 rounded-md bg-[#00D1FF] px-3 py-1 text-[11px] font-semibold text-[#0B1020] hover:bg-[#32dbff] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending === 'generate' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {cell.state === 'failed' ? 'Retry' : 'Generate'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Thumbnail({
  cell,
  onClick,
}: {
  cell: AiEngineReviewCell;
  onClick?: () => void;
}) {
  const placeholderClass =
    'flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/5 text-white/40';
  if (!cell.imageUrl) {
    return (
      <div className={placeholderClass}>
        <ImageIcon className="h-5 w-5" />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-black/40 hover:border-[#00D1FF]/60 transition"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cell.imageUrl}
        alt="Generated post"
        className="h-full w-full object-cover"
      />
    </button>
  );
}

function PreviewModal({
  row,
  platform,
  cell,
  pending,
  onClose,
  onGenerate,
  onRegenerate,
}: {
  row: AiEngineReviewRow;
  platform: AiEnginePlatform;
  cell: AiEngineReviewCell;
  pending: ActionKind | undefined;
  onClose: () => void;
  onGenerate: () => void;
  onRegenerate: () => void;
}) {
  const Icon = PLATFORM_ICON[platform];
  const isLocked = pending !== undefined || cell.state === 'running';
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0F162E] text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-[#00D1FF]" />
            <div>
              <div className="text-base font-semibold">
                {row.name} · {PLATFORM_LABEL[platform]}
              </div>
              <div className="text-xs text-white/50">{row.email}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-[260px_1fr]">
          <div className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/40">
            {cell.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cell.imageUrl}
                alt="Generated post"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white/40">
                <ImageIcon className="h-10 w-10" />
              </div>
            )}
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <StateBadge state={cell.state} />
            </div>
            <KV label="Scheduled post id" value={cell.scheduledPostId} />
            <KV label="Admin status" value={cell.postStatus} />
            <KV label="User approval" value={cell.UserApprovalStatus} />
            <KV label="Content type" value={cell.contentType} />
            <KV
              label="Content description"
              value={cell.contentDescription}
              multiline
            />
            {cell.error ? (
              <div>
                <div className="text-xs uppercase tracking-wider text-white/50">
                  Error
                </div>
                <div className="mt-1 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-[12px] text-red-200/90 whitespace-pre-wrap">
                  {cell.error}
                </div>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3 text-[11px] text-white/50">
              <Timestamp label="Started" ms={cell.startedAt} />
              <Timestamp label="Updated" ms={cell.updatedAt} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 bg-black/20 px-6 py-4">
          {cell.state === 'scheduled' ? (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={isLocked}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500/20 border border-amber-500/40 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/30 transition disabled:opacity-50"
            >
              {pending === 'regenerate' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Regenerate
            </button>
          ) : cell.state === 'running' ? (
            <span className="inline-flex items-center gap-2 text-sm text-cyan-200/80">
              <Loader2 className="h-4 w-4 animate-spin" />
              Worker is running this cell…
            </span>
          ) : (
            <button
              type="button"
              onClick={onGenerate}
              disabled={isLocked}
              className="inline-flex items-center gap-2 rounded-lg bg-[#00D1FF] px-4 py-2 text-sm font-semibold text-[#0B1020] hover:bg-[#32dbff] transition disabled:opacity-50"
            >
              {pending === 'generate' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {cell.state === 'failed' ? 'Retry generation' : 'Generate now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function KV({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string | null;
  multiline?: boolean;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-white/50">
        {label}
      </div>
      <div
        className={`mt-1 text-sm text-white/90 ${
          multiline ? 'whitespace-pre-wrap' : 'truncate'
        }`}
        title={!multiline && value ? value : undefined}
      >
        {value || <span className="text-white/30">—</span>}
      </div>
    </div>
  );
}

function Timestamp({ label, ms }: { label: string; ms: number | null }) {
  if (!ms) {
    return (
      <div>
        <div className="uppercase tracking-wider opacity-70">{label}</div>
        <div className="text-white/30">—</div>
      </div>
    );
  }
  let formatted = '—';
  try {
    formatted = new Date(ms).toLocaleString();
  } catch {
    /* ignore */
  }
  return (
    <div>
      <div className="uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-white/80">{formatted}</div>
    </div>
  );
}
