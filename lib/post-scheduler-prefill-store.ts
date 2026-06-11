export type SchedulerPlatform = 'instagram' | 'facebook' | 'linkedin';

/**
 * Identifies which gallery / generation pipeline produced an image being
 * scheduled. The two values match the Firestore subcollection names exposed
 * by `GeneratedMediaLibraryItem.collection` for items that are schedulable
 * today (see `frontend/lib/gallery-schedule.ts#SCHEDULABLE_COLLECTIONS`).
 *
 * The backend uses this to set `GeneratedBy` on the scheduled-post doc so the
 * scheduled-post UI shows the correct pipeline tag ("Instant" / "Product
 * advert") instead of always labelling library items as "Product advert".
 */
export type PostSchedulerPrefillSource = 'instant-generation' | 'productadvert';

export type PostSchedulerPrefillPost = {
  imageUrl: string;
  imageFilePath: string;
  message: string;
  platform: SchedulerPlatform;
  source?: PostSchedulerPrefillSource;
};

export type PostSchedulerPrefillPayload = {
  source: 'product-advert' | 'gallery';
  createdAt: number;
  lockedPlatform: SchedulerPlatform | 'all_platforms';
  posts: PostSchedulerPrefillPost[];
};

let postSchedulerPrefillCache: PostSchedulerPrefillPayload | null = null;

export function setPostSchedulerPrefill(payload: PostSchedulerPrefillPayload) {
  postSchedulerPrefillCache = payload;
}

export function consumePostSchedulerPrefill(): PostSchedulerPrefillPayload | null {
  const payload = postSchedulerPrefillCache;
  postSchedulerPrefillCache = null;
  return payload;
}
