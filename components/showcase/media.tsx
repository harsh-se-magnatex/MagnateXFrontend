'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Play } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type Slide = { src: string; alt: string };

/**
 * An Instagram-style carousel that loops forever: it advances on its own,
 * a manual pick just restarts the timer, and hover pauses it only while the
 * pointer is on it. Under reduced motion it never auto-advances.
 */
export function MediaCarousel({
  slides,
  label,
  sizes,
  interval = 3500,
  priority = false,
}: {
  slides: Slide[];
  label: string;
  sizes: string;
  interval?: number;
  /** Eager-load the first slide when the carousel is above the fold. */
  priority?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (hovered) return;
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (reduce) return;
    const id = window.setTimeout(
      () => setIndex((i) => (i + 1) % slides.length),
      interval
    );
    return () => window.clearTimeout(id);
  }, [index, hovered, interval, slides.length]);

  const go = (next: number) => {
    setIndex((next + slides.length) % slides.length);
  };

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-default bg-element"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
    >
      <div
        className="flex transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.src}
            className="relative aspect-[4/5] w-full shrink-0"
            aria-hidden={i !== index}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              sizes={sizes}
              className="object-cover"
              priority={priority && i === 0}
            />
          </div>
        ))}
      </div>

      <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 font-mono text-[11px] text-white">
        {index + 1}/{slides.length}
      </span>

      <button
        type="button"
        onClick={() => go(index - 1)}
        className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100"
        aria-label="Previous slide"
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => go(index + 1)}
        className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100"
        aria-label="Next slide"
      >
        <ChevronRight className="size-4" />
      </button>

      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
        {slides.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => go(i)}
            className={cn(
              'h-1.5 rounded-full transition-[width,background-color] duration-300',
              i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
            )}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * A muted, looping video tile that only loads and plays while on screen, so
 * a hidden or scrolled-away video never downloads. Tapping it calls
 * `onOpen`, which shows the full preview with sound and controls.
 */
export function MediaVideo({
  src,
  poster,
  label,
  onOpen,
  className,
}: {
  src: string;
  poster: string;
  label: string;
  onOpen: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group relative block w-full overflow-hidden rounded-xl border border-default bg-element text-left',
        className ?? 'aspect-square'
      )}
      aria-label={`Preview ${label}`}
    >
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="none"
        className="h-full w-full object-cover"
      />
      {/* Hover cue: a play button over a light scrim. */}
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-150 group-hover:bg-black/25">
        <span className="flex size-11 scale-90 items-center justify-center rounded-full bg-white/90 text-black opacity-0 shadow-lg transition-[opacity,transform] duration-150 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100">
          <Play className="ml-0.5 size-5 fill-current" />
        </span>
      </span>
      <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
        {label}
      </span>
      <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-black/55 text-white">
        <Maximize2 className="size-3" />
      </span>
    </button>
  );
}

export type PreviewVideo = { src: string; poster: string; label: string };

/**
 * Full-size preview for a video tile: plays from the start with sound and
 * native controls. Esc, the close button or a click outside dismisses it.
 * Arrow buttons step through `videos` when more than one is passed.
 */
export function VideoPreviewDialog({
  videos,
  index,
  onIndexChange,
}: {
  videos: PreviewVideo[];
  /** The open video, or null when closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
}) {
  const video = index === null ? null : videos[index];
  const many = videos.length > 1;
  const step = (delta: number) => {
    if (index === null) return;
    onIndexChange((index + delta + videos.length) % videos.length);
  };

  return (
    <Dialog
      open={video !== null}
      onOpenChange={(open) => {
        if (!open) onIndexChange(null);
      }}
    >
      <DialogContent
        className="gap-3 p-3 sm:max-w-xl"
        onKeyDown={(e) => {
          if (!many) return;
          if (e.key === 'ArrowRight') step(1);
          if (e.key === 'ArrowLeft') step(-1);
        }}
      >
        <DialogTitle className="px-1 pr-10 text-sm">
          {video?.label}
          {many && index !== null ? (
            <span className="ml-2 font-mono text-xs text-tertiary">
              {index + 1}/{videos.length}
            </span>
          ) : null}
        </DialogTitle>
        {video ? (
          <div className="relative">
            <video
              key={video.src}
              src={video.src}
              poster={video.poster}
              controls
              autoPlay
              playsInline
              className="max-h-[75svh] w-full rounded-xl bg-black object-contain"
            />
            {many ? (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white"
                  aria-label="Previous video"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white"
                  aria-label="Next video"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
