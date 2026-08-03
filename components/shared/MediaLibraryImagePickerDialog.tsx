'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, ImageOff, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ImagePreviewButton,
  ImagePreviewOverlay,
  useImagePreview,
} from '@/components/image-preview';
import {
  galleryItemFrameImageUrl,
  isGalleryItemPickableForVideoFrame,
} from '@/lib/gallery-frame-image';
import {
  getGeneratedMediaLibraryApi,
  type GeneratedMediaLibraryItem,
} from '@/src/service/api/generated-media-library.service';
import {
  WORKSPACE_NAV_HREFS,
  workspacePageTitle,
} from '@/lib/workspace-nav';
import { useTimestampFormatter } from '@/lib/user-timezone';

type MediaLibraryImagePickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onSelect: (imageUrl: string) => void;
};

export function MediaLibraryImagePickerDialog({
  open,
  onOpenChange,
  title,
  description,
  onSelect,
}: MediaLibraryImagePickerDialogProps) {
  const fmtTimestamp = useTimestampFormatter();
  const imagePreview = useImagePreview();
  const [items, setItems] = useState<GeneratedMediaLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const pickableItems = useMemo(
    () => items.filter(isGalleryItemPickableForVideoFrame),
    [items]
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError('');
    setItems([]);
    setNextCursor(null);
    setHasMore(false);
    try {
      const data = await getGeneratedMediaLibraryApi({ source: 'all' });
      setItems(data?.items ?? []);
      setNextCursor(data?.nextCursor ?? null);
      setHasMore(data?.hasMore ?? false);
    } catch {
      setError('Could not load your Media Library.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadInitial();
  }, [open, loadInitial]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await getGeneratedMediaLibraryApi({
        source: 'all',
        cursor: nextCursor,
      });
      setItems((prev) => {
        const next = data?.items ?? [];
        if (!next.length) return prev;
        const seen = new Set(
          prev.map((item) => `${item.collection}-${item.id}`)
        );
        const appended = next.filter((item) => {
          const key = `${item.collection}-${item.id}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return appended.length ? [...prev, ...appended] : prev;
      });
      setNextCursor(data?.nextCursor ?? null);
      setHasMore(data?.hasMore ?? false);
    } catch {
      setError('Could not load more images.');
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, nextCursor, loadingMore]);

  const handlePick = (item: GeneratedMediaLibraryItem) => {
    const url = galleryItemFrameImageUrl(item);
    if (!url) return;
    onSelect(url);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex h-[92vh] w-[min(96vw,72rem)] flex-col gap-0 overflow-hidden p-0',
          // Override DialogContent default `sm:max-w-sm`
          'max-w-[min(96vw,72rem)] sm:max-w-[min(96vw,72rem)]'
        )}
        showCloseButton
      >
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 pr-12">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ??
              'Pick any still image from your library to use as a video frame.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Loading images…
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : pickableItems.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
              <ImageOff className="h-10 w-10 opacity-60" aria-hidden />
              <p>No images in your library yet.</p>
              <Button asChild variant="secondary" size="sm">
                <Link href={WORKSPACE_NAV_HREFS.gallery}>
                  Open {workspacePageTitle(WORKSPACE_NAV_HREFS.gallery)}
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pickableItems.map((item) => {
                const imageUrl = galleryItemFrameImageUrl(item)!;
                const whenLabel = fmtTimestamp(
                  item.scheduleAt ?? item.createdAt
                );
                return (
                  <li key={`${item.collection}-${item.id}`}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handlePick(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handlePick(item);
                        }
                      }}
                      className={cn(
                        'group relative flex w-full min-w-0 cursor-pointer flex-col rounded-2xl border border-border bg-card p-3 text-left shadow-sm',
                        'transition-all hover:border-primary/35 hover:bg-accent/40',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
                      )}
                    >
                      <div className="relative mb-2 aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted">
                        <img
                          src={imageUrl}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                        <div className="absolute bottom-2 right-2">
                          <ImagePreviewButton
                            variant="overlay-icon"
                            stopPropagation
                            label="Preview image"
                            ariaLabel="Preview image"
                            onClick={() =>
                              imagePreview.open(imageUrl, 'Media Library image')
                            }
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="truncate">{whenLabel}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {hasMore && !loading && pickableItems.length > 0 ? (
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loadingMore}
                onClick={() => void loadMore()}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  'Load more'
                )}
              </Button>
            </div>
          ) : null}
        </div>

        <ImagePreviewOverlay
          src={imagePreview.previewUrl}
          alt={imagePreview.previewAlt}
          onClose={imagePreview.close}
          portalled={false}
        />
      </DialogContent>
    </Dialog>
  );
}
