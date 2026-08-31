import type { InstagramPost, LinkedInPost, Post } from '../../types';
import type { GrowthStudioPlatform } from './_common';

/**
 * Normalized queue item shared by the three platforms inside Growth
 * Studio B1 (First-hour seeding nudge) and B2 (Replies waiting).
 *
 * Each item represents one comment that is waiting for the user's
 * attention, paired with enough context about the originating post so
 * the AI suggestion endpoint can ground its reply.
 */
export type ReplyQueueItem = {
  platform: GrowthStudioPlatform;
  postId: string;
  postMessage: string;
  postMediaUrl?: string;
  postPermalinkUrl?: string;
  postCreatedAt?: string;
  commentId: string;
  comment: string;
};

/**
 * One post group inside the dialog — keeps the post header information
 * with its list of waiting comments so we can render a cleaner
 * "post → comments" layout instead of a flat list of individual rows.
 */
export type ReplyQueueGroup = {
  platform: GrowthStudioPlatform;
  postId: string;
  postMessage: string;
  postMediaUrl?: string;
  postPermalinkUrl?: string;
  postCreatedAt?: string;
  comments: { commentId: string; comment: string }[];
};

function asTrimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

type SourceComment = {
  id?: string;
  message?: string;
  text?: string;
  /** LinkedIn-only — full parent comment URN. */
  commentUrn?: string;
};

function commentTextOf(c: SourceComment | null | undefined): string {
  if (!c || typeof c !== 'object') return '';
  return asTrimmed(c.message) || asTrimmed(c.text);
}

function commentIdOf(
  c: SourceComment | null | undefined,
  index: number,
  postId: string
): string {
  const id = asTrimmed(c?.id);
  return id || `${postId}:${index}`;
}

function mostRecentFirst<T extends { createdAt?: string; timestamp?: string }>(
  posts: readonly T[]
): T[] {
  return [...posts].sort((a, b) => {
    const ta = Date.parse((a.createdAt ?? a.timestamp ?? '') || '');
    const tb = Date.parse((b.createdAt ?? b.timestamp ?? '') || '');
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return tb - ta;
  });
}

function buildGroup(
  platform: GrowthStudioPlatform,
  args: {
    postId: string;
    postMessage: string;
    postMediaUrl?: string;
    postPermalinkUrl?: string;
    postCreatedAt?: string;
    comments: SourceComment[];
    repliedIds: ReadonlySet<string>;
  }
): ReplyQueueGroup | null {
  const seen = new Set<string>();
  const comments: { commentId: string; comment: string }[] = [];
  args.comments.forEach((c, i) => {
    const text = commentTextOf(c);
    if (!text) return;
    const id = commentIdOf(c, i, args.postId);
    if (seen.has(id)) return;
    if (args.repliedIds.has(id)) return;
    seen.add(id);
    comments.push({ commentId: id, comment: text });
  });
  if (comments.length === 0) return null;
  return {
    platform,
    postId: args.postId,
    postMessage: args.postMessage,
    postMediaUrl: args.postMediaUrl?.trim() || undefined,
    postPermalinkUrl: args.postPermalinkUrl?.trim() || undefined,
    postCreatedAt: args.postCreatedAt,
    comments,
  };
}

function asRepliedSet(ids?: readonly string[]): ReadonlySet<string> {
  return new Set(ids ?? []);
}

export function buildReplyQueueGroupsFacebook(
  posts: readonly Post[],
  repliedCommentIds?: readonly string[]
): ReplyQueueGroup[] {
  const repliedIds = asRepliedSet(repliedCommentIds);
  return mostRecentFirst(posts)
    .map((p) =>
      buildGroup('facebook', {
        postId: p.postId,
        postMessage: p.message ?? '',
        postMediaUrl: p.mediaUrl,
        postPermalinkUrl: p.permalinkUrl,
        postCreatedAt: p.createdAt,
        comments: (p.commentsList ?? []) as SourceComment[],
        repliedIds,
      })
    )
    .filter((g): g is ReplyQueueGroup => g !== null);
}

export function buildReplyQueueGroupsInstagram(
  posts: readonly InstagramPost[],
  repliedCommentIds?: readonly string[]
): ReplyQueueGroup[] {
  const repliedIds = asRepliedSet(repliedCommentIds);
  return mostRecentFirst(posts)
    .map((p) =>
      buildGroup('instagram', {
        postId: p.postId,
        postMessage: p.caption ?? '',
        postMediaUrl: p.mediaUrl,
        postPermalinkUrl: p.permalink,
        postCreatedAt: p.timestamp,
        comments: (p.commentsList ?? []) as SourceComment[],
        repliedIds,
      })
    )
    .filter((g): g is ReplyQueueGroup => g !== null);
}

export function buildReplyQueueGroupsLinkedIn(
  posts: readonly LinkedInPost[],
  repliedCommentIds?: readonly string[]
): ReplyQueueGroup[] {
  const repliedIds = asRepliedSet(repliedCommentIds);
  return mostRecentFirst(posts)
    .map((p) =>
      buildGroup('linkedin', {
        postId: p.postId,
        postMessage: (p.commentary ?? p.message ?? '') as string,
        postMediaUrl: p.mediaUrl,
        postPermalinkUrl: p.permalinkUrl,
        postCreatedAt: p.createdAt,
        // For LinkedIn we prefer the full `commentUrn` over the numeric
        // `id` because the URN is what the Graph API needs as
        // `parentComment` when posting a reply. Using it as the canonical
        // `commentId` keeps a single value flowing through the queue,
        // the suggestion state, and the `/reply-send` request body.
        comments: ((p.commentsList ?? []) as SourceComment[]).map((c) => ({
          ...c,
          id: c.commentUrn || c.id,
        })),
        repliedIds,
      })
    )
    .filter((g): g is ReplyQueueGroup => g !== null);
}

export function flattenQueueGroups(
  groups: readonly ReplyQueueGroup[]
): ReplyQueueItem[] {
  const out: ReplyQueueItem[] = [];
  for (const g of groups) {
    for (const c of g.comments) {
      out.push({
        platform: g.platform,
        postId: g.postId,
        postMessage: g.postMessage,
        postMediaUrl: g.postMediaUrl,
        postPermalinkUrl: g.postPermalinkUrl,
        postCreatedAt: g.postCreatedAt,
        commentId: c.commentId,
        comment: c.comment,
      });
    }
  }
  return out;
}

export function totalCommentCount(groups: readonly ReplyQueueGroup[]): number {
  return groups.reduce((sum, g) => sum + g.comments.length, 0);
}

/**
 * Aggregate signal about how complete the per-post comment payload is
 * for the Instagram sync.
 *
 * Meta's Graph API returns a per-post `comments_count` separately from
 * the actual `commentsList` rows. While
 * `instagram_business_manage_comments` is still in Standard Access, the
 * API answers `comments_count: 5` but returns an empty `data` array for
 * the comments edge — leaving us with a row count but no rows to
 * triage. The Replies-waiting card uses these stats to tell apart
 * "you have nothing to reply to" from "we couldn't load what you have"
 * (see `RepliesWaitingCard`).
 *
 * Only computed for Instagram for now; Facebook and LinkedIn don't
 * have the same chicken-and-egg permission problem, so we don't surface
 * the same access-pending copy for them.
 *
 * - `reportedTotal` — sum of `comments_count` across synced posts.
 * - `fetchedTotal` — sum of `commentsList?.length` we actually received.
 * - `postsWithReportedComments` — posts with at least one reported
 *   comment.
 * - `postsWithMissingComments` — posts where the count says >0 but the
 *   list came back empty. Non-zero here is the smoking gun.
 */
export type ReplyQueueLoadStats = {
  reportedTotal: number;
  fetchedTotal: number;
  postsWithReportedComments: number;
  postsWithMissingComments: number;
};

export function replyQueueLoadStatsInstagram(
  posts: readonly InstagramPost[]
): ReplyQueueLoadStats {
  let reportedTotal = 0;
  let fetchedTotal = 0;
  let postsWithReportedComments = 0;
  let postsWithMissingComments = 0;
  for (const post of posts) {
    const reported =
      typeof post?.comments === 'number' && Number.isFinite(post.comments)
        ? Math.max(0, Math.floor(post.comments))
        : 0;
    const fetched = Array.isArray(post?.commentsList)
      ? post.commentsList.length
      : 0;
    reportedTotal += reported;
    fetchedTotal += fetched;
    if (reported > 0) {
      postsWithReportedComments += 1;
      if (fetched === 0) postsWithMissingComments += 1;
    }
  }
  return {
    reportedTotal,
    fetchedTotal,
    postsWithReportedComments,
    postsWithMissingComments,
  };
}

/**
 * Returns the single most-recent post across the given posts. Used by
 * the First-hour-seeding-nudge card to decide whether the user has
 * just published something and the 60-minute checklist should run.
 */
export type RecentPostSnapshot = {
  postId: string;
  message: string;
  mediaUrl?: string;
  permalinkUrl?: string;
  createdAt: string;
};

function pickMostRecent<T extends { createdAt?: string; timestamp?: string }>(
  posts: readonly T[]
): T | null {
  const ranked = mostRecentFirst(posts);
  return ranked[0] ?? null;
}

export function mostRecentFacebookPost(
  posts: readonly Post[]
): RecentPostSnapshot | null {
  const p = pickMostRecent(posts);
  if (!p?.createdAt) return null;
  return {
    postId: p.postId,
    message: p.message ?? '',
    mediaUrl: p.mediaUrl?.trim() || undefined,
    permalinkUrl: p.permalinkUrl?.trim() || undefined,
    createdAt: p.createdAt,
  };
}

export function mostRecentInstagramPost(
  posts: readonly InstagramPost[]
): RecentPostSnapshot | null {
  const p = pickMostRecent(posts);
  if (!p?.timestamp) return null;
  return {
    postId: p.postId,
    message: p.caption ?? '',
    mediaUrl: p.mediaUrl?.trim() || undefined,
    permalinkUrl: p.permalink?.trim() || undefined,
    createdAt: p.timestamp,
  };
}

export function mostRecentLinkedInPost(
  posts: readonly LinkedInPost[]
): RecentPostSnapshot | null {
  const p = pickMostRecent(posts);
  if (!p?.createdAt) return null;
  return {
    postId: p.postId,
    message: (p.commentary ?? p.message ?? '') as string,
    mediaUrl: p.mediaUrl?.trim() || undefined,
    permalinkUrl: p.permalinkUrl?.trim() || undefined,
    createdAt: p.createdAt,
  };
}
