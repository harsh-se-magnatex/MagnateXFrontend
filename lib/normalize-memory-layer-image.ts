/**
 * Memory-layer uploads must be PNG, JPEG, WebP, or GIF for vision + storage.
 * Browsers can pick AVIF, HEIC, BMP, TIFF, etc. — decode and emit PNG/JPEG.
 * Oversized pixels / MB are downscaled + compressed before upload (multer 12MB).
 *
 * TIFF/.tif is not renderable in most browsers via <img> or createImageBitmap,
 * so we decode with UTIF2 and convert to PNG for preview + upload.
 */

import { prepareGenerationImage } from '@/lib/prepare-generation-image';

const SAFE_UPLOAD_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

const CONVERTIBLE_EXTENSIONS = new Set([
  'avif',
  'heic',
  'heif',
  'bmp',
  'tif',
  'tiff',
  'ico',
]);

/** Longest side cap — keeps product detail while staying upload-safe. */
export const MEMORY_LAYER_IMAGE_MAX_EDGE_PX = 4096;
/** Under multer `memoryLayerPhotosUpload` 12MB limit. */
export const MEMORY_LAYER_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

function fileExtension(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() ?? '';
}

function isTiffFile(file: File): boolean {
  const mime = file.type.toLowerCase().trim();
  if (
    mime === 'image/tiff' ||
    mime === 'image/tif' ||
    mime === 'image/x-tiff'
  ) {
    return true;
  }
  const ext = fileExtension(file);
  return ext === 'tif' || ext === 'tiff';
}

function needsConversion(file: File): boolean {
  if (isTiffFile(file)) return true;
  const mime = file.type.toLowerCase().trim();
  if (mime && SAFE_UPLOAD_MIMES.has(mime)) return false;
  if (mime && mime !== 'image/svg+xml' && mime.startsWith('image/')) {
    return true;
  }
  return CONVERTIBLE_EXTENSIONS.has(fileExtension(file));
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
      'image/png'
    );
  });
}

function toPngFile(file: File, blob: Blob): File {
  const base = file.name.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${base}.png`, {
    type: 'image/png',
    lastModified: Date.now(),
  });
}

async function convertTiffToPng(file: File): Promise<File | null> {
  try {
    const UTIF = (await import('@/lib/vendor/utif2-bridge')).default;
    const buffer = await file.arrayBuffer();
    const ifds = UTIF.decode(buffer);
    if (!ifds?.length) return null;

    const page = ifds[0];
    UTIF.decodeImage(buffer, page);
    const width = Number(page.width) || 0;
    const height = Number(page.height) || 0;
    if (width < 1 || height < 1) return null;

    const rgba = UTIF.toRGBA8(page);
    if (!rgba?.length) return null;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imageData = new ImageData(
      new Uint8ClampedArray(rgba),
      width,
      height
    );
    ctx.putImageData(imageData, 0, 0);
    const blob = await canvasToPngBlob(canvas);
    return toPngFile(file, blob);
  } catch (err) {
    console.warn('[memory-layer] TIFF convert failed:', err);
    return null;
  }
}

async function convertUnsupportedToPng(file: File): Promise<File> {
  if (isTiffFile(file)) {
    const converted = await convertTiffToPng(file);
    if (converted) return converted;
    // Fall through to createImageBitmap (rarely supported) then original.
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0);
    const blob = await canvasToPngBlob(canvas);
    return toPngFile(file, blob);
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}

/**
 * Convert unsupported formats, then downscale / compress when over pixel or
 * byte limits so uploads succeed against the API multer cap.
 */
export async function normalizeMemoryLayerUploadImage(
  file: File
): Promise<File> {
  if (typeof window === 'undefined') return file;
  if (file.type === 'image/svg+xml') return file;

  let working = file;
  if (needsConversion(file)) {
    working = await convertUnsupportedToPng(file);
  }

  // Still a TIFF after convert? Browser cannot preview/upload it as-is.
  if (isTiffFile(working)) {
    throw new Error(
      `${file.name} is a TIFF and could not be converted for preview. Try PNG or JPEG.`
    );
  }

  return prepareGenerationImage(working, {
    maxEdgePx: MEMORY_LAYER_IMAGE_MAX_EDGE_PX,
    maxBytes: MEMORY_LAYER_IMAGE_MAX_BYTES,
    mimeType: 'image/jpeg',
  });
}

export async function normalizeMemoryLayerUploadImages(
  files: File[]
): Promise<File[]> {
  return Promise.all(files.map((file) => normalizeMemoryLayerUploadImage(file)));
}
