'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Expand, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewUrl(null);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [previewUrl]);

  return { previewUrl, previewAlt, open, close, isOpen: !!previewUrl };
}

export function ImagePreviewOverlay({
  src,
  alt = 'Image preview',
  onClose,
}: {
  src: string | null;
  alt?: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !src) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      style={{ minHeight: '100dvh' }}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      onClick={onClose}
      // Used by parent dialogs/sheets (e.g. Radix Sheet drafts drawer) to
      // recognize that an interaction (pointer / key) originates from this
      // portal and SHOULD NOT auto-close the parent. Don't change the
      // attribute name without grepping for it.
      data-image-preview-overlay=""
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute cursor-pointer right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/30 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label="Close image preview"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}

type ImagePreviewButtonProps = {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: 'default' | 'overlay-icon';
  className?: string;
  label?: string;
  ariaLabel?: string;
  /** Stops click propagation so wrapping elements (e.g. card link/handlers) don't react. */
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
      onClick={handleClick}
      aria-label={ariaLabel}
      className={cn(baseDefault, className)}
    >
      <Expand className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}
