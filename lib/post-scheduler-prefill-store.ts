export type SchedulerPlatform = 'instagram' | 'facebook' | 'linkedin';

export type PostSchedulerPrefillPost = {
  imageUrl: string;
  message: string;
  platform: SchedulerPlatform;
};

export type PostSchedulerPrefillPayload = {
  source: 'product-advert';
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
