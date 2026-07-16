export type SchedulableMediaPreview = {
  isVideo: boolean;
  videoUrl: string | null;
  posterUrl: string | null;
  imageUrl: string | null;
};

export function isLikelyVideoUrl(url: string | null | undefined): boolean {
  const trimmed = String(url ?? '').trim();
  if (!trimmed) return false;
  if (/\.(mp4|webm|mov)(\?|#|$)/i.test(trimmed)) return true;
  if (/content[-_]?type=video/i.test(trimmed)) return true;
  if (/\/video\//i.test(trimmed)) return true;
  return false;
}

export function resolveSchedulableMediaPreview(input: {
  mediaType?: 'image' | 'video' | 'carousel' | string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  videoPosterUrl?: string | null;
  posterUrl?: string | null;
}): SchedulableMediaPreview {
  const imageUrl = String(input.imageUrl ?? '').trim() || null;
  const videoUrl = String(input.videoUrl ?? '').trim() || null;
  const posterUrl =
    String(input.videoPosterUrl ?? input.posterUrl ?? '').trim() || null;
  // Carousels are multi-image; treat cover as a still image (not video).
  if (input.mediaType === 'carousel') {
    return {
      isVideo: false,
      videoUrl: null,
      posterUrl: null,
      imageUrl,
    };
  }
  const explicitVideo = input.mediaType === 'video';
  const inferredVideo =
    explicitVideo ||
    Boolean(videoUrl) ||
    (Boolean(imageUrl) && isLikelyVideoUrl(imageUrl));
  const resolvedVideoUrl =
    videoUrl ?? (isLikelyVideoUrl(imageUrl) ? imageUrl : null);
  const resolvedPoster = posterUrl ?? (inferredVideo ? imageUrl : null);

  return {
    isVideo: inferredVideo && Boolean(resolvedVideoUrl),
    videoUrl: resolvedVideoUrl,
    posterUrl: resolvedPoster,
    imageUrl: inferredVideo ? resolvedPoster : imageUrl,
  };
}

export function hasSchedulableMediaPreview(
  preview: SchedulableMediaPreview
): boolean {
  return preview.isVideo ? Boolean(preview.videoUrl) : Boolean(preview.imageUrl);
}
