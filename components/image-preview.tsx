'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Expand, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Marker on `document.body` while a fullscreen preview is open. */
export const IMAGE_PREVIEW_OPEN_BODY_ATTR = 'data-image-preview-open';

/** Selector for the portaled overlay root — keep in sync with `ImagePreviewOverlay`. */
export const IMAGE_PREVIEW_OVERLAY_SELECTOR = '[data-image-preview-overlay]';

/** True when a fullscreen image preview is mounted (e.g. block parent Sheet dismiss). */
export function isImagePreviewOverlayMounted(): boolean {
  if (typeof document === 'undefined') return false;
  return (
    document.body.hasAttribute(IMAGE_PREVIEW_OPEN_BODY_ATTR) ||
    !!document.querySelector(IMAGE_PREVIEW_OVERLAY_SELECTOR)
  );
}

export function useImagePreview() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewAlt, setPreviewAlt] = useState<string>('Image preview');

  const open = useCallback((url: string, alt?: string) => {
    if (!url) return;
    setPreviewUrl(url);
    setPreviewAlt(alt ?? 'Image preview');
  }, []);

  const close = useCallback(() => setPreviewUrl(null), []);

  useEffect(() => {
    if (!previewUrl) return;

    document.body.setAttribute(IMAGE_PREVIEW_OPEN_BODY_ATTR, '');

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setPreviewUrl(null);
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown, true);

    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      document.body.removeAttribute(IMAGE_PREVIEW_OPEN_BODY_ATTR);
    };
  }, [previewUrl]);

  return { previewUrl, previewAlt, open, close, isOpen: !!previewUrl };
}

type ImagePreviewOverlayProps = {
  src: string | null;
  alt?: string;
  onClose: () => void;
  /**
   * Portals to `document.body` by default. Inside a Radix Sheet/Dialog, pass
   * `portalled={false}` and render this component as a child of the sheet
   * content — otherwise `react-remove-scroll` blocks pointer events on the
   * overlay and backdrop / close clicks never fire.
   */
  portalled?: boolean;
};

export function ImagePreviewOverlay({
  src,
  alt = 'Image preview',
  onClose,
  portalled = true,
}: ImagePreviewOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClose();
    },
    [onClose]
  );

  const keepOpen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  if (!mounted || !src) return null;

  const overlay = (
    <div
      className="pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ minHeight: '100dvh' }}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      data-image-preview-overlay=""
    >
      <button
        type="button"
        className="absolute inset-0 z-0 h-full w-full border-0 bg-black/85 p-0 backdrop-blur-sm"
        aria-label="Close image preview"
        onClick={dismiss}
      />

      <img
        src={src}
        alt={alt}
        className="relative z-10 max-h-[90vh] max-w-[95vw] rounded-lg object-contain shadow-2xl"
        onClick={keepOpen}
      />

      <button
        type="button"
        aria-label="Close image preview"
        onClick={dismiss}
        className="absolute right-2 top-2 z-20 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-0 bg-white/10 text-white ring-1 ring-white/30 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-4 sm:top-4"
      >
        <X className="h-5 w-5 pointer-events-none" />
      </button>
    </div>
  );

  if (portalled) {
    return createPortal(overlay, document.body);
  }

  return overlay;
}

type ImagePreviewButtonProps = {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: 'default' | 'overlay-icon';
  className?: string;
  label?: string;
  ariaLabel?: string;
  stopPropagation?: boolean;
};

const baseDefault =
  'inline-flex items-center justify-center gap-1.5 rounded-full bg-indigo-600 text-white font-semibold hover:opacity-90 transition disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 px-4 py-3 text-sm';

const baseOverlay =
  'inline-flex items-center justify-center rounded-full bg-black/55 text-white shadow-md ring-1 ring-white/30 backdrop-blur-sm hover:bg-black/75 transition h-8 w-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-white';

export function ImagePreviewButton({
  onClick,
  variant = 'default',
  className,
  label = 'Preview',
  ariaLabel = 'Open image preview',
  stopPropagation = false,
}: ImagePreviewButtonProps) {
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
    onClick(e);
  };

  if (variant === 'overlay-icon') {
    return (
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        aria-label={ariaLabel}
        title={label}
        className={cn('cursor-pointer', baseOverlay, className)}
      >
        <Expand className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      aria-label={ariaLabel}
      className={cn(baseDefault, className)}
    >
      <Expand className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}
