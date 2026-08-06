/**
 * Convert landing scroll JPG frames to WebP.
 * Usage (from frontend/): node scripts/convert-frames-to-webp.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');

const JOBS = [
  {
    src: path.join(frontendRoot, 'public', 'frames-jpg'),
    dest: path.join(frontendRoot, 'public', 'frames-webp'),
    quality: 80,
    label: 'desktop',
  },
  {
    src: path.join(frontendRoot, 'public', 'frames-jpg-mobile'),
    dest: path.join(frontendRoot, 'public', 'frames-webp-mobile'),
    quality: 75,
    label: 'mobile',
  },
];

const CONCURRENCY = 8;

async function convertDir({ src, dest, quality, label }) {
  if (!fs.existsSync(src)) {
    throw new Error(`Missing source dir: ${src}`);
  }
  fs.mkdirSync(dest, { recursive: true });

  const files = fs
    .readdirSync(src)
    .filter((f) => f.toLowerCase().endsWith('.jpg'))
    .sort();

  if (files.length === 0) {
    throw new Error(`No JPG frames in ${src}`);
  }

  console.log(`[${label}] Converting ${files.length} frames → ${dest} (q=${quality})`);

  let done = 0;
  let i = 0;

  async function worker() {
    while (i < files.length) {
      const file = files[i++];
      const inPath = path.join(src, file);
      const outPath = path.join(dest, file.replace(/\.jpg$/i, '.webp'));
      await sharp(inPath).webp({ quality, effort: 4 }).toFile(outPath);
      done++;
      if (done % 50 === 0 || done === files.length) {
        console.log(`[${label}] ${done}/${files.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const srcBytes = files.reduce(
    (sum, f) => sum + fs.statSync(path.join(src, f)).size,
    0
  );
  const destFiles = fs.readdirSync(dest).filter((f) => f.endsWith('.webp'));
  const destBytes = destFiles.reduce(
    (sum, f) => sum + fs.statSync(path.join(dest, f)).size,
    0
  );
  const mb = (n) => (n / (1024 * 1024)).toFixed(1);
  console.log(
    `[${label}] Done: ${destFiles.length} WebP, ${mb(srcBytes)} MB → ${mb(destBytes)} MB`
  );
}

for (const job of JOBS) {
  await convertDir(job);
}
console.log('All conversions complete.');
