/**
 * Memory-layer uploads must be PNG, JPEG, WebP, or GIF for vision + storage.
 * Browsers can pick AVIF, HEIC, BMP, etc. — decode via canvas and emit PNG.
 */

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

function needsConversion(file: File): boolean {
  const mime = file.type.toLowerCase().trim();
  if (mime && SAFE_UPLOAD_MIMES.has(mime)) return false;
  if (mime && mime !== 'image/svg+xml' && mime.startsWith('image/')) {
    return true;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return CONVERTIBLE_EXTENSIONS.has(ext);
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
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

/** Convert unsupported image formats to PNG; returns the original when already safe. */
export async function normalizeMemoryLayerUploadImage(file: File): Promise<File> {
  if (typeof window === 'undefined') return file;
  if (file.type === 'image/svg+xml') return file;
  if (!needsConversion(file)) return file;

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

export async function normalizeMemoryLayerUploadImages(
  files: File[]
): Promise<File[]> {
  return Promise.all(files.map((file) => normalizeMemoryLayerUploadImage(file)));
}
