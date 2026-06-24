import { FirestoreTimestamp } from '@/app/(main)/_components/types';
import { apiGet } from '@/lib/api-client';
import type { ApiEnvelope } from '@/lib/api-types';

export type GeneratedMediaSource =
| 'instant-generation'
| 'batchGeneratedPosts'
| 'productadvert'
| 'eventPosts'
| 'aiEnginePosts'
| 'campaignDrafts'
| 'all';

/** Firestore subcollection name for each source (matches backend `MediaLibraryItem.collection`). */
export type MediaSource =
  | 'instant-generation'
  | 'batchGeneratedPosts'
  | 'productadvert'
  | 'eventPosts'
  | 'aiEnginePosts'
  | 'campaignDrafts';

export type GeneratedMediaLibraryItem = {
  id: string;
  collection: MediaSource;
  caption: string;
  imageUrl: string | null;
  imageFilePath?: string | null;
  platform: string;
  createdAt: FirestoreTimestamp;
  /** Hydrated by the backend from the linked `scheduledPosts` doc. Present
   *  whenever this item is bound to a scheduled post; absent for unscheduled
   *  quick-create / product-ad outputs. */
  scheduleAt?: FirestoreTimestamp;
  creditsCharged?: number;
  scheduledPostId?: string;
  targetCalendarDate?: string;
  userId?: string;
  earlierScheduled?: boolean;
  canSchedule?: boolean;
  /** Campaign-draft only: doc id under `users/{uid}/campaignDrafts/{id}`. The
   *  gallery uses this to call `/campaign/drafts/:id/schedule` directly. */
  campaignDraftId?: string;
  /** Campaign-draft only: theme tag captured at generation time. */
  campaignTheme?: string;
};

export async function getGeneratedMediaLibraryApi(params?: {
  source?: GeneratedMediaSource | 'all';
  cursor?: string;
}) {
  const res = await apiGet<
    ApiEnvelope<{ items: GeneratedMediaLibraryItem[]; nextCursor: string | null; hasMore: boolean }>
  >('/api/v1/user/generated-media-library', {
    params: {
      source: params?.source ?? 'all',
      ...(params?.cursor ? { cursor: params.cursor } : {}),
    },
  });
  return res.data;
}