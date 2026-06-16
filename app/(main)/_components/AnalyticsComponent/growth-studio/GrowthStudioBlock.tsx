'use client';

import { FirstHourNudgeCard } from './FirstHourNudgeCard';
import { RepliesWaitingCard } from './RepliesWaitingCard';
import { WhatToPostNextSection } from './WhatToPostNextSection';
import { WhereToSpendSection } from './WhereToSpendSection';
import type { GrowthStudioPlatform } from './_common';
import type {
  RecentPostSnapshot,
  ReplyQueueGroup,
  ReplyQueueLoadStats,
} from './replyQueue';

/**
 * Growth Studio shell for one platform tab.
 *
 * Renders the four cards/sections in the order defined by the plan:
 *   1. First-hour seeding nudge (B1)
 *   2. Replies waiting (B2)
 *   3. What to post next (A1)
 *   4. Where to spend (A2)
 *
 * B1 and B2 require post-level context (latest published post + comment
 * lists) that's already loaded by the parent platform view, so the
 * caller threads it through here. A1 and A2 fetch their own data via
 * their dedicated endpoints and only need `platform`.
 */
export function GrowthStudioBlock({
  platform,
  recentPost,
  replyGroups,
  replyLoadStats,
  pageName,
  firstCommentSentPostIds,
  className,
}: {
  platform: GrowthStudioPlatform;
  recentPost?: RecentPostSnapshot | null;
  replyGroups?: ReplyQueueGroup[];
  /**
   * Aggregate of `comments_count` vs `commentsList.length` from the
   * last sync. Lets the Replies-waiting card distinguish "no comments
   * exist" from "comments exist but we couldn't load them" (Meta
   * access-pending on Instagram, transient errors elsewhere).
   */
  replyLoadStats?: ReplyQueueLoadStats;
  pageName?: string;
  /**
   * Post ids for which the user has already published an AI-drafted
   * first comment via Growth Studio B1. Threaded down to the nudge
   * card so the "Send first comment" affordance hydrates as `Sent`
   * across refreshes and devices.
   */
  firstCommentSentPostIds?: string[];
  className?: string;
}) {
  return (
    <section
      aria-label="Growth Studio"
      className={
        className ? `space-y-4 ${className}` : 'space-y-4'
      }
    >
      <FirstHourNudgeCard
        platform={platform}
        recentPost={recentPost}
        pageName={pageName}
        firstCommentSentPostIds={firstCommentSentPostIds}
      />
      <RepliesWaitingCard
        platform={platform}
        groups={replyGroups}
        loadStats={replyLoadStats}
        pageName={pageName}
      />
      <WhatToPostNextSection platform={platform} />
      <WhereToSpendSection platform={platform} />
    </section>
  );
}
