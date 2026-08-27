import { FirestoreTimestamp } from '@/app/(main)/_components/types';
import { apiDelete, apiGet } from '@/lib/api-client';
import type { ApiEnvelope } from '@/lib/api-types';
import type { GenerationResearch } from '@/lib/generation-research';

export type GeneratedMediaSource =
| 'instant-generation'
| 'batchGeneratedPosts'
| 'productadvert'
| 'videoGeneration'
| 'eventPosts'
| 'aiEnginePosts'
| 'campaignDrafts'
| 'carouselGeneratedPosts'
| 'all';

/** Firestore subcollection name for each source (matches backend `MediaLibraryItem.collection`). */
export type MediaSource =
  | 'instant-generation'
  | 'batchGeneratedPosts'
  | 'productadvert'
  | 'videoGeneration'
  | 'eventPosts'
  | 'aiEnginePosts'
  | 'campaignDrafts'
  | 'carouselGeneratedPosts';

export type GeneratedMediaCarouselSlide = {
  index?: number;
  purpose?: string | null;
  visualType?: string | null;
  headline?: string | null;
  imageSource?: string | null;
  assetId?: string | null;
  imageFilePath?: string | null;
  imageUrl?: string | null;
};

export type GeneratedMediaLibraryItem = {
  id: string;
  collection: MediaSource;
  caption: string;
  imageUrl: string | null;
  imageFilePath?: string | null;
  mediaType?: 'image' | 'video' | 'carousel';
  videoUrl?: string | null;
  videoFilePath?: string | null;
  posterUrl?: string | null;
  posterFilePath?: string | null;
  durationSeconds?: number | null;
  aspectRatio?: string | null;
  slideCount?: number | null;
  carouselSlides?: GeneratedMediaCarouselSlide[] | null;
  platform: string;
  createdAt: FirestoreTimestamp;
  /** Hydrated by the backend from the linked `scheduledPosts` doc. Present
   *  whenever this item is bound to a scheduled post; absent for unscheduled
   *  quick-create / product-ad outputs. */
  scheduleAt?: FirestoreTimestamp;
  creditsCharged?: number;
  scheduledPostId?: string;
  targetCalendarDate?: string;
  /** AI-engine / bulk-create content type key, e.g. `THIS_OR_THAT`. */
  contentType?: string | null;
  /** Friendly label when persisted by backend, e.g. `This or That`. */
  contentTypeLabel?: string | null;
  /** Hydrated from linked `scheduledPosts.generationProof`. */
  research?: GenerationResearch | null;
  userId?: string;
  earlierScheduled?: boolean;
  canSchedule?: boolean;
  /** Backend-authoritative: false once any schedule/publication linkage exists. */
  canDelete?: boolean;
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

export async function deleteGeneratedMediaLibraryItemApi(
  contentId: string
): Promise<{ contentId: string }> {
  const res = await apiDelete<ApiEnvelope<{ contentId: string }>>(
    `/api/v1/user/generated-media-library/${encodeURIComponent(contentId)}`
  );
  return res.data;
}
