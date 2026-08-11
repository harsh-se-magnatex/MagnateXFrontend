import type { PreviewPlatform } from '@/components/landing/social-preview/constants';
import type { ShowcaseBrandId } from '@/components/landing/social-preview/showcase-brands';
import {
  GENERATED_SHOWCASE_BRAND as MAGNATE_BRAND,
  GENERATED_SHOWCASE_POSTS as MAGNATE_POSTS,
} from '@/components/landing/social-preview/brands/magnate-regalia.generated';
import {
  GENERATED_SHOWCASE_BRAND as SUNGLASSES_BRAND,
  GENERATED_SHOWCASE_POSTS as SUNGLASSES_POSTS,
} from '@/components/landing/social-preview/brands/sunglasses.generated';
import {
  GENERATED_SHOWCASE_BRAND as CLOTHING_BRAND,
  GENERATED_SHOWCASE_POSTS as CLOTHING_POSTS,
} from '@/components/landing/social-preview/brands/clothing.generated';

export type ShowcaseMediaType = 'image' | 'video' | 'carousel';

export type ShowcaseCarouselSlide = {
  imageUrl: string;
};

export type ShowcasePost = {
  id: string;
  platform: PreviewPlatform;
  scheduleAt: string;
  mediaType: ShowcaseMediaType;
  caption: string;
  imageUrl?: string;
  videoUrl?: string;
  posterUrl?: string;
  carouselSlides?: ShowcaseCarouselSlide[];
};

export type ShowcaseBrand = {
  name: string;
  handle: string;
  tagline: string;
  followersLabel: string;
  followingLabel: string;
};

type ShowcaseBundle = {
  brand: ShowcaseBrand;
  posts: readonly ShowcasePost[];
};

const SHOWCASES: Record<ShowcaseBrandId, ShowcaseBundle> = {
  'magnate-regalia': {
    brand: MAGNATE_BRAND,
    posts: MAGNATE_POSTS as unknown as ShowcasePost[],
  },
  sunglasses: {
    brand: SUNGLASSES_BRAND,
    posts: SUNGLASSES_POSTS as unknown as ShowcasePost[],
  },
  clothing: {
    brand: CLOTHING_BRAND,
    posts: CLOTHING_POSTS as unknown as ShowcasePost[],
  },
};

export function getShowcaseBrand(brandId: ShowcaseBrandId): ShowcaseBrand {
  return SHOWCASES[brandId].brand;
}

export function getShowcasePostsForPlatform(
  brandId: ShowcaseBrandId,
  platform: PreviewPlatform
): ShowcasePost[] {
  return SHOWCASES[brandId].posts
    .filter((p) => p.platform === platform)
    .slice()
    .sort(
      (a, b) =>
        new Date(b.scheduleAt).getTime() - new Date(a.scheduleAt).getTime()
    );
}

/**
 * Pin videos in the profile grid:
 * - 1st video → 5th cell (index 4)
 * - 2nd video → first free cell on the second-to-last row
 * Remaining posts keep relative order.
 */
export function arrangeShowcasePostsForGrid(
  posts: ShowcasePost[],
  columns = 3
): ShowcasePost[] {
  if (posts.length === 0 || columns < 1) return posts;

  const videos = posts.filter((p) => p.mediaType === 'video');
  if (videos.length === 0) return posts;

  const others = posts.filter((p) => p.mediaType !== 'video');
  const total = posts.length;
  const result: Array<ShowcasePost | null> = Array.from(
    { length: total },
    () => null
  );
  const placedVideoIds = new Set<string>();

  const firstIndex = Math.min(4, total - 1);
  result[firstIndex] = videos[0];
  placedVideoIds.add(videos[0].id);

  if (videos.length >= 2) {
    const totalRows = Math.max(1, Math.ceil(total / columns));
    let secondIndex: number | null = null;

    if (totalRows >= 2) {
      const rowStart = (totalRows - 2) * columns;
      const rowEnd = Math.min(rowStart + columns, total);
      for (let i = rowStart; i < rowEnd; i++) {
        if (result[i] === null) {
          secondIndex = i;
          break;
        }
      }
    }

    if (secondIndex === null) {
      for (let i = total - 1; i >= 0; i--) {
        if (result[i] === null) {
          secondIndex = i;
          break;
        }
      }
    }

    if (secondIndex !== null) {
      result[secondIndex] = videos[1];
      placedVideoIds.add(videos[1].id);
    }
  }

  let otherIdx = 0;
  let videoIdx = 0;
  for (let i = 0; i < total; i++) {
    if (result[i] !== null) continue;

    if (otherIdx < others.length) {
      result[i] = others[otherIdx++];
      continue;
    }

    while (
      videoIdx < videos.length &&
      placedVideoIds.has(videos[videoIdx].id)
    ) {
      videoIdx += 1;
    }
    if (videoIdx < videos.length) {
      result[i] = videos[videoIdx];
      placedVideoIds.add(videos[videoIdx].id);
      videoIdx += 1;
    }
  }

  return result.filter((p): p is ShowcasePost => p !== null);
}

/**
 * Home-feed slice that prefers including at least one carousel when available,
 * so slide arrows are demonstrable next to the profile grid.
 */
export function pickShowcaseFeedPosts(
  posts: ShowcasePost[],
  limit: number
): ShowcasePost[] {
  if (limit <= 0 || posts.length === 0) return [];
  const primary = posts.slice(0, limit);
  if (primary.some((p) => p.mediaType === 'carousel')) return primary;

  const carousel = posts.find((p) => p.mediaType === 'carousel');
  if (!carousel) return primary;

  if (primary.length < limit) return [...primary, carousel];
  return [...primary.slice(0, limit - 1), carousel];
}

/** @deprecated Prefer getShowcaseBrand(brandId) */
export const SHOWCASE_BRAND = MAGNATE_BRAND;

/** Still thumbnail for grid cells (never a video file). */
export function getPostThumbnailUrl(post: ShowcasePost): string {
  if (post.mediaType === 'carousel') {
    return post.carouselSlides?.[0]?.imageUrl || '';
  }
  if (post.mediaType === 'video') {
    return post.posterUrl || post.imageUrl || '';
  }
  return post.imageUrl || '';
}

/** Deterministic fake engagement from post id (stable across renders). */
export function getPostEngagement(post: ShowcasePost): {
  likes: number;
  comments: number;
  shares: number;
} {
  let hash = 0;
  for (let i = 0; i < post.id.length; i++) {
    hash = (hash * 31 + post.id.charCodeAt(i)) >>> 0;
  }
  return {
    likes: 120 + (hash % 1800),
    comments: 8 + (hash % 90),
    shares: 3 + (hash % 40),
  };
}

export function formatRelativePostTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Just now';
  const day = date.getUTCDate();
  const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  return `${month} ${day}`;
}
