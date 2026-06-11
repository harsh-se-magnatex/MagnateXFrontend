'use client';

import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  ImageIcon,
  Inbox,
  MessageCircle,
  RotateCcw,
  Send,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  postReplySend,
  postReplySuggestion,
  postReplyUndo,
} from '@/src/service/api/analyticService';

import { type GrowthStudioPlatform, platformLabel } from './_common';
import type { ReplyQueueGroup, ReplyQueueLoadStats } from './replyQueue';
import { totalCommentCount } from './replyQueue';

/**
 * Growth Studio B2 — Replies waiting.
 *
 * Surfaces the comments synced from Facebook / Instagram / LinkedIn
 * during the last analytics sync. The collapsed teaser shows a stacked
 * preview (a thumbnail of the most recent post with one comment bubble
 * sitting behind it). Hovering the teaser pops a peek of the next few
 * comments without opening the dialog; clicking opens the full triage
 * dialog where each comment can be paired with an AI-drafted reply and
 * sent (on Facebook) or copied (on Instagram / LinkedIn).
 *
 * After a successful send the row disappears from the queue in-place —
 * no hard refresh required — and an Undo banner stays visible for ten
 * seconds so the user can take it back. Undo deletes the just-published
 * reply on the platform and clears the local "replied" marker, so the
 * comment slides back into the queue with the previous draft preserved.
 *
 * See plan section B2.
 */

const UNDO_WINDOW_MS = 10_000;

const PLATFORM_OPEN_LABEL: Record<GrowthStudioPlatform, string> = {
  facebook: 'Open on Facebook',
  instagram: 'Open on Instagram',
  linkedin: 'Open on LinkedIn',
};

const PLATFORM_SEND_SUPPORTED: Record<GrowthStudioPlatform, boolean> = {
  facebook: true,
  instagram: false,
  linkedin: true,
};

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
  | { status: 'sent' }
  | { status: 'error'; error: string };

type UndoState =
  | { status: 'idle' }
  | { status: 'undoing' }
  | { status: 'error'; error: string };

type SuggestionsMap = Record<string, SuggestionState | undefined>;
type SendStateMap = Record<string, SendState | undefined>;

type LastSent = {
  postId: string;
  commentId: string;
  message: string;
  comment: string;
  expiresAt: number;
};

function readSuggestion(state: SuggestionState | undefined): string {
  if (!state || state.status !== 'ready') return '';
  return state.edited ?? state.text;
}

function PostMediaThumb({
  url,
  className,
}: {
  url?: string;
  className?: string;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className={cn('object-cover', className)}
        loading="lazy"
      />
    );
  }
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-zinc-100 text-zinc-400',
        className
      )}
    >
      <ImageIcon className="h-5 w-5" aria-hidden />
    </div>
  );
}

/**
 * Hover-only peek list shown above the collapsed teaser. Trimmed to a
 * handful of rows so a noisy queue doesn't sprout a huge floating sheet.
 */
function HoverPreviewList({
  groups,
  platform,
  totalComments,
}: {
  groups: ReplyQueueGroup[];
  platform: GrowthStudioPlatform;
  totalComments: number;
}) {
  const flat = useMemo(
    () =>
      groups.flatMap((group) =>
        group.comments.map((c) => ({
          commentId: c.commentId,
          comment: c.comment,
          postMediaUrl: group.postMediaUrl,
          postMessage: group.postMessage,
        }))
      ),
    [groups]
  );
  const preview = flat.slice(0, 4);
  const remaining = totalComments - preview.length;

  return (
    <div className="space-y-2">
      <p className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        <span>Waiting on {platformLabel(platform)}</span>
        <span className="font-medium text-sky-700">{totalComments} total</span>
      </p>
      <ul className="space-y-1.5">
        {preview.map((item) => (
          <li
            key={item.commentId}
            className="flex items-start gap-2 rounded-md bg-zinc-50/60 p-1.5"
          >
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-white">
              <PostMediaThumb
                url={item.postMediaUrl}
                className="h-full w-full"
              />
            </div>
            <p className="line-clamp-2 min-w-0 flex-1 break-words text-xs leading-snug text-zinc-700">
              {item.comment}
            </p>
          </li>
        ))}
      </ul>
      {remaining > 0 ? (
        <p className="text-[11px] text-zinc-500">
          +{remaining} more — click to triage
        </p>
      ) : (
        <p className="text-[11px] text-zinc-500">Click to triage with AI</p>
      )}
    </div>
  );
}

function CollapsedTeaser({
  groups,
  totalComments,
  platform,
  onOpen,
}: {
  groups: ReplyQueueGroup[];
  totalComments: number;
  platform: GrowthStudioPlatform;
  onOpen: () => void;
}) {
  const preview = groups[0];
  const previewComment = preview?.comments[0];

  const trigger = (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex w-full items-center gap-3 overflow-hidden rounded-lg border border-sky-200/80 bg-white/80 px-3 py-3 text-left transition-colors',
        'hover:border-sky-300 hover:bg-white',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2'
      )}
      aria-label={`Open replies queue, ${totalComments} comments waiting`}
    >
      <div className="relative h-12 w-14 shrink-0" aria-hidden>
        <div className="absolute top-1.5 left-3 flex h-9 w-11 items-center justify-center rounded-md border border-sky-200 bg-sky-50 px-1 text-[10px] leading-tight text-sky-900/80 shadow-sm">
          <MessageCircle className="h-3 w-3 opacity-70" />
        </div>
        <div className="absolute top-0 left-0 z-10 h-10 w-10 overflow-hidden rounded-md border border-sky-200 bg-white shadow-sm">
          <PostMediaThumb
            url={preview?.postMediaUrl}
            className="h-full w-full"
          />
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold text-zinc-900">
          {totalComments} {totalComments === 1 ? 'reply' : 'replies'} waiting
        </p>
        <p className="line-clamp-1 break-all text-xs text-zinc-600">
          {previewComment
            ? `\u201C${previewComment.comment}\u201D`
            : `New ${platformLabel(platform)} comments will queue up here.`}
        </p>
      </div>
      <Badge
        variant="outline"
        className="shrink-0 bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200"
      >
        Open
      </Badge>
    </button>
  );

  // Skip the popover entirely when there's nothing to peek at — the
  // teaser already explains the empty case.
  if (totalComments === 0) return trigger;

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
      <HoverCardContent
        align="start"
        side="top"
        sideOffset={8}
        className="w-80 p-3"
      >
        <HoverPreviewList
          groups={groups}
          platform={platform}
          totalComments={totalComments}
        />
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * Why the queue is empty for the current sync.
 *
 *  - `couldnt-load` — the platform reports `comments_count > 0` on at
 *    least one post but returned an empty `commentsList`. Most common
 *    on Instagram while `instagram_business_manage_comments` is still
 *    in Standard Access (Meta returns the count but no rows).
 *  - `all-caught-up` — we did fetch comments in this sync and they've
 *    all been replied to (either from a prior session or in-session).
 *  - `no-comments` — the platform reports zero comments across all
 *    synced posts. There's genuinely nothing to triage.
 */
type EmptyStateKind = 'couldnt-load' | 'all-caught-up' | 'no-comments';

function deriveEmptyStateKind({
  loadStats,
  hadFetchedRows,
}: {
  loadStats?: ReplyQueueLoadStats;
  /** True when we received at least one comment row this sync, even if
   *  the user already replied to all of them in this session. */
  hadFetchedRows: boolean;
}): EmptyStateKind {
  if (loadStats) {
    if (loadStats.reportedTotal > 0 && loadStats.fetchedTotal === 0) {
      return 'couldnt-load';
    }
    if (loadStats.fetchedTotal > 0 || hadFetchedRows) {
      return 'all-caught-up';
    }
    return 'no-comments';
  }
  return hadFetchedRows ? 'all-caught-up' : 'no-comments';
}

type EmptyStateCopy = {
  title: string;
  body: string;
  /** Short label used in the top-right badge. */
  badge: string;
};

/**
 * Only defined for Instagram today — Meta's
 * `instagram_business_manage_comments` access-pending state is the one
 * place where `comments_count > 0` but `commentsList` comes back empty
 * as a matter of course. Facebook and LinkedIn don't pass `loadStats`,
 * so they never reach this branch (they fall back to the existing
 * "all caught up" / "no comments yet" UI).
 */
const COULDNT_LOAD_COPY: Partial<Record<GrowthStudioPlatform, EmptyStateCopy>> =
  {
    instagram: {
      title: "Comments couldn't be loaded from Instagram",
      body: "Your posts have comments, but Instagram didn't return them in the last sync. This usually clears after Meta approves comment access — try reconnecting Instagram once the permission review is approved.",
      badge: 'Awaiting Meta access',
    },
  };

const COULDNT_LOAD_FALLBACK_COPY: EmptyStateCopy = {
  title: "Comments couldn't be loaded",
  body: "Your posts have comments, but the platform didn't return them in the last sync. Try syncing again.",
  badge: 'Sync incomplete',
};

function couldntLoadCopyFor(platform: GrowthStudioPlatform): EmptyStateCopy {
  return COULDNT_LOAD_COPY[platform] ?? COULDNT_LOAD_FALLBACK_COPY;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}

function CouldntLoadTeaser({
  platform,
  loadStats,
}: {
  platform: GrowthStudioPlatform;
  loadStats: ReplyQueueLoadStats;
}) {
  const copy = couldntLoadCopyFor(platform);
  const reported = formatCount(loadStats.reportedTotal);
  const postsAffected = loadStats.postsWithMissingComments;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-3 text-xs text-amber-950">
      <AlertCircle
        className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
        aria-hidden
      />
      <div className="space-y-1">
        <p className="font-medium text-amber-900">{copy.title}</p>
        <p className="leading-relaxed text-amber-900/90">{copy.body}</p>
        <p className="text-[11px] text-amber-800/80">
          {platformLabel(platform)} reported {reported}{' '}
          {loadStats.reportedTotal === 1 ? 'comment' : 'comments'} across{' '}
          {postsAffected}{' '}
          {postsAffected === 1 ? 'post' : 'posts'} but returned none.
        </p>
      </div>
    </div>
  );
}

function NoCommentsTeaser({ platform }: { platform: GrowthStudioPlatform }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-dashed border-sky-300/70 bg-white/70 px-3 py-3 text-xs text-zinc-600">
      <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
      <div>
        <p className="font-medium text-zinc-700">No comments yet</p>
        <p className="leading-relaxed">
          No comments on your synced {platformLabel(platform)} posts yet. New
          replies will queue here automatically.
        </p>
      </div>
    </div>
  );
}

function AllCaughtUpTeaser({ platform }: { platform: GrowthStudioPlatform }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-3 text-xs text-emerald-900">
      <CheckCircle2
        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
        aria-hidden
      />
      <div>
        <p className="font-medium text-emerald-900">Inbox zero</p>
        <p className="leading-relaxed">
          Every {platformLabel(platform)} comment from the last sync has been
          replied to. New ones will queue here.
        </p>
      </div>
    </div>
  );
}

function EmptyTeaser({
  platform,
  kind,
  loadStats,
}: {
  platform: GrowthStudioPlatform;
  kind: EmptyStateKind;
  loadStats?: ReplyQueueLoadStats;
}) {
  if (kind === 'couldnt-load' && loadStats) {
    return <CouldntLoadTeaser platform={platform} loadStats={loadStats} />;
  }
  if (kind === 'all-caught-up') {
    return <AllCaughtUpTeaser platform={platform} />;
  }
  return <NoCommentsTeaser platform={platform} />;
}

function UndoBanner({
  lastSent,
  undoState,
  onUndo,
  onDismiss,
}: {
  lastSent: LastSent;
  undoState: UndoState;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((lastSent.expiresAt - Date.now()) / 1000))
  );

  useEffect(() => {
    const tick = () => {
      const next = Math.max(
        0,
        Math.ceil((lastSent.expiresAt - Date.now()) / 1000)
      );
      setSecondsLeft(next);
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [lastSent.expiresAt]);

  const isUndoing = undoState.status === 'undoing';
  const truncated =
    lastSent.comment.length > 70
      ? `${lastSent.comment.slice(0, 70)}\u2026`
      : lastSent.comment;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-900">
      <CheckCircle2
        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          Reply sent
          {secondsLeft > 0 ? (
            <span className="ml-1 font-normal text-emerald-700/80">
              · Undo available {secondsLeft}s
            </span>
          ) : null}
        </p>
        <p className="line-clamp-1 break-all text-[11px] text-emerald-900/80">
          To: &ldquo;{truncated}&rdquo;
        </p>
        {undoState.status === 'error' ? (
          <p className="mt-0.5 text-[11px] text-amber-700">
            Couldn&apos;t undo: {undoState.error}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onUndo}
        disabled={isUndoing}
        className="h-7 shrink-0 gap-1.5 border-emerald-300 bg-white px-2 text-xs text-emerald-900 hover:bg-emerald-50"
      >
        <RotateCcw className="h-3 w-3" aria-hidden />
        {isUndoing ? 'Undoing\u2026' : 'Undo'}
      </Button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss undo notice"
        className="ml-1 shrink-0 rounded p-1 text-emerald-700/70 hover:bg-emerald-100 hover:text-emerald-900"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

function ReplyQueueRow({
  platform,
  commentId,
  comment,
  state,
  sendState,
  onRequest,
  onEdit,
  onSend,
}: {
  platform: GrowthStudioPlatform;
  commentId: string;
  comment: string;
  state: SuggestionState | undefined;
  sendState: SendState | undefined;
  onRequest: () => void;
  onEdit: (next: string) => void;
  onSend: (message: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isSending = sendState?.status === 'sending';
  const sendSupported = PLATFORM_SEND_SUPPORTED[platform];
  const draft = readSuggestion(state);

  const handleCopy = useCallback(async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be denied (e.g. unfocused tab); the
      // textarea is still selectable manually.
    }
  }, [draft]);

  return (
    <div className="space-y-2 rounded-lg border border-zinc-200 bg-white p-3">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden />
        </div>
        <p className="min-w-0 flex-1 text-sm leading-snug text-zinc-800">
          {comment}
        </p>
      </div>
      {state?.status === 'ready' ? (
        <div className="space-y-2 pl-8">
          <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-sky-700">
            <span className="inline-flex items-center gap-1 font-medium">
              <Sparkles className="h-3 w-3" aria-hidden />
              {state.source === 'openai' ? 'AI-drafted reply' : 'Suggested reply'}
            </span>
            <span className="font-normal normal-case tracking-normal text-zinc-500">
              Edit before sending if you&apos;d like.
            </span>
          </div>
          <Textarea
            value={draft}
            onChange={(event) => onEdit(event.target.value)}
            disabled={isSending}
            className="min-h-[60px] resize-y border-zinc-200 bg-zinc-50 text-sm disabled:opacity-70"
            id={`reply-${commentId}`}
            aria-label="AI-drafted reply"
          />
          <div className="flex flex-wrap items-center gap-2">
            {sendSupported ? (
              <Button
                type="button"
                size="sm"
                onClick={() => onSend(draft)}
                disabled={isSending || draft.trim().length === 0}
                className="h-7 gap-1.5 px-2 text-xs"
              >
                <Send className="h-3 w-3" aria-hidden />
                {isSending ? 'Sending\u2026' : 'Send reply'}
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCopy}
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
              onClick={onRequest}
              disabled={isSending}
              className="h-7 px-2 text-xs text-zinc-600 hover:text-zinc-900"
            >
              Regenerate
            </Button>
            {!sendSupported ? (
              <span className="text-[11px] text-zinc-500">
                Sending from inside the app is coming soon for this platform.
              </span>
            ) : null}
            {sendState?.status === 'error' ? (
              <span className="text-[11px] text-amber-700">
                Couldn&apos;t send: {sendState.error}
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 pl-8">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onRequest}
            disabled={state?.status === 'loading'}
            className="h-7 gap-1.5 px-2 text-xs"
          >
            <Sparkles className="h-3 w-3" aria-hidden />
            {state?.status === 'loading'
              ? 'Drafting reply\u2026'
              : 'Draft reply with AI'}
          </Button>
          {state?.status === 'error' ? (
            <span className="text-[11px] text-amber-700">
              Couldn&apos;t draft a reply: {state.error}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ReplyQueueGroupCard({
  group,
  suggestions,
  sendStates,
  onRequest,
  onEdit,
  onSend,
}: {
  group: ReplyQueueGroup;
  suggestions: SuggestionsMap;
  sendStates: SendStateMap;
  onRequest: (commentId: string, comment: string) => void;
  onEdit: (commentId: string, next: string) => void;
  onSend: (
    postId: string,
    commentId: string,
    comment: string,
    message: string
  ) => void;
}) {
  const preview = group.postMessage.trim().slice(0, 140);
  const ellipsis = group.postMessage.trim().length > 140 ? '…' : '';

  return (
    <article className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
      <header className="flex items-start gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <PostMediaThumb url={group.postMediaUrl} className="h-full w-full" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="line-clamp-2 text-sm text-zinc-800">
            {preview || 'No caption'}
            {ellipsis}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
            <span>
              {group.comments.length}{' '}
              {group.comments.length === 1 ? 'comment' : 'comments'}
            </span>
            {group.postPermalinkUrl ? (
              <>
                <span aria-hidden>·</span>
                <a
                  href={group.postPermalinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-900 hover:underline"
                >
                  {PLATFORM_OPEN_LABEL[group.platform]}
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              </>
            ) : null}
          </div>
        </div>
      </header>
      <div className="space-y-2">
        {group.comments.map((c) => (
          <ReplyQueueRow
            key={c.commentId}
            platform={group.platform}
            commentId={c.commentId}
            comment={c.comment}
            state={suggestions[c.commentId]}
            sendState={sendStates[c.commentId]}
            onRequest={() => onRequest(c.commentId, c.comment)}
            onEdit={(next) => onEdit(c.commentId, next)}
            onSend={(message) =>
              onSend(group.postId, c.commentId, c.comment, message)
            }
          />
        ))}
      </div>
    </article>
  );
}

export function RepliesWaitingCard({
  platform,
  groups,
  pageName,
  loadStats,
}: {
  platform: GrowthStudioPlatform;
  groups?: ReplyQueueGroup[];
  pageName?: string;
  /**
   * Optional per-sync stats used to tell apart "the platform returned an
   * empty list" from "the platform reported comments exist but didn't
   * give them to us" (Meta access-pending). When omitted the card falls
   * back to the legacy "Inbox zero" / "All caught up" empty states.
   */
  loadStats?: ReplyQueueLoadStats;
}) {
  const safeGroups = useMemo(() => groups ?? [], [groups]);

  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionsMap>({});
  const [sendStates, setSendStates] = useState<SendStateMap>({});
  const [lastSent, setLastSent] = useState<LastSent | null>(null);
  const [undoState, setUndoState] = useState<UndoState>({ status: 'idle' });

  // Hide rows the user already replied to in this session so the queue
  // drains instantly without waiting for the next analytics sync. The
  // backend's `repliedCommentIds` covers replies from previous sessions;
  // this `sendStates` layer covers the current one.
  const visibleGroups = useMemo<ReplyQueueGroup[]>(() => {
    return safeGroups
      .map((group) => ({
        ...group,
        comments: group.comments.filter(
          (c) => sendStates[c.commentId]?.status !== 'sent'
        ),
      }))
      .filter((group) => group.comments.length > 0);
  }, [safeGroups, sendStates]);

  const visibleTotal = useMemo(
    () => totalCommentCount(visibleGroups),
    [visibleGroups]
  );

  const emptyKind = useMemo<EmptyStateKind>(
    () =>
      deriveEmptyStateKind({
        loadStats,
        hadFetchedRows: totalCommentCount(safeGroups) > 0,
      }),
    [loadStats, safeGroups]
  );

  const emptyBadge: { label: string; className: string } = useMemo(() => {
    if (emptyKind === 'couldnt-load') {
      return {
        label: couldntLoadCopyFor(platform).badge,
        className:
          'shrink-0 bg-amber-50 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-inset ring-amber-200',
      };
    }
    if (emptyKind === 'all-caught-up') {
      return {
        label: 'All caught up',
        className:
          'shrink-0 bg-white/70 text-[10px] font-medium uppercase tracking-wide text-zinc-500',
      };
    }
    return {
      label: 'Inbox zero',
      className:
        'shrink-0 bg-white/70 text-[10px] font-medium uppercase tracking-wide text-zinc-500',
    };
  }, [emptyKind, platform]);

  const headerSubtitle: string = useMemo(() => {
    if (visibleTotal > 0) {
      return `${visibleTotal} ${platformLabel(platform)} ${
        visibleTotal === 1 ? 'comment is' : 'comments are'
      } waiting on a reply. Tap to triage with AI-drafted suggestions.`;
    }
    if (emptyKind === 'couldnt-load') {
      return `${platformLabel(platform)} reported comments on your posts but didn't return them in the last sync — see below for what to do.`;
    }
    if (emptyKind === 'all-caught-up') {
      return `You've replied to every ${platformLabel(platform)} comment from the last sync. New ones will appear here.`;
    }
    return `New ${platformLabel(platform)} comments will queue here with AI-drafted replies in your brand voice.`;
  }, [visibleTotal, emptyKind, platform]);

  // Auto-expire the undo banner after the window closes; once expired
  // the marker stays in Firestore so the comment stays out of the
  // queue across refreshes.
  useEffect(() => {
    if (!lastSent) return;
    // setTimeout with a 0/negative delay fires on the next tick, which
    // is what we want when the deadline has already passed. Avoiding a
    // synchronous setState here keeps the React Compiler & lint rules
    // happy (`react-hooks/set-state-in-effect`).
    const ms = Math.max(0, lastSent.expiresAt - Date.now());
    const id = window.setTimeout(() => {
      setLastSent((current) =>
        current && current.commentId === lastSent.commentId ? null : current
      );
    }, ms);
    return () => window.clearTimeout(id);
  }, [lastSent]);

  const sendReply = useCallback(
    async (
      postId: string,
      commentId: string,
      comment: string,
      message: string
    ) => {
      const trimmed = message.trim();
      if (!trimmed) return;
      setSendStates((prev) => ({
        ...prev,
        [commentId]: { status: 'sending' },
      }));
      try {
        await postReplySend({
          platform,
          postId,
          commentId,
          message: trimmed,
        });
        setSendStates((prev) => ({
          ...prev,
          [commentId]: { status: 'sent' },
        }));
        setUndoState({ status: 'idle' });
        setLastSent({
          postId,
          commentId,
          message: trimmed,
          comment,
          expiresAt: Date.now() + UNDO_WINDOW_MS,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Something went wrong';
        setSendStates((prev) => ({
          ...prev,
          [commentId]: { status: 'error', error: errorMessage },
        }));
      }
    },
    [platform]
  );

  const undoLastSend = useCallback(async () => {
    if (!lastSent) return;
    const { commentId, message } = lastSent;
    setUndoState({ status: 'undoing' });
    try {
      await postReplyUndo({ platform, commentId });
      setSendStates((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
      // Keep the drafted text intact so the row reappears with whatever
      // the user typed before sending.
      setSuggestions((prev) => {
        const current = prev[commentId];
        if (current && current.status === 'ready') {
          return { ...prev, [commentId]: { ...current, edited: message } };
        }
        return prev;
      });
      setLastSent(null);
      setUndoState({ status: 'idle' });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Something went wrong';
      setUndoState({ status: 'error', error: errorMessage });
    }
  }, [lastSent, platform]);

  const dismissUndo = useCallback(() => {
    setLastSent(null);
    setUndoState({ status: 'idle' });
  }, []);

  const requestSuggestion = useCallback(
    async (commentId: string, comment: string) => {
      const group = safeGroups.find((g) =>
        g.comments.some((c) => c.commentId === commentId)
      );
      setSuggestions((prev) => ({
        ...prev,
        [commentId]: { status: 'loading' },
      }));
      try {
        const res = await postReplySuggestion({
          platform,
          comment,
          postMessage: group?.postMessage,
          pageName,
        });
        const { suggestion, source } = res.data;
        setSuggestions((prev) => ({
          ...prev,
          [commentId]: { status: 'ready', text: suggestion, source },
        }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Something went wrong';
        setSuggestions((prev) => ({
          ...prev,
          [commentId]: { status: 'error', error: message },
        }));
      }
    },
    [platform, pageName, safeGroups]
  );

  const editSuggestion = useCallback((commentId: string, next: string) => {
    setSuggestions((prev) => {
      const current = prev[commentId];
      if (!current || current.status !== 'ready') return prev;
      return {
        ...prev,
        [commentId]: { ...current, edited: next },
      };
    });
  }, []);

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-sky-100 p-2" aria-hidden>
            <MessageCircle className="h-4 w-4 text-sky-700" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-zinc-900">
              Replies waiting
            </p>
            <p className="text-xs leading-relaxed text-zinc-600">
              {headerSubtitle}
            </p>
          </div>
        </div>
        {visibleTotal > 0 ? (
          <Badge
            variant="outline"
            className="shrink-0 bg-white/80 text-[11px] font-semibold text-sky-800 ring-1 ring-inset ring-sky-200"
          >
            {visibleTotal} waiting
          </Badge>
        ) : (
          <Badge variant="outline" className={emptyBadge.className}>
            {emptyBadge.label}
          </Badge>
        )}
      </div>

      {lastSent ? (
        <div className="mt-3">
          <UndoBanner
            lastSent={lastSent}
            undoState={undoState}
            onUndo={undoLastSend}
            onDismiss={dismissUndo}
          />
        </div>
      ) : null}

      <div className="mt-4">
        {visibleTotal === 0 ? (
          <EmptyTeaser
            platform={platform}
            kind={emptyKind}
            loadStats={loadStats}
          />
        ) : (
          <CollapsedTeaser
            groups={visibleGroups}
            totalComments={visibleTotal}
            platform={platform}
            onOpen={() => setOpen(true)}
          />
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-sky-700" aria-hidden />
              Replies waiting · {platformLabel(platform)}
            </DialogTitle>
            <DialogDescription>
              {visibleTotal} {visibleTotal === 1 ? 'comment' : 'comments'}{' '}
              queued from your last sync.{' '}
              {PLATFORM_SEND_SUPPORTED[platform]
                ? `Drafts post directly to ${platformLabel(platform)} when you hit Send.`
                : `Drafts stay on your device — copy a reply and post it on ${platformLabel(platform)} manually. Direct sending is coming soon.`}
            </DialogDescription>
          </DialogHeader>

          {lastSent ? (
            <div className="-mx-4 mb-2 px-4">
              <UndoBanner
                lastSent={lastSent}
                undoState={undoState}
                onUndo={undoLastSend}
                onDismiss={dismissUndo}
              />
            </div>
          ) : null}

          <div className="-mx-4 max-h-[60vh] space-y-3 overflow-y-auto px-4 pb-1">
            {visibleGroups.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">
                <CheckCircle2
                  className="h-5 w-5 text-emerald-600"
                  aria-hidden
                />
                Inbox zero — every comment from this sync has been answered.
              </div>
            ) : (
              visibleGroups.map((group) => (
                <ReplyQueueGroupCard
                  key={group.postId}
                  group={group}
                  suggestions={suggestions}
                  sendStates={sendStates}
                  onRequest={requestSuggestion}
                  onEdit={editSuggestion}
                  onSend={sendReply}
                />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
