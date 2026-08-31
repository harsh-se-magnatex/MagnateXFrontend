'use client';

import {
  Check,
  CheckCircle2,
  CheckSquare,
  Copy,
  ExternalLink,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  postFirstCommentSend,
  postFirstCommentSuggestion,
  postFirstCommentUndo,
} from '@/src/service/api/analyticService';

import { platformLabel, type GrowthStudioPlatform } from './_common';
import type { RecentPostSnapshot } from './replyQueue';

/**
 * Growth Studio B1 — First-hour seeding nudge.
 *
 * When the user has published a post in the last 60 minutes, this card
 * surfaces a 3-step checklist (like / story / first comment) at the
 * top of the platform tab.
 *
 * The third step — "Drop the first comment" — is the AI-driven slot:
 *   • Generate / Edit / Copy / Send / Regenerate (Send works on
 *     Facebook + LinkedIn; copy-only on Instagram).
 *   • The send hits `/api/v1/growth-studio/first-comment-send` which
 *     posts a top-level comment as the page/org and persists a marker
 *     under `users/{uid}/firstComments/{platform}__{postId}`.
 *   • An Undo affordance (10s in-session window) calls the matching
 *     `/first-comment-undo` to delete the comment and clear the
 *     marker.
 *   • Across refreshes / devices the "Sent" badge re-hydrates from
 *     `firstCommentSentPostIds` (delivered by the insights GET).
 *
 * Like/story/repost steps stay as simple localStorage-backed toggles
 * keyed per `(platform, postId)`.
 *
 * When no recent post exists (or the 60-minute window already
 * elapsed), the card falls back to a static preview that explains
 * what will appear after the next publish.
 *
 * See plan section B1.
 */

const SIXTY_MINUTES_MS = 60 * 60 * 1000;
const UNDO_WINDOW_MS = 10_000;

type StepId = 'like' | 'story' | 'first-comment';

type StepDef = {
  id: StepId;
  label: (platform: GrowthStudioPlatform) => string;
};

const STEP_DEFS: StepDef[] = [
  {
    id: 'like',
    label: () => 'Like your post from your personal account.',
  },
  {
    id: 'story',
    label: (platform) =>
      platform === 'linkedin'
        ? 'Repost it from your personal LinkedIn profile.'
        : 'Share it to your personal story.',
  },
  {
    id: 'first-comment',
    label: () => 'Drop the first comment from your personal account.',
  },
];

const PLATFORM_SEND_SUPPORTED: Record<GrowthStudioPlatform, boolean> = {
  facebook: true,
  instagram: false,
  linkedin: true,
};

function storageKey(platform: GrowthStudioPlatform, postId: string): string {
  return `growth-studio:first-hour:${platform}:${postId}`;
}

function loadChecked(
  platform: GrowthStudioPlatform,
  postId: string
): Record<StepId, boolean> {
  const empty: Record<StepId, boolean> = {
    like: false,
    story: false,
    'first-comment': false,
  };
  if (typeof window === 'undefined') return empty;
  try {
    const raw = window.localStorage.getItem(storageKey(platform, postId));
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<Record<StepId, boolean>>;
    return {
      like: Boolean(parsed.like),
      story: Boolean(parsed.story),
      'first-comment': Boolean(parsed['first-comment']),
    };
  } catch {
    return empty;
  }
}

function saveChecked(
  platform: GrowthStudioPlatform,
  postId: string,
  state: Record<StepId, boolean>
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      storageKey(platform, postId),
      JSON.stringify(state)
    );
  } catch {
    // localStorage may be unavailable (private mode); the in-memory
    // state still works for the current session.
  }
}

function minutesRemaining(createdAt: string): number | null {
  const ts = Date.parse(createdAt);
  if (Number.isNaN(ts)) return null;
  const remainingMs = ts + SIXTY_MINUTES_MS - Date.now();
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / 60000);
}

type SuggestionState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'ready';
      text: string;
      source: 'openai' | 'fallback';
      edited?: string;
    }
  | { status: 'error'; error: string };

type SendState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'sent'; sentAt: number }
  | { status: 'error'; error: string };

type UndoState =
  | { status: 'idle' }
  | { status: 'undoing' }
  | { status: 'error'; error: string };

function readDraft(state: SuggestionState): string {
  if (state.status !== 'ready') return '';
  return state.edited ?? state.text;
}

function PlaceholderShellInline({
  steps,
  description,
}: {
  steps: string[];
  description: string;
}) {
  return (
    <div className="rounded-xl border border-warning bg-default p-4 ring-1 ring-[var(--border-warning)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-warning p-2" aria-hidden>
            <Zap className="h-4 w-4 text-warning" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-default">
              First-hour seeding nudge
            </p>
            <p className="text-xs leading-relaxed text-secondary">
              {description}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="shrink-0 bg-default text-[10px] font-medium uppercase tracking-wide text-secondary"
        >
          Idle
        </Badge>
      </div>
      <ul className="mt-4 space-y-2">
        {steps.map((label) => (
          <li
            key={label}
            className="flex items-start gap-2 text-xs text-default"
          >
            <Square
              className="mt-0.5 h-4 w-4 shrink-0 text-warning"
              aria-hidden
            />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Inline AI panel under the third checklist row. Owns its own
 * suggestion / send / undo state. Calls `onSentChange(true)` when the
 * comment is published so the parent can flip the row's checkmark in
 * a single source of truth.
 */
function FirstCommentPanel({
  platform,
  recentPost,
  pageName,
  initialAlreadySent,
  onSentChange,
}: {
  platform: GrowthStudioPlatform;
  recentPost: RecentPostSnapshot;
  pageName?: string;
  initialAlreadySent: boolean;
  onSentChange: (sent: boolean) => void;
}) {
  const sendSupported = PLATFORM_SEND_SUPPORTED[platform];
  const [suggestion, setSuggestion] = useState<SuggestionState>({
    status: 'idle',
  });
  const [send, setSend] = useState<SendState>(() =>
    // sentAt: 0 marks "hydrated from server" — no undo window.
    initialAlreadySent ? { status: 'sent', sentAt: 0 } : { status: 'idle' }
  );
  const [undo, setUndo] = useState<UndoState>({ status: 'idle' });
  const [copied, setCopied] = useState(false);
  // Wall-clock snapshot that drives the undo countdown. Kept in state
  // (instead of calling Date.now() during render) so the component
  // stays pure for `react-hooks/purity`. 0 means "before send" — the
  // gate `send.sentAt > 0` below means that initial 0 can't trick
  // `inUndoWindow` into being true while hydrated.
  const [nowMs, setNowMs] = useState(0);

  const isSent = send.status === 'sent';
  const isSending = send.status === 'sending';
  const isUndoing = undo.status === 'undoing';
  // Pull `sentAt` out so the dep array doesn't reference a property
  // that only exists on one discriminated-union variant. Sessions
  // hydrated from the server use 0 to mean "no undo window".
  const sentAt = send.status === 'sent' ? send.sentAt : 0;
  const inUndoWindow = sentAt > 0 && nowMs - sentAt < UNDO_WINDOW_MS;

  // Tick once a second while the undo window is open — purely visual.
  useEffect(() => {
    if (sentAt === 0) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [sentAt]);

  const generate = useCallback(async () => {
    setSuggestion({ status: 'loading' });
    try {
      const res = await postFirstCommentSuggestion({
        platform,
        postId: recentPost.postId,
        postMessage: recentPost.message,
        pageName,
      });
      setSuggestion({
        status: 'ready',
        text: res.data.suggestion,
        source: res.data.source,
      });
    } catch (err) {
      setSuggestion({
        status: 'error',
        error: 'Something went wrong',
      });
    }
  }, [platform, recentPost.postId, recentPost.message, pageName]);

  const edit = useCallback((next: string) => {
    setSuggestion((prev) => {
      if (prev.status !== 'ready') return prev;
      return { ...prev, edited: next };
    });
  }, []);

  const copy = useCallback(async () => {
    const draft = readDraft(suggestion);
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard may be denied — the textarea remains selectable.
    }
  }, [suggestion]);

  const sendComment = useCallback(async () => {
    const draft = readDraft(suggestion);
    if (!draft.trim()) return;
    setSend({ status: 'sending' });
    try {
      await postFirstCommentSend({
        platform,
        postId: recentPost.postId,
        message: draft.trim(),
      });
      const sentAt = Date.now();
      setSend({ status: 'sent', sentAt });
      // Snap `nowMs` so the initial `inUndoWindow` check resolves
      // immediately on the next render instead of waiting for the
      // first ticker tick.
      setNowMs(sentAt);
      setUndo({ status: 'idle' });
      onSentChange(true);
    } catch (err) {
      setSend({
        status: 'error',
        error: 'Something went wrong',
      });
    }
  }, [suggestion, platform, recentPost.postId, onSentChange]);

  const undoSend = useCallback(async () => {
    setUndo({ status: 'undoing' });
    try {
      await postFirstCommentUndo({
        platform,
        postId: recentPost.postId,
      });
      setSend({ status: 'idle' });
      setUndo({ status: 'idle' });
      onSentChange(false);
    } catch (err) {
      setUndo({
        status: 'error',
        error: 'Something went wrong',
      });
    }
  }, [platform, recentPost.postId, onSentChange]);

  // Sent + hydrated-from-server view: no editing, no undo.
  if (isSent && !inUndoWindow) {
    return (
      <div className="mt-2 ml-6 flex items-start gap-2 rounded-lg border border-success bg-success px-3 py-2 text-xs text-success">
        <CheckCircle2
          className="mt-0.5 h-4 w-4 shrink-0 text-success"
          aria-hidden
        />
        <p className="min-w-0 flex-1">
          First comment posted to {platformLabel(platform)}. Nice &mdash;
          that&apos;s the strongest early-signal lever for the algorithm.
        </p>
      </div>
    );
  }

  // Sent + still in undo window.
  if (isSent && inUndoWindow) {
    const secondsLeft = Math.max(
      0,
      Math.ceil((sentAt + UNDO_WINDOW_MS - nowMs) / 1000)
    );
    return (
      <div className="mt-2 ml-6 flex items-start gap-2 rounded-lg border border-success bg-success px-3 py-2 text-xs text-success">
        <CheckCircle2
          className="mt-0.5 h-4 w-4 shrink-0 text-success"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            First comment sent
            {secondsLeft > 0 ? (
              <span className="ml-1 font-normal text-success">
                · Undo available {secondsLeft}s
              </span>
            ) : null}
          </p>
          {undo.status === 'error' ? (
            <p className="mt-0.5 text-[11px] text-warning">
              Couldn&apos;t undo: {undo.error}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={undoSend}
          disabled={isUndoing}
          className="h-7 shrink-0 gap-1.5 border-success bg-default px-2 text-xs text-success hover:bg-success"
        >
          <RotateCcw className="h-3 w-3" aria-hidden />
          {isUndoing ? 'Undoing\u2026' : 'Undo'}
        </Button>
      </div>
    );
  }

  // No suggestion yet → Generate CTA.
  if (suggestion.status === 'idle' || suggestion.status === 'loading') {
    return (
      <div className="mt-2 ml-6 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={generate}
          disabled={suggestion.status === 'loading'}
          className="h-7 gap-1.5 px-2 text-xs"
        >
          <Sparkles className="h-3 w-3" aria-hidden />
          {suggestion.status === 'loading'
            ? 'Drafting first comment\u2026'
            : 'Draft first comment with AI'}
        </Button>
        {!sendSupported ? (
          <span className="text-[11px] text-secondary">
            Direct send is coming soon on {platformLabel(platform)} — you can
            still copy the draft.
          </span>
        ) : null}
      </div>
    );
  }

  if (suggestion.status === 'error') {
    return (
      <div className="mt-2 ml-6 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={generate}
          className="h-7 gap-1.5 px-2 text-xs"
        >
          <Sparkles className="h-3 w-3" aria-hidden />
          Try again
        </Button>
        <span className="text-[11px] text-warning">
          Couldn&apos;t draft a first comment: {suggestion.error}
        </span>
      </div>
    );
  }

  // suggestion.status === 'ready'
  const draft = readDraft(suggestion);
  return (
    <div className="mt-2 ml-6 space-y-2">
      <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-warning">
        <span className="inline-flex items-center gap-1 font-medium">
          <Sparkles className="h-3 w-3" aria-hidden />
          {suggestion.source === 'openai'
            ? 'AI-drafted first comment'
            : 'Suggested first comment'}
        </span>
        <span className="font-normal normal-case tracking-normal text-secondary">
          Edit before sending if you&apos;d like.
        </span>
      </div>
      <Textarea
        value={draft}
        onChange={(event) => edit(event.target.value)}
        disabled={isSending}
        className="min-h-[64px] resize-y border-warning bg-default text-sm disabled:text-quaternary"
        aria-label="AI-drafted first comment"
      />
      <div className="flex flex-wrap items-center gap-2">
        {sendSupported ? (
          <Button
            type="button"
            size="sm"
            onClick={sendComment}
            disabled={isSending || draft.trim().length === 0}
            className="h-7 gap-1.5 px-2 text-xs"
          >
            <Send className="h-3 w-3" aria-hidden />
            {isSending ? 'Sending\u2026' : 'Send first comment'}
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={copy}
          disabled={!draft}
          className="h-7 gap-1.5 px-2 text-xs"
        >
          {copied ? (
            <Check className="h-3 w-3" aria-hidden />
          ) : (
            <Copy className="h-3 w-3" aria-hidden />
          )}
          {copied ? 'Copied' : 'Copy reply'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={generate}
          disabled={isSending}
          className="h-7 px-2 text-xs text-secondary hover:text-default"
        >
          Regenerate
        </Button>
        {!sendSupported ? (
          <span className="text-[11px] text-secondary">
            Direct send is coming soon for {platformLabel(platform)}.
          </span>
        ) : null}
        {send.status === 'error' ? (
          <span className="text-[11px] text-warning">
            Couldn&apos;t send: {send.error}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ActiveNudge({
  platform,
  recentPost,
  minutesLeft,
  pageName,
  initialFirstCommentSent,
}: {
  platform: GrowthStudioPlatform;
  recentPost: RecentPostSnapshot;
  minutesLeft: number;
  pageName?: string;
  initialFirstCommentSent: boolean;
}) {
  // Parent passes `key={recentPost.postId}` on this component so we don't
  // need a syncing effect — `useState`'s lazy initializer runs cleanly each
  // time a new post comes through.
  const [checked, setChecked] = useState<Record<StepId, boolean>>(() => {
    const stored = loadChecked(platform, recentPost.postId);
    return {
      ...stored,
      // Server-truth wins for the AI step so it stays in sync across
      // refreshes and devices.
      'first-comment': initialFirstCommentSent || stored['first-comment'],
    };
  });

  const setStep = useCallback(
    (id: StepId, value: boolean) => {
      setChecked((prev) => {
        if (prev[id] === value) return prev;
        const next = { ...prev, [id]: value };
        saveChecked(platform, recentPost.postId, next);
        return next;
      });
    },
    [platform, recentPost.postId]
  );

  const toggle = useCallback(
    (id: StepId) => {
      // The AI-driven first-comment row is checked by the panel itself,
      // never via the row's manual toggle — disable it here so a stray
      // tap can't mark it done without actually posting.
      if (id === 'first-comment') return;
      setStep(id, !checked[id]);
    },
    [checked, setStep]
  );

  const handleFirstCommentSentChange = useCallback(
    (sent: boolean) => setStep('first-comment', sent),
    [setStep]
  );

  const completedCount = useMemo(
    () => Object.values(checked).filter(Boolean).length,
    [checked]
  );
  const allDone = completedCount === STEP_DEFS.length;
  const captionPreview = recentPost.message.trim().slice(0, 110);
  const ellipsis = recentPost.message.trim().length > 110 ? '…' : '';

  return (
    <div className="rounded-xl border border-warning bg-default p-4 ring-1 ring-[var(--border-warning)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-warning p-2" aria-hidden>
            <Zap className="h-4 w-4 text-warning" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-default">
              First-hour seeding nudge
            </p>
            <p className="text-xs leading-relaxed text-secondary">
              Your {platformLabel(platform)} post just went live. Knock these
              out in the next 60 minutes so the algorithm sees engagement early.
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'shrink-0 text-[11px] font-semibold tabular-nums ring-1 ring-inset',
            allDone
              ? 'bg-success text-success ring-[var(--border-success)]'
              : 'bg-warning text-warning ring-[var(--border-warning)]'
          )}
        >
          {allDone
            ? 'All done!'
            : `${minutesLeft}m left · ${completedCount}/${STEP_DEFS.length}`}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-warning bg-warning p-2.5">
        {recentPost.mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recentPost.mediaUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded-md border border-warning object-cover"
            loading="lazy"
          />
        ) : null}
        <p className="min-w-0 flex-1 text-xs text-default line-clamp-2">
          {captionPreview || 'Your latest post just published.'}
          {ellipsis}
        </p>
        {recentPost.permalinkUrl ? (
          <Button
            asChild
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2 text-xs"
          >
            <a
              href={recentPost.permalinkUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open post
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          </Button>
        ) : null}
      </div>

      <ul className="mt-4 space-y-1">
        {STEP_DEFS.map((step) => {
          const isDone = checked[step.id];
          const isFirstComment = step.id === 'first-comment';
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => toggle(step.id)}
                disabled={isFirstComment}
                className={cn(
                  'flex w-full items-start gap-2 rounded-full px-2 py-1.5 text-left text-xs transition-expo',
                  !isFirstComment && 'hover:bg-warning',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-warning)]',
                  isFirstComment && 'cursor-default'
                )}
                aria-pressed={isFirstComment ? undefined : isDone}
              >
                {isDone ? (
                  <CheckSquare
                    className="mt-0.5 h-4 w-4 shrink-0 text-success"
                    aria-hidden
                  />
                ) : (
                  <Square
                    className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                    aria-hidden
                  />
                )}
                <span
                  className={cn(
                    'leading-snug',
                    isDone ? 'text-secondary line-through' : 'text-default'
                  )}
                >
                  {step.label(platform)}
                </span>
              </button>
              {isFirstComment ? (
                <FirstCommentPanel
                  platform={platform}
                  recentPost={recentPost}
                  pageName={pageName}
                  initialAlreadySent={initialFirstCommentSent}
                  onSentChange={handleFirstCommentSentChange}
                />
              ) : null}
            </li>
          );
        })}
      </ul>

      {allDone ? (
        <p className="mt-3 inline-flex items-center gap-1 text-xs text-success">
          <Check className="h-3.5 w-3.5" aria-hidden />
          Seeded — momentum should pick up from here.
        </p>
      ) : null}
    </div>
  );
}

export function FirstHourNudgeCard({
  platform,
  recentPost,
  pageName,
  firstCommentSentPostIds,
}: {
  platform: GrowthStudioPlatform;
  recentPost?: RecentPostSnapshot | null;
  pageName?: string;
  firstCommentSentPostIds?: string[];
}) {
  const minutesLeft = useMemo(
    () => (recentPost ? minutesRemaining(recentPost.createdAt) : null),
    [recentPost]
  );

  const initialFirstCommentSent = useMemo(() => {
    if (!recentPost) return false;
    return (firstCommentSentPostIds ?? []).includes(recentPost.postId);
  }, [firstCommentSentPostIds, recentPost]);

  if (recentPost && minutesLeft !== null && minutesLeft > 0) {
    return (
      <ActiveNudge
        key={recentPost.postId}
        platform={platform}
        recentPost={recentPost}
        minutesLeft={minutesLeft}
        pageName={pageName}
        initialFirstCommentSent={initialFirstCommentSent}
      />
    );
  }

  const description =
    recentPost && minutesLeft === 0
      ? `Your last ${platformLabel(platform)} post is past the 60-minute window. The seeding nudge will run again the next time you publish.`
      : `As soon as a ${platformLabel(platform)} post publishes, we'll surface a 60-minute checklist here so it gets traction before the algorithm decides whether to push it.`;

  const steps = STEP_DEFS.map((s) => s.label(platform));

  return <PlaceholderShellInline steps={steps} description={description} />;
}
