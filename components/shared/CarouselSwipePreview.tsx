'use client';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';

export type CarouselSwipeSlide = {
  index?: number;
  imageUrl: string;
  headline?: string | null;
};

type CarouselSwipePreviewProps = {
  slides: CarouselSwipeSlide[];
  className?: string;
  imageClassName?: string;
  showCaptions?: boolean;
  onImageClick?: (url: string, alt?: string) => void;
};

export function CarouselSwipePreview({
  slides,
  className,
  imageClassName,
  showCaptions = false,
  onImageClick,
}: CarouselSwipePreviewProps) {
  const valid = slides.filter((s) => String(s.imageUrl ?? '').trim());
  if (valid.length === 0) return null;

  return (
    <Carousel className={cn('relative w-full', className)}>
      <CarouselContent>
        {valid.map((slide, i) => {
          const url = slide.imageUrl.trim();
          const label =
            slide.headline?.trim() ||
            `Slide ${slide.index ?? i + 1}`;
          const body = (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={label}
              className={cn(
                'w-full aspect-[4/5] object-cover bg-muted',
                imageClassName
              )}
              loading="lazy"
            />
          );
          return (
            <CarouselItem key={`${slide.index ?? i}-${url.slice(-24)}`}>
              <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
                {onImageClick ? (
                  <button
                    type="button"
                    className="block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => onImageClick(url, label)}
                    aria-label={`Open ${label}`}
                  >
                    {body}
                  </button>
                ) : (
                  body
                )}
                {showCaptions ? (
                  <div className="p-2.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Slide {slide.index ?? i + 1}
                    </span>
                    {slide.headline?.trim() ? (
                      <p className="mt-0.5 line-clamp-2 text-foreground/90">
                        {slide.headline.trim()}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      {valid.length > 1 ? (
        <>
          {/*
            Side rails center the controls with flex instead of translateY.
            That keeps the visual and hit-target aligned (top/bottom both clickable).
            pointer-events-none on the rail so Embla can still receive swipes beside the button.
          */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-30 flex w-14 items-center justify-center">
            <CarouselPrevious
              size="icon"
              className="pointer-events-auto static inset-auto top-auto left-auto size-10 translate-x-0 translate-y-0 bg-background/95 shadow-md backdrop-blur-sm"
            />
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 z-30 flex w-14 items-center justify-center">
            <CarouselNext
              size="icon"
              className="pointer-events-auto static inset-auto top-auto right-auto size-10 translate-x-0 translate-y-0 bg-background/95 shadow-md backdrop-blur-sm"
            />
          </div>
        </>
      ) : null}
    </Carousel>
  );
}
