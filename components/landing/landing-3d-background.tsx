'use client';

import { useEffect, useRef } from 'react';
import { getFrameScrubT } from '@/lib/landing-scroll';

const TOTAL_FRAMES = 634;
const LERP_SPEED = 0.22;
const FRAME_BASE_PATH_DESKTOP = '/frames-webp-1440/frame_';
const FRAME_BASE_PATH_MOBILE = '/frames-webp-mobile/frame_';

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
};

function getNetworkInformation(): NetworkInformation | undefined {
  return (navigator as Navigator & { connection?: NetworkInformation }).connection;
}

/** Expensive frame streaming is decorative. On a constrained connection we
 * keep the first frame, preserving the complete page while avoiding a download
 * that can otherwise exceed 50 MB. */
function shouldUseStaticFrame(reducedMotion: boolean): boolean {
  if (reducedMotion) return true;
  const connection = getNetworkInformation();
  if (!connection) return false;

  return Boolean(
    connection.saveData ||
      ['slow-2g', '2g', '3g'].includes(connection.effectiveType ?? '') ||
      (typeof connection.downlink === 'number' && connection.downlink < 2.5) ||
      (typeof connection.rtt === 'number' && connection.rtt > 450)
  );
}

function framePath(index: number, basePath: string): string {
  return `${basePath}${String(index + 1).padStart(6, '0')}.webp`;
}

function quantizeFrame(index: number, stride: number): number {
  return Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(index / stride) * stride));
}

type Landing3DBackgroundProps = {
  heroContentId?: string;
};

export function Landing3DBackground({
  heroContentId = 'heroContent',
}: Landing3DBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) return;
    canvas.style.opacity = '0';

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;
    const staticFrame = shouldUseStaticFrame(reducedMotion);
    const basePath = mobile ? FRAME_BASE_PATH_MOBILE : FRAME_BASE_PATH_DESKTOP;
    // The source contains far more frames than a scroll interaction can display.
    // Sampling it reduces worst-case transfer by 67–75% with no layout change.
    const frameStride = mobile ? 4 : 3;
    const maxConcurrentLoads = mobile ? 2 : 3;

    const images: (HTMLImageElement | undefined)[] = new Array(TOTAL_FRAMES);
    const loadState = new Uint8Array(TOTAL_FRAMES); // 0 idle, 1 loading, 2 ready, 3 failed
    let queue: number[] = [];
    let inFlight = 0;
    let currentFrame = 0;
    let targetFrame = 0;
    let lastDrawnIndex = -1;
    let lastHeroProgress = -1;
    let cancelled = false;
    let rafId = 0;
    let resizeRaf = 0;
    let firstFrameReady = false;

    function drawFrame(img: HTMLImageElement) {
      if (!img.naturalWidth) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (width < 10 || height < 10) return;

      const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
      const drawnWidth = img.naturalWidth * scale;
      const drawnHeight = img.naturalHeight * scale;
      ctx!.clearRect(0, 0, width, height);
      ctx!.drawImage(
        img,
        (width - drawnWidth) / 2,
        (height - drawnHeight) / 2,
        drawnWidth,
        drawnHeight
      );
    }

    function nearestReadyFrame(index: number): number | null {
      const quantized = quantizeFrame(index, frameStride);
      if (loadState[quantized] === 2) return quantized;
      for (let distance = frameStride; distance <= frameStride * 4; distance += frameStride) {
        const before = quantized - distance;
        const after = quantized + distance;
        if (before >= 0 && loadState[before] === 2) return before;
        if (after < TOTAL_FRAMES && loadState[after] === 2) return after;
      }
      return loadState[0] === 2 ? 0 : null;
    }

    function pumpQueue() {
      if (cancelled || staticFrame) return;
      while (inFlight < maxConcurrentLoads && queue.length > 0) {
        const index = queue.shift()!;
        if (loadState[index] !== 0) continue;

        loadState[index] = 1;
        inFlight++;
        const img = new Image();
        images[index] = img;
        img.decoding = 'async';
        img.fetchPriority = 'low';
        img.onload = () => {
          loadState[index] = 2;
          inFlight--;
          startAnimation();
          pumpQueue();
        };
        img.onerror = () => {
          loadState[index] = 3;
          images[index] = undefined;
          inFlight--;
          pumpQueue();
        };
        img.src = framePath(index, basePath);
      }
    }

    function requestFramesAround(index: number) {
      if (staticFrame) return;
      const center = quantizeFrame(index, frameStride);
      // Replace stale queued work after a fast scroll. Requests already in flight
      // finish, but no longer trigger a sequential fetch of every skipped frame.
      queue = [center, center + frameStride, center - frameStride]
        .filter((value) => value >= 0 && value < TOTAL_FRAMES)
        .filter((value) => loadState[value] === 0);
      pumpQueue();
    }

    function updateHero(progress: number) {
      if (progress === lastHeroProgress) return;
      lastHeroProgress = progress;
      const hero = document.getElementById(heroContentId);
      if (!hero) return;
      const opacity = Math.max(0, 1 - progress * 3.2);
      hero.style.opacity = String(opacity);
      hero.style.transform = `translateY(${-progress * 48}px) scale(${1 - progress * 0.08})`;
      hero.style.pointerEvents = opacity < 0.08 ? 'none' : 'auto';
    }

    function animate() {
      rafId = 0;
      if (cancelled || document.hidden) return;

      const distance = targetFrame - currentFrame;
      currentFrame =
        Math.abs(distance) < 0.35 ? targetFrame : currentFrame + distance * LERP_SPEED;

      const readyIndex = nearestReadyFrame(Math.round(currentFrame));
      if (readyIndex !== null && readyIndex !== lastDrawnIndex) {
        const image = images[readyIndex];
        if (image) drawFrame(image);
        lastDrawnIndex = readyIndex;
      }

      updateHero(firstFrameReady && !reducedMotion ? getFrameScrubT() : 0);
      if (Math.abs(targetFrame - currentFrame) >= 0.35) {
        rafId = requestAnimationFrame(animate);
      }
    }

    function startAnimation() {
      if (!rafId && !document.hidden) rafId = requestAnimationFrame(animate);
    }

    function updateFromScroll() {
      const progress = reducedMotion ? 0 : getFrameScrubT();
      targetFrame = progress * (TOTAL_FRAMES - 1);
      requestFramesAround(targetFrame);
      startAnimation();
    }

    function resize() {
      const dprCap = staticFrame || mobile ? 1 : 1.35;
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.imageSmoothingEnabled = true;
      ctx!.imageSmoothingQuality = 'high';
      const readyIndex = nearestReadyFrame(Math.round(currentFrame));
      if (readyIndex !== null && images[readyIndex]) drawFrame(images[readyIndex]!);
    }

    function onResize() {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(resize);
    }

    function onVisibilityChange() {
      if (!document.hidden) updateFromScroll();
    }

    // Load only the lightweight first frame during startup. The CSS fallback
    // paints the same asset before hydration, so slow networks never see an
    // empty canvas while this request resolves from the browser cache.
    const firstImage = new Image();
    images[0] = firstImage;
    loadState[0] = 1;
    firstImage.decoding = 'async';
    firstImage.fetchPriority = 'high';
    firstImage.onload = () => {
      if (cancelled) return;
      loadState[0] = 2;
      firstFrameReady = true;
      drawFrame(firstImage);
      canvas.style.opacity = '1';
      lastDrawnIndex = 0;
      updateFromScroll();
    };
    firstImage.onerror = () => {
      loadState[0] = 3;
      firstFrameReady = true;
      updateFromScroll();
    };
    firstImage.src = framePath(0, basePath);

    resize();
    window.addEventListener('scroll', updateFromScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(resizeRaf);
      window.removeEventListener('scroll', updateFromScroll);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
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
