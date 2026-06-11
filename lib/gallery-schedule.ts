import type { GeneratedMediaLibraryItem } from '@/src/service/api/generated-media-library.service';
import type {
  PostSchedulerPrefillPost,
  PostSchedulerPrefillSource,
} from '@/lib/post-scheduler-prefill-store';

const SCHEDULABLE_COLLECTIONS = new Set<PostSchedulerPrefillSource>([
  'instant-generation',
  'productadvert',
]);

const SCHEDULE_PLATFORMS = new Set(['instagram', 'facebook', 'linkedin']);

function isSchedulableSource(
  value: string
): value is PostSchedulerPrefillSource {
  return SCHEDULABLE_COLLECTIONS.has(value as PostSchedulerPrefillSource);
}

export function galleryItemCanSchedule(item: GeneratedMediaLibraryItem): boolean {
  if (!isSchedulableSource(item.collection)) return false;
  if (item.earlierScheduled === true) return false;
  if (typeof item.canSchedule === 'boolean') return item.canSchedule;
  const path = item.imageFilePath?.trim() ?? '';
  const url = item.imageUrl?.trim() ?? '';
  if (!path || !url) return false;
  const platform = item.platform?.trim().toLowerCase() ?? '';
  return SCHEDULE_PLATFORMS.has(platform);
}

export function galleryItemToPrefillPost(
  item: GeneratedMediaLibraryItem
): PostSchedulerPrefillPost | null {
  if (!galleryItemCanSchedule(item)) return null;
  const platform = item.platform.trim().toLowerCase();
  if (!SCHEDULE_PLATFORMS.has(platform)) return null;
  const imageUrl = item.imageUrl?.trim() ?? '';
  const imageFilePath = item.imageFilePath?.trim() ?? '';
  if (!imageUrl || !imageFilePath) return null;
  if (!isSchedulableSource(item.collection)) return null;
  const caption =
    typeof item.caption === 'string'
      ? item.caption.trim()
      : String(item.caption ?? '').trim();
  return {
    imageUrl,
    imageFilePath,
    message: caption,
    platform: platform as PostSchedulerPrefillPost['platform'],
    source: item.collection,
  };
}
