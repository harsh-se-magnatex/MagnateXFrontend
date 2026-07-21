/**
 * Fetch a remote image as a Blob. Tries CORS first, then the same-origin
 * `/api/download-image` proxy (Firebase Storage often blocks cross-origin reads).
 */
export async function fetchImageAsBlob(url: string): Promise<Blob> {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error('Image URL is missing.');
  }

  try {
    const res = await fetch(trimmed, { mode: 'cors', credentials: 'omit' });
    if (res.ok) {
      const blob = await res.blob();
      if (!blob.type.startsWith('image/') && blob.size === 0) {
        throw new Error('Empty image response.');
      }
      return blob;
    }
  } catch {
    /* fall through to proxy */
  }

  const res = await fetch('/api/download-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: trimmed, filename: 'sociogenie-post.png' }),
  });
  if (!res.ok) {
    let message = 'Failed to fetch image.';
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.blob();
}
