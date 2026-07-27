'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ShowcasePost } from '@/components/landing/social-preview/showcase-data';
import { getPostThumbnailUrl } from '@/components/landing/social-preview/showcase-data';

type ShowcaseMediaProps = {
  post: ShowcasePost;
  className?: string;
  /** Aspect / object-fit wrapper classes for the media area */
  mediaClassName?: string;
  /** When true, video shows controls and is not muted autoplay-only */
  playVideo?: boolean;
  /**
   * When false, carousel renders a still (no nested nav buttons).
   * Use inside outer &lt;button&gt; click targets (feed thumbnails).
   */
  interactive?: boolean;
  sizes?: string;
  alt?: string;
};

export function ShowcaseMedia({
  post,
  className,
  mediaClassName = 'object-cover',
  playVideo = false,
  interactive = true,
  sizes = '(max-width: 768px) 100vw, 560px',
  alt = 'Post media',
}: ShowcaseMediaProps) {
  if (post.mediaType === 'video' && post.videoUrl && playVideo) {
    return (
      <div className={cn('relative h-full w-full bg-neutral-900', className)}>
        <video
          src={post.videoUrl}
          poster={post.posterUrl || getPostThumbnailUrl(post)}
          className={cn('h-full w-full', mediaClassName)}
          controls
          playsInline
          preload="metadata"
        />
      </div>
    );
  }

  if (post.mediaType === 'carousel' && post.carouselSlides?.length) {
    if (!interactive) {
      const src = getPostThumbnailUrl(post);
      return (
        <div className={cn('relative h-full w-full bg-neutral-100', className)}>
          <Image
            src={src}
            alt={alt}
            fill
            className={mediaClassName}
            sizes={sizes}
          />
        </div>
      );
    }
    return (
      <ShowcaseCarousel
        slides={post.carouselSlides.map((s) => s.imageUrl)}
        className={className}
        mediaClassName={mediaClassName}
        sizes={sizes}
        alt={alt}
      />
    );
  }

  const src = getPostThumbnailUrl(post);
  return (
    <div className={cn('relative h-full w-full bg-neutral-100', className)}>
      <Image
        src={src}
        alt={alt}
        fill
        className={mediaClassName}
        sizes={sizes}
      />
    </div>
  );
}

function ShowcaseCarousel({
  slides,
  className,
  mediaClassName,
  sizes,
  alt,
}: {
  slides: string[];
  className?: string;
  mediaClassName?: string;
  sizes?: string;
  alt?: string;
}) {
  const [index, setIndex] = useState(0);
  const total = slides.length;
  const current = slides[index] ?? slides[0];

  const go = (dir: -1 | 1) => {
    setIndex((i) => (i + dir + total) % total);
  };

  return (
    <div className={cn('relative h-full w-full bg-neutral-100', className)}>
      <Image
        src={current}
        alt={`${alt} — slide ${index + 1}`}
        fill
        className={mediaClassName}
        sizes={sizes}
      />
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/55"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/55"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {slides.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 w-1.5 rounded-full transition-colors',
                  i === index ? 'bg-white' : 'bg-white/45'
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
