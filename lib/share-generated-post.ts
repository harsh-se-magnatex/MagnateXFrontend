import { fetchImageAsBlob } from '@/lib/fetch-image-blob';

export type ShareGeneratedPostInput = {
  imageUrl: string;
  caption?: string | null;
  /** Defaults to sociogenie-post.{ext} based on MIME type. */
  filename?: string;
};

export type ShareGeneratedPostResult =
  | { status: 'shared' }
  | { status: 'cancelled' }
  | { status: 'unsupported' }
  | { status: 'error'; message: string };

function extensionForMime(mime: string): string {
  const lower = mime.toLowerCase();
  if (lower.includes('jpeg') || lower.includes('jpg')) return 'jpg';
  if (lower.includes('webp')) return 'webp';
  if (lower.includes('gif')) return 'gif';
  return 'png';
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = 'name' in error ? String((error as { name?: unknown }).name) : '';
  return name === 'AbortError' || name === 'NotAllowedError';
}

function canShareFiles(file: File): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false;
  }
  if (typeof navigator.canShare !== 'function') {
    // Older Safari: share exists but canShare may be missing — try share with files.
    return true;
  }
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/**
 * Share a generated post (image file + caption text) via the Web Share API.
 * Returns `unsupported` when the browser cannot share files so the UI can show a fallback.
 */
export async function shareGeneratedPost(
  input: ShareGeneratedPostInput
): Promise<ShareGeneratedPostResult> {
  const imageUrl = String(input.imageUrl ?? '').trim();
  if (!imageUrl) {
    return { status: 'error', message: 'No image is available to share.' };
  }

  const caption = String(input.caption ?? '').trim();

  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return { status: 'unsupported' };
  }

  let blob: Blob;
  try {
    blob = await fetchImageAsBlob(imageUrl);
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Could not load the image for sharing.';
    return { status: 'error', message };
  }

  const mimeType =
    blob.type && blob.type.startsWith('image/') ? blob.type : 'image/png';
  const filename =
    input.filename?.trim() ||
    `sociogenie-post.${extensionForMime(mimeType)}`;
  const file = new File([blob], filename, { type: mimeType });

  if (!canShareFiles(file)) {
    return { status: 'unsupported' };
  }

  const shareData: ShareData = {
    files: [file],
    ...(caption ? { text: caption } : {}),
  };

  try {
    if (
      typeof navigator.canShare === 'function' &&
      !navigator.canShare(shareData)
    ) {
      return { status: 'unsupported' };
    }
    await navigator.share(shareData);
    return { status: 'shared' };
  } catch (error: unknown) {
    if (isAbortError(error)) {
      return { status: 'cancelled' };
    }
    return {
      status: 'error',
      message:
        error instanceof Error && error.message
          ? error.message
          : 'Sharing failed. Please try again.',
    };
  }
}
