'use client';

import { useEffect, useRef } from 'react';
import { getFrameScrubT } from '@/lib/landing-scroll';

const LERP_SPEED = 0.22;
/** Ignore tiny seeks to reduce decoder thrash while scrolling. */
const SEEK_EPSILON = 1 / 60;
const VIDEO_DESKTOP_MP4 = process.env.NEXT_PUBLIC_LANDING_VIDEO_MP4 || '';
const VIDEO_MOBILE_MP4 = process.env.NEXT_PUBLIC_LANDING_VIDEO_Mobile || '';

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;
}

type Landing3DBackgroundProps = {
  heroContentId?: string;
};

export function Landing3DBackground({
  heroContentId = 'heroContent',
}: Landing3DBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);


  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  
    window.scrollTo(0, 0);
  
    return () => {
      window.history.scrollRestoration = 'auto';
    };
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let currentTime = 0;
    let targetTime = 0;
    let rafId = 0;
    let seeking = false;
    let hasDrawn = false;
    let cancelled = false;

    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.loop = false;
    video.disableRemotePlayback = true;

    const mobile = isMobileViewport();
    // Clear previous sources, then attach device-appropriate files.
    while (video.firstChild) video.removeChild(video.firstChild);

    const mp4 = document.createElement('source');
    mp4.src = mobile ? VIDEO_MOBILE_MP4 : VIDEO_DESKTOP_MP4;
    mp4.type = 'video/mp4';
    video.appendChild(mp4);
    video.load();

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
      if (video!.readyState >= 2) drawVideo();
    }

    function drawVideo() {
      if (video!.readyState < 2 || !video!.videoWidth) return;
      const cw = window.innerWidth;
      const ch = window.innerHeight;
      if (cw < 10 || ch < 10) return;
      ctx!.clearRect(0, 0, cw, ch);
      const scale = Math.max(
        cw / video!.videoWidth,
        ch / video!.videoHeight
      );
      const w = video!.videoWidth * scale;
      const h = video!.videoHeight * scale;
      ctx!.drawImage(video!, (cw - w) / 2, (ch - h) / 2, w, h);
      hasDrawn = true;
    }

    function durationSec(): number {
      const d = video!.duration;
      return Number.isFinite(d) && d > 0 ? d : 0;
    }

    function onSeeked() {
      seeking = false;
      drawVideo();
    }

    function onLoadedData() {
      if (cancelled) return;
      // Freeze on first frame for reduced-motion, or warm the first paint.
      try {
        video!.currentTime = 0;
      } catch {
        /* ignore */
      }
      drawVideo();
    }

    function animate() {
      const dur = durationSec();
      if (!reducedMotion && dur > 0) {
        targetTime = getFrameScrubT() * dur;
        // Keep last frame reachable (duration is exclusive in some browsers).
        const maxT = Math.max(dur - SEEK_EPSILON, 0);
        if (targetTime > maxT) targetTime = maxT;

        currentTime += (targetTime - currentTime) * LERP_SPEED;

        if (
          !seeking &&
          video!.readyState >= 2 &&
          Math.abs(video!.currentTime - currentTime) >= SEEK_EPSILON
        ) {
          seeking = true;
          try {
            video!.currentTime = currentTime;
          } catch {
            seeking = false;
          }
        } else if (!seeking && hasDrawn) {
          // Still redraw occasionally so canvas stays sharp after resize.
        }
      }

      if (video!.readyState >= 2) drawVideo();

      const hero = document.getElementById(heroContentId);
      if (hero) {
        const pHero = reducedMotion || dur <= 0 ? 0 : getFrameScrubT();
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

    video.addEventListener('seeked', onSeeked);
    video.addEventListener('loadeddata', onLoadedData);
    window.addEventListener('resize', resize);
    resize();
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', resize);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('loadeddata', onLoadedData);
      cancelAnimationFrame(rafId);
      video.pause();
      video.removeAttribute('src');
      while (video.firstChild) video.removeChild(video.firstChild);
      video.load();
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
        <video
          ref={videoRef}
          className="pointer-events-none absolute h-px w-px opacity-0"
          muted
          playsInline
          preload="auto"
          aria-hidden
        />
      </div>
      <div className="landing-3d-vignette" aria-hidden />
    </>
  );
}
