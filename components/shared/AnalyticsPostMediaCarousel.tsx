'use client';

import { Images } from 'lucide-react';
import { CarouselSwipePreview } from '@/components/shared/CarouselSwipePreview';
import { cn } from '@/lib/utils';

type AnalyticsPostMediaThumbnailProps = {
  urls: string[];
  className?: string;
};

/** Static stacked cover for post cards — opens full carousel in the dialog. */
export function AnalyticsPostMediaThumbnail({
  urls,
  className,
}: AnalyticsPostMediaThumbnailProps) {
  const valid = urls.filter((url) => url.trim());
  const cover = valid[0];
  if (!cover) return null;

  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-muted', className)}>
      {valid.length > 1 ? (
        <>
          <div
            className="absolute inset-y-2 right-2 left-4 rounded-lg bg-muted-foreground/15 ring-1 ring-border/40"
            aria-hidden
          />
          <div
            className="absolute inset-y-1 right-1 left-2 rounded-lg bg-muted-foreground/10 ring-1 ring-border/30"
            aria-hidden
          />
        </>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cover}
        alt=""
        className="relative z-10 h-full w-full object-cover"
        loading="lazy"
      />
      {valid.length > 1 ? (
        <span
          className="absolute right-1.5 top-1.5 z-20 inline-flex items-center gap-0.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm"
          aria-hidden
        >
          <Images className="h-3 w-3" />
          {valid.length}
        </span>
      ) : null}
    </div>
  );
}

type AnalyticsPostMediaCarouselProps = {
  urls: string[];
  className?: string;
};

/** Full swipeable carousel for the expanded post dialog. */
export function AnalyticsPostMediaCarousel({
  urls,
  className,
}: AnalyticsPostMediaCarouselProps) {
  const valid = urls.filter((url) => url.trim());
  if (valid.length === 0) return null;

  const slides = valid.map((imageUrl, index) => ({
    index: index + 1,
    imageUrl,
  }));

  return (
    <CarouselSwipePreview
      slides={slides}
      className={cn('w-full', className)}
      imageClassName="aspect-auto h-auto max-h-[min(70vh,720px)] w-full object-contain bg-muted/30"
      showCaptions
    />
  );
}
