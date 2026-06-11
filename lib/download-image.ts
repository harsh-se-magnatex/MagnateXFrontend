/**
 * Download a remote image as a file. Plain `<a download>` does not work for
 * cross-origin URLs (e.g. Firebase Storage); this fetches bytes and saves locally.
 */
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

async function downloadViaProxy(url: string, filename: string) {
  const res = await fetch('/api/download-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, filename }),
  });
  if (!res.ok) {
    let message = 'Download failed';
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  triggerBlobDownload(blob, filename);
}

export async function downloadImageAsFile(url: string, filename: string) {
  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (res.ok) {
      const blob = await res.blob();
      triggerBlobDownload(blob, filename);
      return;
    }
  } catch {
    /* fall through to proxy */
  }
  await downloadViaProxy(url, filename);
}
