'use client';

import { useMemo } from 'react';
import {
  ExternalLink,
  Film,
  Grid3X3,
  Images,
  MessageCircle,
  Play,
} from 'lucide-react';
import { PlatformIcon } from '@/components/home/dashboard-ui';
import type { PreviewPlatform } from '@/components/landing/social-preview/constants';
import { platformThemeVars } from '@/components/landing/social-preview/platform-theme';
import { PostMediaPreview } from '@/components/shared/PostMediaPreview';
import { AnalyticsPostMediaThumbnail } from '@/components/shared/AnalyticsPostMediaCarousel';
import {
  collectPostImageUrls,
  isMultiImageAnalyticsPost,
} from '@/lib/analytics-post-media';
import { resolveSchedulableMediaPreview } from '@/lib/post-media-preview';

export type SocialAccountMedia = {
  id: string;
  caption: string;
  createdAt?: string;
  mediaUrl: string;
  mediaUrls?: string[];
  mediaType?: string;
  videoUrl?: string;
  permalink?: string;
};

type SocialAccountPreviewProps = {
  platform: PreviewPlatform;
  name: string;
  handle?: string;
  description?: string;
  followers?: number;
  following?: number;
  profileUrl?: string | null;
  media: SocialAccountMedia[];
};

const PLATFORM_COPY: Record<
  PreviewPlatform,
  { label: string; profileLabel: string; secondaryStat: string }
> = {
  facebook: {
    label: 'Facebook',
    profileLabel: 'Page',
    secondaryStat: 'media',
  },
  instagram: {
    label: 'Instagram',
    profileLabel: 'Profile',
    secondaryStat: 'following',
  },
  linkedin: {
    label: 'LinkedIn',
    profileLabel: 'Company page',
    secondaryStat: 'connections',
  },
};

function mediaKind(item: SocialAccountMedia): 'video' | 'carousel' | 'image' {
  const type = item.mediaType?.toLowerCase() ?? '';
  if (type.includes('video') || type.includes('reel')) return 'video';
  if ((item.mediaUrls?.length ?? 0) > 1 || type.includes('carousel')) {
    return 'carousel';
  }
  return 'image';
}

function initials(value: string): string {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'S'
  );
}

function mediaDate(value?: string): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);
}

function AccountMediaPreview({
  item,
}: {
  item: SocialAccountMedia;
}) {
  const imageUrls = collectPostImageUrls(item);
  const isCarousel =
    isMultiImageAnalyticsPost({
      ...item,
      type: item.mediaType,
    }) && imageUrls.length > 1;
  const kind = mediaKind(item);
  const preview = resolveSchedulableMediaPreview({
    mediaType: kind,
    imageUrl: imageUrls[0] ?? item.mediaUrl,
    videoUrl: item.videoUrl,
    videoPosterUrl: imageUrls[0] ?? item.mediaUrl,
  });

  if (isCarousel) {
    return (
      <AnalyticsPostMediaThumbnail
        urls={imageUrls}
        className="h-full w-full"
      />
    );
  }

  return (
    <PostMediaPreview
      preview={preview}
      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
      imageClassName="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
      videoClassName="h-full w-full object-cover"
      muted
      playsInline
      preload="metadata"
    />
  );
}

export function SocialAccountPreview({
  platform,
  name,
  handle,
  description,
  followers = 0,
  following = 0,
  profileUrl,
  media,
}: SocialAccountPreviewProps) {
  const copy = PLATFORM_COPY[platform];
  const visibleMedia = useMemo(
    () =>
      media
        .filter(
          (item) =>
            collectPostImageUrls(item).length > 0 ||
            Boolean(item.videoUrl?.trim())
        )
        .slice()
        .sort((a, b) => mediaDate(b.createdAt) - mediaDate(a.createdAt)),
    [media]
  );
  const displayHandle = handle?.trim().replace(/^@+/, '') || name;

  return (
    <section
      className="space-y-4"
      aria-labelledby={`${platform}-account-preview`}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tertiary">
            Live account view
          </p>
          <h2
            id={`${platform}-account-preview`}
            className="mt-1 text-xl font-semibold text-default"
          >
            My {copy.label}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-secondary">
            A current profile view built from the media synced from your{' '}
            {copy.label} account.
          </p>
        </div>
        {profileUrl ? (
          <a
            href={profileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-default bg-card px-3 py-2 text-sm font-medium text-default transition-colors hover:bg-element"
          >
            Open live {copy.profileLabel.toLowerCase()}
            <ExternalLink className="size-4" aria-hidden />
          </a>
        ) : null}
      </div>

      <div
        style={platformThemeVars(platform)}
        className="overflow-hidden rounded-3xl border border-default bg-[var(--pf-bg)] shadow-sm"
      >
        <header className="flex items-center justify-between border-b border-[var(--pf-border)] bg-[var(--pf-surface)] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <PlatformIcon platform={platform} className="size-8" />
            <span className="text-lg font-semibold text-[var(--pf-text)]">
              {copy.label}
            </span>
          </div>
          <span className="rounded-full bg-[var(--pf-surface-2)] px-3 py-1 text-xs font-medium text-[var(--pf-text-muted)]">
            Synced now
          </span>
        </header>

        <div className="mx-auto max-w-4xl">
          <div className="border-b border-[var(--pf-border)] bg-[var(--pf-surface)] px-4 py-6 sm:px-8 sm:py-8">
            <div className="flex items-center gap-4 sm:gap-7">
              <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-blue to-primary-purple text-xl font-bold text-white ring-4 ring-[var(--pf-surface-2)] sm:size-28 sm:text-2xl">
                {initials(name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="truncate text-xl font-semibold text-[var(--pf-text)] sm:text-2xl">
                    {name}
                  </h3>
                  <span className="rounded-full bg-[var(--pf-accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {copy.profileLabel}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-[var(--pf-text-muted)]">
                  {platform === 'instagram' ? '@' : ''}
                  {displayHandle}
                </p>
                {description ? (
                  <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-relaxed text-[var(--pf-text-muted)]">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-3 divide-x divide-[var(--pf-border)] rounded-2xl bg-[var(--pf-surface-2)] py-3 text-center">
              <div className="px-2">
                <dt className="text-[11px] text-[var(--pf-text-muted)]">
                  media
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-[var(--pf-text)]">
                  {formatCompact(visibleMedia.length)}
                </dd>
              </div>
              <div className="px-2">
                <dt className="text-[11px] text-[var(--pf-text-muted)]">
                  followers
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-[var(--pf-text)]">
                  {formatCompact(followers)}
                </dd>
              </div>
              <div className="px-2">
                <dt className="text-[11px] text-[var(--pf-text-muted)]">
                  {copy.secondaryStat}
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-[var(--pf-text)]">
                  {formatCompact(
                    platform === 'facebook' ? visibleMedia.length : following
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex items-center justify-center gap-2 border-b border-[var(--pf-border)] bg-[var(--pf-surface)] py-3 text-xs font-semibold uppercase tracking-widest text-[var(--pf-text)]">
            <Grid3X3 className="size-4" aria-hidden />
            All media
          </div>

          {visibleMedia.length > 0 ? (
            <ul className="grid grid-cols-2 gap-px bg-[var(--pf-border)] sm:grid-cols-3">
              {visibleMedia.map((item) => {
                const kind = mediaKind(item);
                const tile = (
                  <>
                    <AccountMediaPreview item={item} />
                    <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/55 p-1.5 text-white backdrop-blur-sm">
                      {kind === 'video' ? (
                        <Play
                          className="size-3.5 fill-current"
                          aria-label="Video"
                        />
                      ) : kind === 'carousel' ? (
                        <Images className="size-3.5" aria-label="Carousel" />
                      ) : (
                        <Film className="size-3.5" aria-label="Post" />
                      )}
                    </span>
                    {item.caption ? (
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8 text-left text-xs leading-snug text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        {item.caption}
                      </span>
                    ) : null}
                  </>
                );

                return (
                  <li
                    key={item.id}
                    className="relative aspect-square overflow-hidden bg-[var(--pf-surface-2)]"
                  >
                    {item.permalink ? (
                      <a
                        href={item.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="group block h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pf-accent)]"
                        aria-label={`Open ${copy.label} post${item.caption ? `: ${item.caption}` : ''}`}
                      >
                        {tile}
                      </a>
                    ) : (
                      <div className="group h-full w-full">{tile}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center bg-[var(--pf-surface)] px-6 text-center">
              <MessageCircle
                className="size-8 text-[var(--pf-text-muted)]"
                aria-hidden
              />
              <p className="mt-3 font-semibold text-[var(--pf-text)]">
                No media synced yet
              </p>
              <p className="mt-1 max-w-sm text-sm text-[var(--pf-text-muted)]">
                Refresh analytics after publishing media on {copy.label} to see
                the current account grid here.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
