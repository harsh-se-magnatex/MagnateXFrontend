'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  MediaCarousel,
  MediaVideo,
  VideoPreviewDialog,
} from '@/components/showcase/media';

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

/**
 * The left-hand panel on sign-in and sign-up: real example output, so a
 * visitor sees the quality before they create an account. Three videos,
 * one carousel, four photos — all for a demo brand.
 */
export function AuthShowcase() {
  const [preview, setPreview] = useState<number | null>(null);

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

      <p className="mt-8 mb-2 text-eyebrow">Videos · tap to preview</p>
      <div className="grid grid-cols-3 gap-2">
        {VIDEOS.map((video, i) => (
          <MediaVideo key={video.src} {...video} onOpen={() => setPreview(i)} />
        ))}
      </div>

      <p className="mt-8 mb-2 text-eyebrow">Carousel post</p>
      <MediaCarousel
        slides={CAROUSEL}
        label="Example carousel post"
        sizes="(min-width: 1024px) 30vw, 100vw"
        priority
      />

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

      <VideoPreviewDialog
        videos={VIDEOS}
        index={preview}
        onIndexChange={setPreview}
      />
    </div>
  );
}
