'use client';

import { RepliesWaitingCard } from './RepliesWaitingCard';
import { WhatToPostNextSection } from './WhatToPostNextSection';
import { WhereToSpendSection } from './WhereToSpendSection';
import type { GrowthStudioPlatform } from './_common';
import type {
  ReplyQueueGroup,
  ReplyQueueLoadStats,
} from './replyQueue';

/**
 * Growth Studio shell for one platform tab.
 *
 * Renders the three cards/sections in the order defined by the analytics
 * refresh:
 *   1. Replies waiting (B2)
 *   2. What to post next (A1)
 *   3. Where to spend (A2)
 *
 * The first-hour seeding nudge was removed as part of the analytics
 * page refinement — those checklists are no longer surfaced here.
 *
 * B2 requires post-level context (comment lists) that's already loaded
 * by the parent platform view, so the caller threads it through here.
 * A1 and A2 fetch their own data via their dedicated endpoints and only
 * need `platform`.
 */
export function GrowthStudioBlock({
  platform,
  replyGroups,
  replyLoadStats,
  pageName,
  className,
}: {
  platform: GrowthStudioPlatform;
  replyGroups?: ReplyQueueGroup[];
  /**
   * Aggregate of `comments_count` vs `commentsList.length` from the
   * last sync. Lets the Replies-waiting card distinguish "no comments
   * exist" from "comments exist but we couldn't load them" (Meta
   * access-pending on Instagram, transient errors elsewhere).
   */
  replyLoadStats?: ReplyQueueLoadStats;
  pageName?: string;
  className?: string;
}) {
  return (
    <section
      aria-label="Growth Studio"
      className={
        className ? `space-y-4 ${className}` : 'space-y-4'
      }
    >
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
