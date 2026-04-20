'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import {
  CalendarCheck2,
  CloudLightning,
  ImageIcon,
  ImageOff,
  Loader2,
  Package,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FirestoreTimestamp } from '@/app/(main)/_components/types';
import {
  getGeneratedMediaLibraryApi,
  type GeneratedMediaLibraryItem,
  type GeneratedMediaSource,
  type MediaSource,
} from '@/src/service/api/generated-media-library.service';
import { Button } from '@/components/ui/button';
import { DownloadPngButton } from '@/components/download-png-button';

const SOURCE_OPTIONS: {
  value: 'all' | GeneratedMediaSource;
  label: string;
  description: string;
}[] = [
  {
    value: 'all',
    label: 'All',
    description: 'Everything you have generated',
  },
  {
    value: 'instant-generation',
    label: 'Quick create',
    description: 'Instant-generation studio',
  },
  {
    value: 'batchGeneratedPosts',
    label: 'Batch workflow',
    description: 'AI engine batch dates',
  },
  {
    value: 'productadvert',
    label: 'Product ads',
    description: 'Product advert tool',
  },
  {
    value: 'eventPosts',
    label: 'Event posts',
    description: 'Event post tool',
  },
];

function sourceBadge(collection: MediaSource) {
  switch (collection) {
    case 'instant-generation':
      return {
        label: 'Quick create',
        Icon: Sparkles,
        className: 'bg-violet-500/15 text-violet-700 dark:text-violet-200',
      };
    case 'batchGeneratedPosts':
      return {
        label: 'Batch',
        Icon: CloudLightning,
        className: 'bg-sky-500/15 text-sky-800 dark:text-sky-200',
      };
    case 'productadvert':
      return {
        label: 'Product ad',
        Icon: Package,
        className: 'bg-amber-500/15 text-amber-900 dark:text-amber-100',
      };
    case 'eventPosts':
      return {
        label: 'Event post',
        Icon: CalendarCheck2,
        className: 'bg-green-500/15 text-green-900 dark:text-green-100',
      };
    default:
      return {
        label: collection,
        Icon: ImageIcon,
        className: 'bg-muted text-muted-foreground',
      };
  }
}

function formatWhen(ts: FirestoreTimestamp | string | null | undefined) {
  if (ts == null) return '—';
  try {
    let d: Date;
    if (typeof ts === 'string') {
      d = parseISO(ts);
    } else if (
      typeof ts === 'object' &&
      ts !== null &&
      typeof ts._seconds === 'number'
    ) {
      d = new Date(ts._seconds * 1000);
    } else {
      return '—';
    }
    if (Number.isNaN(d.getTime())) return '—';
    return format(d, 'MMM d, yyyy · h:mm a');
  } catch {
    return '—';
  }
}

function shortRef(id: string, head = 6, tail = 4) {
  if (id.length <= head + tail + 1) return id;
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}

export default function MediaLibraryPage() {
  const [source, setSource] = useState<'all' | GeneratedMediaSource>('all');
  const [items, setItems] = useState<GeneratedMediaLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setItems([]);
    setNextCursor(null);
    setHasMore(false);
    try {
      const data = await getGeneratedMediaLibraryApi({ source });
      setItems(data?.items ?? []);
      setNextCursor(data?.nextCursor ?? null);
      setHasMore(data?.hasMore ?? false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your library.');
    } finally {
      setLoading(false);
    }
  }, [source]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await getGeneratedMediaLibraryApi({
        source,
        cursor: nextCursor,
      });
      setItems((prev) => [...prev, ...(data?.items ?? [])]);
      setNextCursor(data?.nextCursor ?? null);
      setHasMore(data?.hasMore ?? false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load more items.');
    } finally {
      setLoadingMore(false);
    }
  }, [source, nextCursor, hasMore, loadingMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void loadMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const emptyCopy = useMemo(() => {
    if (source === 'all') {
      return 'Generated images from quick create, batch workflow, and product ads will appear here.';
    }
    if (source === 'instant-generation') {
      return 'New quick-create runs save images here automatically. Older runs may not have stored files.';
    }
    if (source === 'batchGeneratedPosts') {
      return 'Batch-generated posts with images show up after the workflow creates scheduled posts.';
    }
    return 'Product advert generations with images are listed here.';
  }, [source]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Media library</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          A single place for images produced across quick create, batch
          workflow, and product ads. Links expire after about an hour—refresh if
          an image stops loading.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {SOURCE_OPTIONS.map((opt) => {
            const active = source === opt.value;
            return (
              <Button
                key={opt.value}
                type="button"
                variant={active ? 'default' : 'outline'}
                size="sm"
                className={cn('rounded-full', active && 'shadow-sm')}
                onClick={() => setSource(opt.value)}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={loading}
          onClick={() => void load()}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading
            </>
          ) : (
            'Refresh'
          )}
        </Button>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {loading && items.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading your images…</p>
        </div>
      ) : null}

      {!loading && items.length === 0 ? (
        <div className="flex min-h-[36vh] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-16 text-center">
          <div className="rounded-full bg-muted p-4">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2 max-w-md">
            <p className="font-medium text-foreground">No images yet</p>
            <p className="text-sm text-muted-foreground">{emptyCopy}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Button asChild variant="secondary" size="sm">
              <Link href="/instant-generation">Quick create</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/batch-generation">Batch workflow</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/product-advert">Product ads</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/festive-post">Festive post</Link>
            </Button>
          </div>
        </div>
      ) : null}

      {items.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const badge = sourceBadge(item.collection);
            const Icon = badge.Icon;
            const url = item.imageUrl;
            return (
              <li
                key={item.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition hover:border-primary/25 hover:shadow-md"
              >
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative block aspect-4/5 overflow-hidden bg-muted"
                  >
                    <img
                      src={url}
                      alt=""
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                    <span
                      className={cn(
                        'absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-sm backdrop-blur-sm',
                        badge.className
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {badge.label}
                    </span>
                  </a>
                ) : (
                  <div className="relative flex aspect-4/5 flex-col items-center justify-center gap-2 overflow-hidden bg-muted/80 px-4 text-center">
                    <ImageOff
                      className="h-10 w-10 text-muted-foreground/80"
                      aria-hidden
                    />
                    <p className="text-xs font-medium text-muted-foreground">
                      Preview unavailable
                    </p>
                    <p className="text-[11px] leading-snug text-muted-foreground/90">
                      Refresh in a bit, or regenerate if the file was removed.
                    </p>
                    <span
                      className={cn(
                        'absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-sm backdrop-blur-sm',
                        badge.className
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {badge.label}
                    </span>
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-2 border-t border-border/40 p-3">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {item.platform ? (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium capitalize text-foreground">
                        {item.platform.replace(/_/g, ' ')}
                      </span>
                    ) : null}
                    {item.targetCalendarDate ? (
                      <span className="rounded-md border border-border/50 bg-background/60 px-1.5 py-0.5 text-[11px] text-foreground/90">
                        Scheduled {item.targetCalendarDate}
                      </span>
                    ) : null}
                    {item.creditsCharged != null && item.creditsCharged > 0 ? (
                      <span
                        className="rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 font-medium tabular-nums text-amber-950 dark:text-amber-100"
                        title="Credits charged for this generation"
                      >
                        {item.creditsCharged}{' '}
                        {item.creditsCharged === 1 ? 'credit' : 'credits'}
                      </span>
                    ) : null}
                    {item.scheduledPostId ? (
                      <span
                        className="max-w-full truncate font-mono text-[10px] text-muted-foreground"
                        title={item.scheduledPostId}
                      >
                        Post {shortRef(item.scheduledPostId)}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {formatWhen(item.createdAt)}
                  </p>
                  {url ? (
                    <div className="flex flex-col sm:flex-row gap-4 mt-2">
                      <DownloadPngButton
                        url={url}
                        getFilename={() =>
                          `media-${item.id}-${Date.now()}.png`
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      <div ref={sentinelRef} style={{ height: 1 }} />
    </div>
  );
}
