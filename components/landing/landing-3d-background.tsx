'use client';

import { useEffect, useRef } from 'react';
import { getFrameScrubT } from '@/lib/landing-scroll';

const TOTAL_FRAMES = 634;
const LERP_SPEED = 0.22;
/** How many frames to fetch in parallel while filling the contiguous window. */
const LOAD_BATCH_SIZE = 12;
/** Fewer parallel fetches on a `3g`-tier connection so the frame sequence
 *  doesn't starve fonts/JS/other requests of bandwidth. */
const LOAD_BATCH_SIZE_SLOW = 4;
/** Hero scroll fade only after this many contiguous frames are ready. */
const HERO_READY_FRAMES = 24;
const FRAME_BASE_PATH_DESKTOP = '/frames-webp/frame_';
const FRAME_BASE_PATH_MOBILE = '/frames-webp-mobile/frame_';

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;
}

type ConnectionTier = 'offline-or-tiny' | 'slow' | 'normal';

/**
 * Network Information API isn't available everywhere (no Safari/Firefox
 * support) — treat "unknown" the same as "normal" rather than penalizing
 * browsers that simply don't expose it.
 */
function getConnectionTier(): ConnectionTier {
  if (typeof navigator === 'undefined') return 'normal';
  const conn = (
    navigator as Navigator & {
      connection?: {
        saveData?: boolean;
        effectiveType?: string;
      };
    }
  ).connection;
  if (!conn) return 'normal';
  if (conn.saveData) return 'offline-or-tiny';
  if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
    return 'offline-or-tiny';
  }
  if (conn.effectiveType === '3g') return 'slow';
  return 'normal';
}

function framePath(index: number, basePath: string): string {
  return `${basePath}${String(index + 1).padStart(6, '0')}.webp`;
}

type Landing3DBackgroundProps = {
  heroContentId?: string;
};

export function Landing3DBackground({
  heroContentId = 'heroContent',
}: Landing3DBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const connectionTier = getConnectionTier();
    // On Save-Data / 2G, hold a single static frame instead of streaming the
    // full sequence — the scroll-linked hero text motion still runs (that's
    // just a CSS transform, not a network cost), only the background stops
    // fetching more frames.
    const singleFrameOnly = reducedMotion || connectionTier === 'offline-or-tiny';
    const loadBatchSize =
      connectionTier === 'slow' ? LOAD_BATCH_SIZE_SLOW : LOAD_BATCH_SIZE;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const basePath = isMobileViewport()
      ? FRAME_BASE_PATH_MOBILE
      : FRAME_BASE_PATH_DESKTOP;

    const images: (HTMLImageElement | undefined)[] = new Array(TOTAL_FRAMES);
    const loaded = new Uint8Array(TOTAL_FRAMES);
    let contiguousLoaded = -1;
    let currentFrame = 0;
    let targetFrame = 0;
    let lastDrawnIndex = -1;
    let nextToLoad = 0;
    let inFlight = 0;
    let cancelled = false;
    let rafId = 0;

    function advanceContiguous() {
      while (
        contiguousLoaded + 1 < TOTAL_FRAMES &&
        loaded[contiguousLoaded + 1]
      ) {
        contiguousLoaded++;
      }
    }

    function scheduleLoads() {
      if (cancelled || singleFrameOnly) return;
      while (inFlight < loadBatchSize && nextToLoad < TOTAL_FRAMES) {
        const frameIndex = nextToLoad++;
        inFlight++;
        const img = new Image();
        images[frameIndex] = img;
        const settle = () => {
          loaded[frameIndex] = 1;
          inFlight--;
          advanceContiguous();
          scheduleLoads();
        };
        img.onload = settle;
        img.onerror = settle;
        img.src = framePath(frameIndex, basePath);
      }
    }

    if (!singleFrameOnly) {
      scheduleLoads();
    } else {
      const img = new Image();
      img.onload = () => {
        loaded[0] = 1;
        contiguousLoaded = 0;
        images[0] = img;
        drawFrame(img);
      };
      img.onerror = () => {
        loaded[0] = 1;
        contiguousLoaded = 0;
      };
      img.src = framePath(0, basePath);
      images[0] = img;
    }

    function resize() {
      const dprCap = isMobileViewport() ? 1.5 : 2;
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.imageSmoothingEnabled = true;
      ctx!.imageSmoothingQuality = 'high';
    }

    function drawFrame(img: HTMLImageElement) {
      if (!img?.naturalWidth) return;
      const cw = window.innerWidth;
      const ch = window.innerHeight;
      if (cw < 10 || ch < 10) return;
      ctx!.clearRect(0, 0, cw, ch);
      const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx!.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    }

    function animate() {
      if (!reducedMotion && contiguousLoaded >= 0) {
        targetFrame = getFrameScrubT() * (TOTAL_FRAMES - 1);
      }

      currentFrame += (targetFrame - currentFrame) * LERP_SPEED;
      let idx = Math.round(currentFrame);
      if (idx < 0) idx = 0;
      if (idx >= TOTAL_FRAMES) idx = TOTAL_FRAMES - 1;
      // Never scrub past the contiguous loaded window — holds last good frame.
      if (contiguousLoaded >= 0) {
        idx = Math.min(idx, contiguousLoaded);
      }

      const img = images[idx];
      if (img?.naturalWidth && idx !== lastDrawnIndex) {
        drawFrame(img);
        lastDrawnIndex = idx;
      } else if (
        !img?.naturalWidth &&
        lastDrawnIndex >= 0 &&
        images[lastDrawnIndex]?.naturalWidth
      ) {
        // keep previous draw
      }

      const hero = document.getElementById(heroContentId);
      if (hero) {
        const heroReady = contiguousLoaded >= HERO_READY_FRAMES - 1;
        const pHero = heroReady ? getFrameScrubT() : 0;
        const o = Math.max(0, 1 - pHero * 3.2);
        const scale = 1 - pHero * 0.08;
        const y = -pHero * 48;
        hero.style.opacity = String(o);
        hero.style.transform = `translateY(${y}px) scale(${scale})`;
        hero.style.pointerEvents = o < 0.08 ? 'none' : 'auto';
      }

      document.documentElement.style.setProperty(
        '--landing-3d-frame-opacity',
        '1'
      );
      document.documentElement.style.setProperty(
        '--landing-3d-section-bg-opacity',
        '0'
      );

      rafId = requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    resize();
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafId);
      document.documentElement.style.removeProperty('--landing-3d-frame-opacity');
      document.documentElement.style.removeProperty(
        '--landing-3d-section-bg-opacity'
      );
    };
  }, [heroContentId]);

  return (
    <>
      <div id="bgWrap" className="landing-3d-bg-wrap" aria-hidden>
        <canvas ref={canvasRef} id="bgCanvas" className="landing-3d-canvas" />
      </div>
      <div className="landing-3d-vignette" aria-hidden />
    </>
  );
}
