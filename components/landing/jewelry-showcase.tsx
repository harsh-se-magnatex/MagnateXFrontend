'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Marquee } from '@/components/landing/motion/marquee';
import {
  MediaCarousel,
  MediaVideo,
  VideoPreviewDialog,
  type Slide,
} from '@/components/showcase/media';
import '@/components/landing/landing.css';

/**
 * Two source folders, both for the demo brand SocioGenie.Jewel:
 * - the top level of `/showcase/jewelry`: marketing visuals, carousels,
 *   Create Post / product samples and two UGC videos;
 * - the subfolders (`create`, `product`, `campaign`, `occasion`,
 *   `ai-manager`, `videos`): the full media-library export, grouped by the
 *   tool that made each piece.
 */
const BASE = '/showcase/jewelry';

type Tile = Slide & { label?: string };

/** `count` numbered files in one export subfolder: 01.webp, 02.webp… */
function series(folder: string, count: number, alt: string): Tile[] {
  return Array.from({ length: count }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return { src: `${BASE}/${folder}/${n}.webp`, alt: `${alt} ${i + 1}` };
  });
}

const MARKETING_VISUALS: Tile[] = [
  {
    src: `${BASE}/visual-billboard.webp`,
    label: 'Billboard',
    alt: 'Emerald necklace set on a roadside billboard, “Everyday Elegance, Emerald Bright”',
  },
  {
    src: `${BASE}/visual-transit-lightbox.webp`,
    label: 'Transit lightbox',
    alt: 'Jewelry ad in a backlit transit lightbox',
  },
  {
    src: `${BASE}/visual-magazine.webp`,
    label: 'Magazine spread',
    alt: 'Jewelry featured on a magazine front page',
  },
  {
    src: `${BASE}/visual-storefront.webp`,
    label: 'Storefront window',
    alt: 'Jewelry displayed as the hero of a shop window',
  },
  {
    src: `${BASE}/visual-scale-stunt.webp`,
    label: 'Scale stunt',
    alt: 'Jewelry shown at giant scale in a city setting',
  },
];

const CREATE_POSTS: Tile[] = [
  ...[1, 2, 3].map((n) => ({
    src: `${BASE}/create-post-${n}.webp`,
    alt: `Jewelry Create Post sample ${n}`,
  })),
  ...series('create', 33, 'Jewelry post made with Create Post'),
];

const PRODUCT_POSTS: Tile[] = [
  {
    src: `${BASE}/product-advert.webp`,
    alt: 'Pearl and emerald layered necklace product advert',
  },
  {
    src: `${BASE}/product-social-post.webp`,
    alt: 'Product post with copy built into the design',
  },
  ...series('product', 85, 'Jewelry product post'),
];

const CAMPAIGN_POSTS = series('campaign', 59, 'Jewelry campaign post');

const AI_MANAGER_AND_OCCASION: Tile[] = [
  ...series('ai-manager', 3, 'Jewelry post planned by AI Manager').map((t) => ({
    ...t,
    label: 'AI Manager',
  })),
  ...series('occasion', 3, 'Jewelry occasion post').map((t) => ({
    ...t,
    label: 'Occasion post',
  })),
];

const GOLD_CAROUSEL: Slide[] = [1, 2, 3, 4].map((n) => ({
  src: `${BASE}/carousel-gold-${n}.webp`,
  alt: `Gold collection carousel, slide ${n} of 4`,
}));

const ROSE_GOLD_CAROUSEL: Slide[] = [1, 2, 3, 4].map((n) => ({
  src: `${BASE}/carousel-rose-gold-${n}.webp`,
  alt: `Rose gold collection carousel, slide ${n} of 4`,
}));

type Video = { src: string; poster: string; label: string };

const FEATURED_VIDEOS: Video[] = [1, 2].map((n) => ({
  src: `${BASE}/ugc-${n}.mp4`,
  poster: `${BASE}/ugc-${n}-poster.jpg`,
  label: 'UGC video',
}));

/** The export's 15 videos, in file order; 02, 03 and 12 are UGC. */
const UGC = new Set([2, 3, 12]);
const LIBRARY_VIDEOS: Video[] = Array.from({ length: 15 }, (_, i) => {
  const n = i + 1;
  const id = String(n).padStart(2, '0');
  return {
    src: `${BASE}/videos/${id}.mp4`,
    poster: `${BASE}/videos/${id}-poster.jpg`,
    label: UGC.has(n) ? 'UGC video' : 'Video',
  };
});

const ALL_VIDEOS = [...FEATURED_VIDEOS, ...LIBRARY_VIDEOS];

function TileCard({ tile }: { tile: Tile }) {
  return (
    <figure className="relative aspect-[4/5] w-48 overflow-hidden rounded-2xl border border-default bg-element sm:w-56">
      <Image
        src={tile.src}
        alt={tile.alt}
        fill
        sizes="224px"
        className="object-cover"
      />
      {tile.label ? (
        <figcaption className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-medium text-white">
          {tile.label}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** One labelled band. Speed scales with length so every band moves at the
 *  same pace, however many tiles it holds. */
function Band({
  title,
  tiles,
  reverse,
}: {
  title: string;
  tiles: Tile[];
  reverse?: boolean;
}) {
  return (
    <div>
      <p className="mb-3 text-center text-eyebrow">{title}</p>
      <Marquee
        label={`${title} for a jewelry brand`}
        reverse={reverse}
        duration={tiles.length * 4}
        minItems={14}
        pauseOnHover={false}
        items={tiles.map((tile) => (
          <TileCard key={tile.src} tile={tile} />
        ))}
      />
    </div>
  );
}

function half<T>(items: T[]): [T[], T[]] {
  const mid = Math.ceil(items.length / 2);
  return [items.slice(0, mid), items.slice(mid)];
}

/**
 * The How It Looks quality example for the jewelry niche: every photo and
 * video from the two SocioGenie.Jewel folders. Photos rotate in bands grouped
 * by the tool that made them; carousels and videos sit in grids below, and
 * videos only load and play while on screen.
 */
export function JewelryShowcase() {
  // One preview for every video on the page; arrows step through all 17.
  const [preview, setPreview] = useState<number | null>(null);

  const [productA, productB] = half(PRODUCT_POSTS);
  const [campaignA, campaignB] = half(CAMPAIGN_POSTS);

  return (
    <div>
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-eyebrow text-[var(--brand-violet-text)]">
          Quality example · Jewelry
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-secondary">
          Everything below was made by SocioGenie for SocioGenie.Jewel, a demo
          brand.
        </p>
      </div>

      {/* Full-bleed bands: break out of the page's max-width container. */}
      <div className="relative left-1/2 mt-10 flex w-screen -translate-x-1/2 flex-col gap-10">
        <Band title="Marketing visuals" tiles={MARKETING_VISUALS} />
        <Band title="Create Post" tiles={CREATE_POSTS} reverse />
        <Band title="Product Posts" tiles={productA} />
        <Band title="Product Posts" tiles={productB} reverse />
        <Band title="Campaigns" tiles={campaignA} />
        <Band title="Campaigns" tiles={campaignB} reverse />
        <Band
          title="AI Manager & occasion posts"
          tiles={AI_MANAGER_AND_OCCASION}
        />
      </div>

      <div className="mt-16 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div>
          <p className="mb-2 text-eyebrow">Carousel · Gold</p>
          <MediaCarousel
            slides={GOLD_CAROUSEL}
            label="Gold collection carousel"
            sizes="(min-width: 1024px) 25vw, 50vw"
          />
        </div>
        <div>
          <p className="mb-2 text-eyebrow">Carousel · Rose gold</p>
          <MediaCarousel
            slides={ROSE_GOLD_CAROUSEL}
            label="Rose gold collection carousel"
            sizes="(min-width: 1024px) 25vw, 50vw"
            interval={4100}
          />
        </div>
        {FEATURED_VIDEOS.map((video, i) => (
          <div key={video.src}>
            <p className="mb-2 text-eyebrow">Video · tap to preview</p>
            <MediaVideo
              {...video}
              className="aspect-[4/5]"
              onOpen={() => setPreview(i)}
            />
          </div>
        ))}
      </div>

      <p className="mt-12 mb-3 text-eyebrow">Videos · tap to preview</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {LIBRARY_VIDEOS.map((video, i) => (
          <MediaVideo
            key={video.src}
            {...video}
            onOpen={() => setPreview(FEATURED_VIDEOS.length + i)}
          />
        ))}
      </div>

      <VideoPreviewDialog
        videos={ALL_VIDEOS}
        index={preview}
        onIndexChange={setPreview}
      />
    </div>
  );
}
