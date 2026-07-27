'use client';

import { useEffect, useRef } from 'react';
import { getFrameScrubT } from '@/lib/landing-scroll';

const TOTAL_FRAMES = 634;
const LERP_SPEED = 0.22;
const FRAME_BASE_PATH_DESKTOP = '/frames-jpg/frame_';
const FRAME_BASE_PATH_MOBILE = '/frames-jpg-mobile/frame_';

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;
}

function framePath(index: number, basePath: string): string {
  return `${basePath}${String(index + 1).padStart(6, '0')}.jpg`;
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

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const basePath = isMobileViewport()
      ? FRAME_BASE_PATH_MOBILE
      : FRAME_BASE_PATH_DESKTOP;

    const images: HTMLImageElement[] = new Array(TOTAL_FRAMES);
    let currentFrame = 0;
    let targetFrame = 0;
    let isReady = false;
    let maxLoadedIndex = -1;
    let rafId = 0;

    function markFrameLoaded(frameIndex: number) {
      maxLoadedIndex = Math.max(maxLoadedIndex, frameIndex);
    }

    if (!reducedMotion) {
      for (let i = 0; i < TOTAL_FRAMES; i++) {
        images[i] = new Image();
        const frameIndex = i;
        images[i].onload = () => {
          markFrameLoaded(frameIndex);
          if (frameIndex === TOTAL_FRAMES - 1) isReady = true;
        };
        images[i].onerror = () => {
          markFrameLoaded(frameIndex);
          if (frameIndex === TOTAL_FRAMES - 1) isReady = true;
        };
        images[i].src = framePath(i, basePath);
      }
    } else {
      const img = new Image();
      img.onload = () => {
        isReady = true;
        drawFrame(img);
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
      if (!reducedMotion && (maxLoadedIndex >= 0 || isReady)) {
        targetFrame = getFrameScrubT() * (TOTAL_FRAMES - 1);
      }

      currentFrame += (targetFrame - currentFrame) * LERP_SPEED;
      let idx = Math.round(currentFrame);
      if (idx < 0) idx = 0;
      if (idx >= TOTAL_FRAMES) idx = TOTAL_FRAMES - 1;
      if (!isReady) idx = Math.min(idx, Math.max(0, maxLoadedIndex));
      if (idx >= 0 && idx < TOTAL_FRAMES && images[idx]) {
        drawFrame(images[idx]);
      }

      const pHero = getFrameScrubT();
      const hero = document.getElementById(heroContentId);
      if (hero) {
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
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafId);
      document.documentElement.style.removeProperty('--landing-3d-frame-opacity');
      document.documentElement.style.removeProperty('--landing-3d-section-bg-opacity');
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
