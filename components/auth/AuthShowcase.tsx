'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

const BASE = '/showcase/jewel';

const CAROUSEL = [
  {
    src: `${BASE}/carousel-1.jpg`,
    alt: 'Carousel slide 1: necklace and earrings set, “Let your next piece tell the right story”',
  },
  {
    src: `${BASE}/carousel-2.jpg`,
    alt: 'Carousel slide 2: model wearing the set, “Every stone, sourced with care”',
  },
  {
    src: `${BASE}/carousel-3.jpg`,
    alt: 'Carousel slide 3: close-up of the necklace, “But where does it all begin?”',
  },
  {
    src: `${BASE}/carousel-4.jpg`,
    alt: 'Carousel slide 4: the necklace and earrings on silk',
  },
];

const VIDEOS = [
  {
    src: `${BASE}/video-1.mp4`,
    poster: `${BASE}/video-1-poster.jpg`,
    label: 'Product reel',
  },
  {
    src: `${BASE}/video-2.mp4`,
    poster: `${BASE}/video-2-poster.jpg`,
    label: 'UGC video',
  },
  {
    src: `${BASE}/video-3.mp4`,
    poster: `${BASE}/video-3-poster.jpg`,
    label: 'UGC video',
  },
];

const PHOTOS = [
  {
    src: `${BASE}/photo-1.jpg`,
    alt: 'Bridal choker on a display bust, “Crafted for generations”',
  },
  { src: `${BASE}/photo-2.jpg`, alt: 'Model wearing the bridal choker' },
  { src: `${BASE}/photo-3.jpg`, alt: 'Solitaire ring on soft linen' },
  {
    src: `${BASE}/photo-4.jpg`,
    alt: 'Ring held between fingers, with dried petals',
  },
];

/** An Instagram-style carousel: swipe-free, arrow and dot driven, and it
 *  advances on its own until the visitor interacts with it. */
function ShowcaseCarousel() {
  const [index, setIndex] = useState(0);
  const [touched, setTouched] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (touched || hovered) return;
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (reduce) return;
    const id = window.setTimeout(
      () => setIndex((i) => (i + 1) % CAROUSEL.length),
      3500
    );
    return () => window.clearTimeout(id);
  }, [index, touched, hovered]);

  const go = (next: number) => {
    setTouched(true);
    setIndex((next + CAROUSEL.length) % CAROUSEL.length);
  };

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-default bg-element"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Example carousel post"
    >
      <div
        className="flex transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {CAROUSEL.map((slide, i) => (
          <div
            key={slide.src}
            className="relative aspect-[4/5] w-full shrink-0"
            aria-hidden={i !== index}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              sizes="(min-width: 1024px) 30vw, 100vw"
              className="object-cover"
              priority={i === 0}
            />
          </div>
        ))}
      </div>

      <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 font-mono text-[11px] text-white">
        {index + 1}/{CAROUSEL.length}
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
        {CAROUSEL.map((slide, i) => (
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
 * A muted, looping video that only loads and plays while it is on screen.
 * The panel is hidden on mobile, so phones never download these at all.
 * Clicking toggles sound; `onUnmute` lets the parent keep only one audible.
 */
function ShowcaseVideo({
  src,
  poster,
  label,
  audible,
  onToggleSound,
}: {
  src: string;
  poster: string;
  label: string;
  audible: boolean;
  onToggleSound: () => void;
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

  useEffect(() => {
    if (ref.current) ref.current.muted = !audible;
  }, [audible]);

  return (
    <button
      type="button"
      onClick={onToggleSound}
      className="group relative block aspect-square w-full overflow-hidden rounded-xl border border-default bg-element text-left"
      aria-label={`${label}: ${audible ? 'mute' : 'play with sound'}`}
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
      <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
        {label}
      </span>
      <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-black/55 text-white">
        {audible ? (
          <Volume2 className="size-3.5" />
        ) : (
          <VolumeX className="size-3.5" />
        )}
      </span>
    </button>
  );
}

/**
 * The left-hand panel on sign-in and sign-up: real example output, so a
 * visitor sees the quality before they create an account. Three videos,
 * one carousel, four photos — all for a demo brand.
 */
export function AuthShowcase() {
  const [audibleIndex, setAudibleIndex] = useState<number | null>(null);

  return (
    <div className="mx-auto w-full max-w-xl px-8 py-10 xl:px-10">
      <p className="text-eyebrow text-[var(--brand-violet-text)]">
        Made with SocioGenie
      </p>
      <h2 className="mt-3 text-display-4 text-default">
        See the quality before you start.
      </h2>
      <p className="mt-2 text-sm text-secondary">
        Example posts for SocioGenie.Jewel, a demo brand.
      </p>

      <p className="mt-8 mb-2 text-eyebrow">Videos · tap for sound</p>
      <div className="grid grid-cols-3 gap-2">
        {VIDEOS.map((video, i) => (
          <ShowcaseVideo
            key={video.src}
            {...video}
            audible={audibleIndex === i}
            onToggleSound={() =>
              setAudibleIndex((current) => (current === i ? null : i))
            }
          />
        ))}
      </div>

      <p className="mt-8 mb-2 text-eyebrow">Carousel post</p>
      <ShowcaseCarousel />

      <p className="mt-8 mb-2 text-eyebrow">Photos</p>
      <div className="grid grid-cols-2 gap-2">
        {PHOTOS.map((photo) => (
          <div
            key={photo.src}
            className="relative aspect-[4/5] overflow-hidden rounded-xl border border-default bg-element"
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(min-width: 1024px) 15vw, 50vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
