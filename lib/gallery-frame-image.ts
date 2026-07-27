import type { GeneratedMediaLibraryItem } from '@/src/service/api/generated-media-library.service';
import { resolveSchedulableMediaPreview } from '@/lib/post-media-preview';

/** Still image URL suitable as a Veo first/last frame from a gallery item. */
export function galleryItemFrameImageUrl(
  item: GeneratedMediaLibraryItem
): string | null {
  const slides = Array.isArray(item.carouselSlides) ? item.carouselSlides : [];
  if (slides.length > 0) {
    for (const slide of slides) {
      const url = String(slide?.imageUrl ?? '').trim();
      if (url) return url;
    }
  }

  const preview = resolveSchedulableMediaPreview({
    mediaType: item.mediaType,
    imageUrl: item.imageUrl,
    videoUrl: item.videoUrl,
    posterUrl: item.posterUrl,
  });

  if (preview.isVideo) {
    const poster = preview.posterUrl?.trim();
    if (poster) return poster;
    const still = preview.imageUrl?.trim();
    return still || null;
  }

  const image = preview.imageUrl?.trim();
  return image || null;
}

export function isGalleryItemPickableForVideoFrame(
  item: GeneratedMediaLibraryItem
): boolean {
  return Boolean(galleryItemFrameImageUrl(item));
}
