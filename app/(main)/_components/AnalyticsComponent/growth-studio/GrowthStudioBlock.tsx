'use client';

import { RepliesWaitingCard } from './RepliesWaitingCard';
import { WhatToPostNextSection } from './WhatToPostNextSection';
import { WhereToSpendSection } from './WhereToSpendSection';
import { MonthlyBudgetAllocationSection } from './MonthlyBudgetAllocationSection';
import { type GrowthStudioPlatform, type PreloadedReplySuggestions } from './_common';
import { ReplyQueueGroup, ReplyQueueLoadStats } from './replyQueue';

/**
 * Growth Studio shell for one platform tab.
 *
 * Renders the cards/sections in the order defined by the analytics refresh:
 *   1. Replies waiting (B2)
 *   2. What to post next (A1)
 *   3. Where to spend (A2)
 *   4. Monthly budget split (this month's posts + recommended allotment)

 *
 * The first-hour seeding nudge was removed as part of the analytics
 * page refinement — those checklists are no longer surfaced here.
 *
 * B2 requires post-level context (comment lists) that's already loaded
 * by the parent platform view, so the caller threads it through here.
 * A1/A2/budget fetch their own data via dedicated endpoints and only
 * need `platform`.
 */
export function GrowthStudioBlock({
  platform,
  replyGroups,
  replyLoadStats,
  pageName,
  preloadedReplySuggestions,
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
  /** Cron-built reply drafts keyed by comment id. */
  preloadedReplySuggestions?: PreloadedReplySuggestions;
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
        preloadedReplySuggestions={preloadedReplySuggestions}
      />
      <WhatToPostNextSection platform={platform} />
      <WhereToSpendSection platform={platform} />
      <MonthlyBudgetAllocationSection platform={platform} />
    </section>
  );
}
