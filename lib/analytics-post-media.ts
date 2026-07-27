/** Collect deduplicated image URLs from analytics post fields. */
export function collectPostImageUrls(post: {
  mediaUrl?: string | null;
  mediaUrls?: string[] | null;
}): string[] {
  const fromArray = (post.mediaUrls ?? [])
    .map((url) => String(url ?? '').trim())
    .filter(Boolean);

  if (fromArray.length > 0) {
    const seen = new Set<string>();
    return fromArray.filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });
  }

  const single = String(post.mediaUrl ?? '').trim();
  return single ? [single] : [];
}

export function isMultiImageAnalyticsPost(post: {
  mediaUrl?: string | null;
  mediaUrls?: string[] | null;
  type?: string | null;
  videoUrl?: string | null;
  mediaType?: string | null;
}): boolean {
  if (String(post.videoUrl ?? '').trim()) return false;
  if (post.mediaType === 'video' || post.type === 'video') return false;

  const urls = collectPostImageUrls(post);
  if (urls.length > 1) return true;

  const type = String(post.type ?? '').toLowerCase();
  return type === 'album' || type === 'carousel';
}
