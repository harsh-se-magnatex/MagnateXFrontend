'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ImageOff, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ImagePreviewButton,
  ImagePreviewOverlay,
  useImagePreview,
} from '@/components/image-preview';
import { getMemoryLayer } from '@/src/service/api/userService';
import { cn } from '@/lib/utils';

export type BrandMemoryPhoto = {
  path: string;
  url: string;
  description?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  onSelect?: (photo: BrandMemoryPhoto) => void | Promise<void>;
  onSelectMany?: (photos: BrandMemoryPhoto[]) => void | Promise<void>;
  maxSelection?: number;
  excludedPaths?: string[];
};

export function BrandMemoryImagePickerDialog({
  open,
  onOpenChange,
  title = 'Choose from Brand Memory',
  description,
  onSelect,
  onSelectMany,
  maxSelection = 5,
  excludedPaths = [],
}: Props) {
  const [photos, setPhotos] = useState<BrandMemoryPhoto[]>([]);
  const [selected, setSelected] = useState<BrandMemoryPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState('');
  const preview = useImagePreview();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setPhotos([]);
    setSelected([]);
    setError('');
    void (async () => {
      try {
        const response = await getMemoryLayer();
        const layer = response?.data?.memoryLayer as
          | { brandPhotos?: BrandMemoryPhoto[] }
          | undefined;
        if (!cancelled)
          setPhotos(
            (layer?.brandPhotos ?? []).filter(
              (photo) => photo.path && photo.url
            )
          );
      } catch {
        if (!cancelled)
          setError('Could not load Brand Memory photos. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function choose(photo: BrandMemoryPhoto) {
    if (choosing || excludedPaths.includes(photo.path)) return;
    if (onSelectMany) {
      setSelected((current) =>
        current.some((item) => item.path === photo.path)
          ? current.filter((item) => item.path !== photo.path)
          : current.length < maxSelection
            ? [...current, photo]
            : current
      );
      return;
    }
    setChoosing(true);
    setError('');
    try {
      await onSelect?.(photo);
      onOpenChange(false);
    } catch {
      setError('Could not use this Brand Memory photo. Try another photo.');
    } finally {
      setChoosing(false);
    }
  }

  async function addSelected() {
    if (!onSelectMany || !selected.length || choosing) return;
    setChoosing(true);
    setError('');
    try {
      await onSelectMany(selected);
      onOpenChange(false);
    } catch {
      setError(
        'Could not add the selected Brand Memory photos. Please try again.'
      );
    } finally {
      setChoosing(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!choosing) onOpenChange(next);
      }}
    >
      <DialogContent className="flex h-[85vh] w-[min(96vw,72rem)] max-w-[min(96vw,72rem)] flex-col overflow-hidden p-0 sm:max-w-[min(96vw,72rem)]">
        <DialogHeader className="shrink-0 border-b border-default px-6 py-4 pr-12">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ??
              'Choose a saved brand photo to use as a reference image.'}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center gap-2 text-sm text-secondary">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading Brand Memory photos…
            </div>
          ) : !photos.length && !error ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-sm text-secondary">
              <ImageOff className="h-10 w-10 opacity-60" />
              <p>No photos in Brand Memory yet.</p>
              <Button asChild variant="secondary" size="sm">
                <Link href="/brand-memory">Open Brand Memory</Link>
              </Button>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {photos.map((photo) => {
                const picked = selected.some(
                  (item) => item.path === photo.path
                );
                const disabled =
                  choosing ||
                  excludedPaths.includes(photo.path) ||
                  Boolean(
                    onSelectMany && !picked && selected.length >= maxSelection
                  );
                return (
                  <li key={photo.path} className="relative">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => void choose(photo)}
                      aria-pressed={onSelectMany ? picked : undefined}
                      className={cn(
                        'w-full overflow-hidden rounded-xl border border-default bg-element p-2 text-left hover:border-primary-purple disabled:opacity-50',
                        picked &&
                          'border-primary-purple ring-2 ring-primary-purple/30'
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={photo.description || 'Brand Memory photo'}
                        className="aspect-[16/10] w-full rounded-lg object-cover"
                      />
                      {picked && (
                        <Check className="absolute left-3 top-3 h-6 w-6 rounded-full bg-primary-purple p-1 text-white" />
                      )}
                      {photo.description && (
                        <p className="mt-2 line-clamp-2 text-xs text-secondary">
                          {photo.description}
                        </p>
                      )}
                    </button>
                    <div className="absolute right-3 top-3">
                      <ImagePreviewButton
                        variant="overlay-icon"
                        label="Preview image"
                        ariaLabel="Preview image"
                        onClick={() =>
                          preview.open(
                            photo.url,
                            photo.description || 'Brand Memory photo'
                          )
                        }
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        {onSelectMany && (
          <div className="flex shrink-0 items-center justify-between border-t border-default px-6 py-4">
            <span className="text-sm text-secondary">
              {selected.length}/{maxSelection} selected
            </span>
            <Button
              type="button"
              disabled={!selected.length || choosing}
              onClick={() => void addSelected()}
            >
              {choosing
                ? 'Adding…'
                : `Add ${selected.length} photo${selected.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        )}
        <ImagePreviewOverlay
          src={preview.previewUrl}
          alt={preview.previewAlt}
          onClose={preview.close}
          portalled={false}
        />
      </DialogContent>
    </Dialog>
  );
}
