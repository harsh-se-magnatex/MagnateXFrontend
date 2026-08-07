/**
 * Client-side prep for generation uploads: downscale oversized pixels and
 * compress large files before they hit the API.
 */

export const GENERATION_IMAGE_MAX_EDGE_PX = 2048;
export const GENERATION_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type PrepareGenerationImageOptions = {
  /** Longest side cap (width or height). Default 2048. */
  maxEdgePx?: number;
  /** Max output file size in bytes. Default 5MB. */
  maxBytes?: number;
  /** Canvas output MIME. Default image/webp. */
  mimeType?: 'image/webp' | 'image/jpeg';
};

function isSkippableImage(file: File): boolean {
  if (!file.type.startsWith('image/')) return true;
  // SVG / animated formats don't round-trip cleanly through canvas.
  if (file.type === 'image/svg+xml') return true;
  if (file.type === 'image/gif') return true;
  return false;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
      type,
      quality
    );
  });
}

function outputFileName(originalName: string, mimeType: string): string {
  const base = originalName.replace(/\.[^.]+$/, '') || 'image';
  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'webp';
  return `${base}.${ext}`;
}

/**
 * If the image is too large in pixels or bytes, resize and/or compress it.
 * Returns the original File when already within limits or when prep fails.
 */
export async function prepareGenerationImage(
  file: File,
  options: PrepareGenerationImageOptions = {}
): Promise<File> {
  if (typeof window === 'undefined') return file;
  if (isSkippableImage(file)) return file;

  const maxEdgePx = options.maxEdgePx ?? GENERATION_IMAGE_MAX_EDGE_PX;
  const maxBytes = options.maxBytes ?? GENERATION_IMAGE_MAX_BYTES;
  const mimeType = options.mimeType ?? 'image/webp';

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const srcW = bitmap.width;
  const srcH = bitmap.height;
  const longest = Math.max(srcW, srcH);
  const needsResize = longest > maxEdgePx;
  const needsCompress = file.size > maxBytes;

  if (!needsResize && !needsCompress) {
    bitmap.close();
    return file;
  }

  const scale = needsResize ? maxEdgePx / longest : 1;
  const targetW = Math.max(1, Math.round(srcW * scale));
  const targetH = Math.max(1, Math.round(srcH * scale));

  try {
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();

    // Prefer high quality when only resizing; search lower if still too big.
    let lo = 0.45;
    let hi = 0.92;
    let best: Blob | null = null;

    // Fast path: try a strong quality first.
    const first = await canvasToBlob(canvas, mimeType, hi);
    if (first.size <= maxBytes) {
      best = first;
    } else {
      for (let i = 0; i < 8; i++) {
        const mid = (lo + hi) / 2;
        const blob = await canvasToBlob(canvas, mimeType, mid);
        if (blob.size <= maxBytes) {
          best = blob;
          lo = mid;
        } else {
          hi = mid;
        }
      }
      if (!best) {
        best = await canvasToBlob(canvas, mimeType, Math.max(0.4, lo));
      }
    }

    // If somehow larger than the original and still over budget, keep original.
    if (best.size >= file.size && file.size <= maxBytes && !needsResize) {
      return file;
    }

    return new File([best], outputFileName(file.name, mimeType), {
      type: mimeType,
      lastModified: Date.now(),
    });
  } catch {
    try {
      bitmap.close();
    } catch {
      /* already closed */
    }
    return file;
  }
}

/** Prepare zero or more images; skips null/undefined entries. */
export async function prepareGenerationImages(
  files: Array<File | null | undefined>,
  options?: PrepareGenerationImageOptions
): Promise<File[]> {
  const out: File[] = [];
  for (const file of files) {
    if (!file) continue;
    out.push(await prepareGenerationImage(file, options));
  }
  return out;
}
