/**
 * Download a remote media file (image/video). Plain `<a download>` does not
 * work for cross-origin URLs (e.g. Firebase Storage); this fetches bytes and
 * saves locally.
 */
import { fetchImageAsBlob } from '@/lib/fetch-image-blob';

function triggerBlobDownload(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

export async function downloadImageAsFile(url: string, filename: string) {
  const blob = await fetchImageAsBlob(url);
  triggerBlobDownload(blob, filename);
}

/** Same blob-download path as images; use for generated videos too. */
export async function downloadMediaAsFile(url: string, filename: string) {
  return downloadImageAsFile(url, filename);
}
