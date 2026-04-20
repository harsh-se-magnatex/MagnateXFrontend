import { FirestoreTimestamp } from '@/app/(main)/_components/types';
import { apiGet } from '@/lib/api-client';
import type { ApiEnvelope } from '@/lib/api-types';

export type GeneratedMediaSource =
| 'instant-generation'
| 'batchGeneratedPosts'
| 'productadvert'
| 'eventPosts'
| 'all';

/** Firestore subcollection name for each source (matches backend `MediaLibraryItem.collection`). */
export type MediaSource =
  | 'instant-generation'
  | 'batchGeneratedPosts'
  | 'productadvert'
  | 'eventPosts';

export type GeneratedMediaLibraryItem = {
  id: string;
  collection: MediaSource;
  imageUrl: string | null;
  platform: string;
  createdAt: FirestoreTimestamp;
  creditsCharged?: number;
  scheduledPostId?: string;
  targetCalendarDate?: string;
  userId?: string;
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