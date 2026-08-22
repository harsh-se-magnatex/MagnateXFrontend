'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Images,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  DEFAULT_SEVEN_VISUAL_STYLE,
  SEVEN_VISUAL_STYLES,
  type SevenVisual,
} from '@/components/landing/seven-visuals/seven-visuals-data';

export function SevenVisualsEmbed() {
  const [styleId, setStyleId] = useState(DEFAULT_SEVEN_VISUAL_STYLE);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const activeStyle = useMemo(
    () => SEVEN_VISUAL_STYLES.find((style) => style.id === styleId) ?? SEVEN_VISUAL_STYLES[0],
    [styleId]
  );
  const selectedVisual = selectedIndex === null ? null : activeStyle.visuals[selectedIndex];

  useEffect(() => {
    let cancelled = false;
    setCaptions({});
    Promise.all(
      activeStyle.visuals.map(async (visual) => {
        const response = await fetch(visual.captionFile);
        return [visual.id, response.ok ? (await response.text()).trim() : ''] as const;
      })
    )
      .then((entries) => {
        if (!cancelled) setCaptions(Object.fromEntries(entries));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [activeStyle]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (event.key === 'Escape') setSelectedIndex(null);
      if (event.key === 'ArrowLeft') setSelectedIndex((index) => (index === null ? null : Math.max(0, index - 1)));
      if (event.key === 'ArrowRight') setSelectedIndex((index) => (index === null ? null : Math.min(activeStyle.visuals.length - 1, index + 1)));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeStyle.visuals.length, selectedIndex]);

  const chooseStyle = (nextStyleId: string) => {
    setStyleId(nextStyleId);
    setSelectedIndex(null);
    setCarouselIndex(0);
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-2">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Choose a page style
        </p>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {SEVEN_VISUAL_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => chooseStyle(style.id)}
              className={cn(
                'min-w-[145px] rounded-2xl border px-4 py-3 text-left transition-all duration-200 sm:min-w-[160px]',
                style.id === styleId
                  ? 'border-primary-purple/50 bg-card/90 shadow-lg shadow-primary-purple/15 ring-1 ring-primary-purple/25'
                  : 'border-border/50 bg-card/40 hover:border-border hover:bg-card/70'
              )}
            >
              <p className="text-sm font-bold text-foreground">{style.label}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{style.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-8 overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-2xl shadow-primary-purple/10 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-4 py-4 sm:px-6">
          <div>
            <p className="text-lg font-bold text-foreground">{activeStyle.label} page preview</p>
            <p className="text-sm text-muted-foreground">Seven visuals, arranged as one cohesive page style.</p>
          </div>
          <span className="rounded-full border border-primary-purple/30 bg-primary-purple/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-purple">
            SocioGenie
          </span>
        </div>

        <div className="bg-neutral-50 px-3 py-5 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
            <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-4 sm:px-6">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-purple to-primary-blue ring-4 ring-primary-purple/10" />
              <div className="min-w-0">
                <p className="font-bold text-neutral-900">Your brand page</p>
                <p className="text-xs text-neutral-500">@yourbrand · {activeStyle.label} style</p>
              </div>
              <div className="ml-auto hidden gap-6 text-center text-xs text-neutral-500 sm:flex">
                <span><strong className="block text-sm text-neutral-900">7</strong>visuals</span>
                <span><strong className="block text-sm text-neutral-900">1</strong>style</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 bg-neutral-100 sm:grid-cols-4">
              {activeStyle.visuals.map((visual, index) => (
                <VisualTile
                  key={visual.id}
                  visual={visual}
                  onSelect={() => {
                    setSelectedIndex(index);
                    setCarouselIndex(0);
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {selectedVisual && selectedIndex !== null && (
            <VisualDetail
              visual={selectedVisual}
              index={selectedIndex}
              total={activeStyle.visuals.length}
              caption={captions[selectedVisual.id]}
              carouselIndex={carouselIndex}
              onCarouselChange={setCarouselIndex}
              onClose={() => setSelectedIndex(null)}
              onPrevious={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
              onNext={() => setSelectedIndex(Math.min(activeStyle.visuals.length - 1, selectedIndex + 1))}
            />
          )}
        </AnimatePresence>
      </div>

      <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground font-(--font-dm-sans)">
        Select a visual to open its full preview. Use the arrows or your keyboard to browse the complete page style.
      </p>
    </div>
  );
}

function VisualTile({ visual, onSelect }: { visual: SevenVisual; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative aspect-square overflow-hidden bg-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-purple"
      aria-label={`Open ${visual.alt}`}
    >
      <Image src={visual.image} alt={visual.alt} fill className="object-cover transition duration-300 group-hover:scale-105 group-hover:brightness-75" sizes="(max-width: 640px) 50vw, 180px" />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition group-hover:opacity-100" />
      {visual.carousel && (
        <span className="absolute right-2 top-2 rounded-md bg-black/55 p-1.5 text-white backdrop-blur-sm">
          <Images className="h-3.5 w-3.5" aria-hidden />
        </span>
      )}
    </button>
  );
}

function VisualDetail({
  visual,
  index,
  total,
  caption,
  carouselIndex,
  onCarouselChange,
  onClose,
  onPrevious,
  onNext,
}: {
  visual: SevenVisual;
  index: number;
  total: number;
  caption?: string;
  carouselIndex: number;
  onCarouselChange: (index: number) => void;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const slides = visual.carousel ?? [visual.image];
  const currentImage = slides[carouselIndex] ?? slides[0];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-label={visual.alt} onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16 }} className="relative flex max-h-[90%] w-[min(88%,860px)] max-w-none flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <p className="text-sm font-semibold text-neutral-900">{index + 1} / {total}</p>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900" aria-label="Close preview"><X className="h-5 w-5" /></button>
        </div>
        <div className="relative min-h-0 flex-1 overflow-y-auto bg-neutral-100">
          <div className="relative mx-auto aspect-[4/5] max-h-[min(62vh,720px)] w-full max-w-[min(72vw,600px)]">
            <Image src={currentImage} alt={visual.alt} fill className="object-contain" sizes="(max-width: 768px) 100vw, 680px" priority />
            {slides.length > 1 && (
              <>
                <button type="button" onClick={() => onCarouselChange((carouselIndex - 1 + slides.length) % slides.length)} className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70" aria-label="Previous carousel slide"><ChevronLeft className="h-5 w-5" /></button>
                <button type="button" onClick={() => onCarouselChange((carouselIndex + 1) % slides.length)} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70" aria-label="Next carousel slide"><ChevronRight className="h-5 w-5" /></button>
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/40 px-2 py-1">
                  {slides.map((_, slideIndex) => <button key={slideIndex} type="button" onClick={() => onCarouselChange(slideIndex)} className={cn('h-1.5 w-1.5 rounded-full', slideIndex === carouselIndex ? 'bg-white' : 'bg-white/45')} aria-label={`Go to slide ${slideIndex + 1}`} />)}
                </div>
              </>
            )}
          </div>
          <div className="bg-white px-5 py-5 sm:px-8">
            <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">{caption || 'Loading caption…'}</p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3">
          <button type="button" onClick={onPrevious} disabled={index === 0} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /> Previous</button>
          <button type="button" onClick={onNext} disabled={index === total - 1} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-30">Next <ChevronRight className="h-4 w-4" /></button>
        </div>
      </motion.div>
    </motion.div>
  );
}
