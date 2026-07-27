import type { GeneratedMediaLibraryItem } from '@/src/service/api/generated-media-library.service';
import type {
  PostSchedulerPrefillCarouselSlide,
  PostSchedulerPrefillPost,
  PostSchedulerPrefillSource,
} from '@/lib/post-scheduler-prefill-store';
import {
  isLikelyVideoUrl,
  resolveSchedulableMediaPreview,
} from '@/lib/post-media-preview';

const SCHEDULABLE_COLLECTIONS = new Set<PostSchedulerPrefillSource>([
  'instant-generation',
  'productadvert',
  'videoGeneration',
  'carouselGeneratedPosts',
]);

const SCHEDULE_PLATFORMS = new Set(['instagram', 'facebook', 'linkedin']);

function currentLocalIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isPastTargetDate(value: string | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  return trimmed < currentLocalIsoDate();
}

function isSchedulableSource(
  value: string
): value is PostSchedulerPrefillSource {
  return SCHEDULABLE_COLLECTIONS.has(value as PostSchedulerPrefillSource);
}

function isVideoGalleryItem(item: GeneratedMediaLibraryItem): boolean {
  const preview = resolveSchedulableMediaPreview({
    mediaType: item.mediaType,
    imageUrl: item.imageUrl,
    videoUrl: item.videoUrl,
    posterUrl: item.posterUrl,
  });
  return preview.isVideo;
}

function isCarouselGalleryItem(item: GeneratedMediaLibraryItem): boolean {
  if (item.mediaType === 'carousel') return true;
  if (item.collection === 'carouselGeneratedPosts') return true;
  return Array.isArray(item.carouselSlides) && item.carouselSlides.length >= 2;
}

function carouselSlidesFromItem(
  item: GeneratedMediaLibraryItem
): PostSchedulerPrefillCarouselSlide[] | null {
  const raw = Array.isArray(item.carouselSlides) ? item.carouselSlides : [];
  const slides: PostSchedulerPrefillCarouselSlide[] = [];
  for (let i = 0; i < raw.length; i++) {
    const slide = raw[i];
    const imageUrl = String(slide?.imageUrl ?? '').trim();
    const imageFilePath = String(slide?.imageFilePath ?? '').trim();
    if (!imageUrl || !imageFilePath) continue;
    slides.push({
      index:
        typeof slide?.index === 'number' && Number.isFinite(slide.index)
          ? slide.index
          : i + 1,
      imageUrl,
      imageFilePath,
      headline:
        typeof slide?.headline === 'string' ? slide.headline : null,
      purpose: typeof slide?.purpose === 'string' ? slide.purpose : null,
      visualType:
        typeof slide?.visualType === 'string' ? slide.visualType : null,
    });
  }
  return slides.length >= 2 ? slides : null;
}

export function galleryItemCanSchedule(item: GeneratedMediaLibraryItem): boolean {
  if (!isSchedulableSource(item.collection)) return false;
  if (item.earlierScheduled === true) return false;
  if (isPastTargetDate(item.targetCalendarDate)) return false;
  if (typeof item.canSchedule === 'boolean') return item.canSchedule;

  const platform = item.platform?.trim().toLowerCase() ?? '';
  if (!SCHEDULE_PLATFORMS.has(platform)) return false;

  if (isCarouselGalleryItem(item)) {
    return carouselSlidesFromItem(item) !== null;
  }

  if (isVideoGalleryItem(item)) {
    const videoPath = item.videoFilePath?.trim() ?? '';
    const videoUrl = item.videoUrl?.trim() ?? '';
    return videoPath.length > 0 && videoUrl.length > 0;
  }

  const path = item.imageFilePath?.trim() ?? '';
  const url = item.imageUrl?.trim() ?? '';
  return path.length > 0 && url.length > 0;
}

export function galleryItemToPrefillPost(
  item: GeneratedMediaLibraryItem
): PostSchedulerPrefillPost | null {
  if (!galleryItemCanSchedule(item)) return null;
  const platform = item.platform.trim().toLowerCase();
  if (!SCHEDULE_PLATFORMS.has(platform)) return null;
  if (!isSchedulableSource(item.collection)) return null;
  const caption =
    typeof item.caption === 'string'
      ? item.caption.trim()
      : String(item.caption ?? '').trim();

  if (isCarouselGalleryItem(item)) {
    const carouselSlides = carouselSlidesFromItem(item);
    if (!carouselSlides) return null;
    const cover = carouselSlides[0];
    return {
      imageUrl: cover.imageUrl,
      imageFilePath: cover.imageFilePath,
      mediaType: 'carousel',
      carouselSlides,
      message: caption,
      platform: platform as PostSchedulerPrefillPost['platform'],
      source: item.collection,
    };
  }

  if (isVideoGalleryItem(item)) {
    const videoUrl = item.videoUrl?.trim() ?? '';
    const videoFilePath = item.videoFilePath?.trim() ?? '';
    const posterUrl =
      item.posterUrl?.trim() || item.imageUrl?.trim() || '';
    const posterPath =
      item.posterFilePath?.trim() || item.imageFilePath?.trim() || '';
    if (!videoUrl || !videoFilePath) return null;
    return {
      imageUrl: posterUrl,
      imageFilePath: '',
      mediaType: 'video',
      videoUrl,
      videoFilePath,
      ...(posterUrl ? { videoPosterUrl: posterUrl } : {}),
      ...(posterPath ? { videoPosterPath: posterPath } : {}),
      message: caption,
      platform: platform as PostSchedulerPrefillPost['platform'],
      source: item.collection,
    };
  }

  const imageUrl = item.imageUrl?.trim() ?? '';
  const imageFilePath = item.imageFilePath?.trim() ?? '';
  if (!imageUrl || !imageFilePath) return null;
  if (isLikelyVideoUrl(imageUrl)) return null;
  return {
    imageUrl,
    imageFilePath,
    message: caption,
    platform: platform as PostSchedulerPrefillPost['platform'],
    source: item.collection,
  };
}
