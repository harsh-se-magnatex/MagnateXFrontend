/**
 * Client-side frame preview mode for the video generator.
 * Mirrors backend `veoFrameContentMode`: logo → centered logo-card preview,
 * product/scene → contain (never cover crop that chops content).
 */

export type VideoFramePreviewMode = 'logo-card' | 'hero-photo';

type Rgb = { r: number; g: number; b: number };

function colorDistance(a: Rgb, b: Rgb): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

function averageColor(colors: Rgb[]): Rgb {
  if (colors.length === 0) return { r: 0, g: 0, b: 0 };
  const total = colors.reduce(
    (sum, c) => ({ r: sum.r + c.r, g: sum.g + c.g, b: sum.b + c.b }),
    { r: 0, g: 0, b: 0 }
  );
  const n = colors.length;
  return { r: total.r / n, g: total.g / n, b: total.b / n };
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    // Gallery / profile logos may be cross-origin; blob: uploads are same-origin.
    if (!src.startsWith('blob:') && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load frame image for preview mode.'));
    img.src = src;
  });
}

/**
 * Heuristic logo vs product/scene classifier for preview styling only.
 * Backend still does the authoritative Veo frame classification at generate time.
 */
export async function detectVideoFramePreviewMode(
  imageSrc: string
): Promise<VideoFramePreviewMode> {
  try {
    const img = await loadImageElement(imageSrc);
    const maxSide = 256;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 'hero-photo';

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);

    const borderSize = Math.max(2, Math.round(Math.min(width, height) * 0.04));
    const opaque: Rgb[] = [];
    const border: Rgb[] = [];
    let transparentCount = 0;
    let total = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        const alpha = data[offset + 3] ?? 255;
        total += 1;
        if (alpha < 250) transparentCount += 1;
        if (alpha < 16) continue;

        const color = {
          r: data[offset] ?? 0,
          g: data[offset + 1] ?? 0,
          b: data[offset + 2] ?? 0,
        };
        opaque.push(color);
        if (
          x < borderSize ||
          y < borderSize ||
          x >= width - borderSize ||
          y >= height - borderSize
        ) {
          border.push(color);
        }

        // Content bbox: treat near-border-matching pixels as empty later.
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    if (opaque.length === 0) return 'logo-card';

    const transparencyRatio = transparentCount / Math.max(total, 1);
    if (transparencyRatio >= 0.12) return 'logo-card';

    const borderColor = averageColor(border);
    const borderIsSolid =
      border.length > 0 &&
      border.filter((c) => colorDistance(c, borderColor) < 22).length /
        border.length >=
        0.9;

    if (!borderIsSolid) return 'hero-photo';

    const foreground = opaque.filter((c) => colorDistance(c, borderColor) >= 28);
    const foregroundRatio = foreground.length / Math.max(opaque.length, 1);

    // Solid plate + modest mark occupancy ≈ logo card / wordmark upload.
    if (foregroundRatio > 0 && foregroundRatio <= 0.55) {
      return 'logo-card';
    }

    // Very roomy content box on a flat plate (centered mark with margins).
    const contentW = Math.max(0, maxX - minX + 1);
    const contentH = Math.max(0, maxY - minY + 1);
    const contentAreaRatio = (contentW * contentH) / Math.max(width * height, 1);
    if (foregroundRatio <= 0.7 && contentAreaRatio <= 0.72) {
      return 'logo-card';
    }

    return 'hero-photo';
  } catch {
    return 'hero-photo';
  }
}
