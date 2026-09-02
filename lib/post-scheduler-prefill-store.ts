export type SchedulerPlatform = 'instagram' | 'facebook' | 'linkedin';

/**
 * Identifies which gallery / generation pipeline produced an image being
 * scheduled. Values match Firestore subcollection names exposed by
 * `GeneratedMediaLibraryItem.collection` for schedulable items today.
 */
export type PostSchedulerPrefillSource =
  | 'instant-generation'
  | 'productadvert'
  | 'videoGeneration'
  | 'carouselGeneratedPosts';

export type PostSchedulerPrefillCarouselSlide = {
  index?: number;
  imageUrl: string;
  imageFilePath: string;
  headline?: string | null;
  purpose?: string | null;
  visualType?: string | null;
};

export type PostSchedulerPrefillPost = {
  /** Existing generated-media content doc to update when scheduling from the gallery. */
  existingPostId?: string;
  imageUrl: string;
  imageFilePath: string;
  mediaType?: 'image' | 'video' | 'carousel';
  videoUrl?: string;
  videoFilePath?: string;
  videoPosterUrl?: string;
  videoPosterPath?: string;
  carouselSlides?: PostSchedulerPrefillCarouselSlide[];
  message: string;
  platform: SchedulerPlatform;
  source?: PostSchedulerPrefillSource;
};

export type PostSchedulerPrefillPayload = {
  source: 'product-advert' | 'gallery' | 'carousel';
  createdAt: number;
  lockedPlatform: SchedulerPlatform | 'all_platforms';
  posts: PostSchedulerPrefillPost[];
};

const PREFILL_SESSION_KEY = 'magnatex:postSchedulerPrefill';

let postSchedulerPrefillCache: PostSchedulerPrefillPayload | null = null;

function canUseSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

function readSessionPrefill(): PostSchedulerPrefillPayload | null {
  if (!canUseSessionStorage()) return null;
  try {
    const raw = sessionStorage.getItem(PREFILL_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PostSchedulerPrefillPayload;
    if (!parsed || !Array.isArray(parsed.posts) || parsed.posts.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionPrefill(payload: PostSchedulerPrefillPayload | null) {
  if (!canUseSessionStorage()) return;
  try {
    if (!payload) {
      sessionStorage.removeItem(PREFILL_SESSION_KEY);
      return;
    }
    sessionStorage.setItem(PREFILL_SESSION_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota / private-mode failures; in-memory cache still works for
    // same-tab navigation without a Strict Mode remount.
  }
}

export function setPostSchedulerPrefill(payload: PostSchedulerPrefillPayload) {
  postSchedulerPrefillCache = payload;
  writeSessionPrefill(payload);
}

/**
 * Read prefill without clearing. Safe under React Strict Mode remounts:
 * the scheduler page re-applies from sessionStorage after state reset.
 */
export function peekPostSchedulerPrefill(): PostSchedulerPrefillPayload | null {
  if (postSchedulerPrefillCache) return postSchedulerPrefillCache;
  const fromSession = readSessionPrefill();
  if (fromSession) {
    postSchedulerPrefillCache = fromSession;
  }
  return fromSession;
}

/** Clears both memory and sessionStorage after a successful schedule/reset. */
export function clearPostSchedulerPrefill() {
  postSchedulerPrefillCache = null;
  writeSessionPrefill(null);
}

/**
 * @deprecated Prefer {@link peekPostSchedulerPrefill} + {@link clearPostSchedulerPrefill}.
 * Kept for callers that still expect consume semantics.
 */
export function consumePostSchedulerPrefill(): PostSchedulerPrefillPayload | null {
  const payload = peekPostSchedulerPrefill();
  clearPostSchedulerPrefill();
  return payload;
}
