'use client';

import { useState } from 'react';
import { Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  appendSocialProfileLink,
  resolveBusinessSocialProfileUrl,
} from '@/lib/business-social-profile-url';
import { downloadImageAsFile } from '@/lib/download-image';
import { shareGeneratedPost } from '@/lib/share-generated-post';
import { showErrorToast } from '@/lib/show-error-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const defaultClassName =
  'inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-60 disabled:cursor-wait';

type SharePostButtonProps = {
  imageUrl: string;
  caption?: string | null;
  /**
   * Post platform (`facebook` / `instagram` / `linkedin`).
   * Used to append the selected business page/account URL to shared text.
   */
  platform?: string | null;
  /** Resolved on click so timestamps stay unique. */
  getFilename?: () => string;
  className?: string;
  label?: string;
};

export function SharePostButton({
  imageUrl,
  caption,
  platform,
  getFilename,
  className = defaultClassName,
  label = 'Share',
}: SharePostButtonProps) {
  const [busy, setBusy] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [copyBusy, setCopyBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [shareText, setShareText] = useState(() =>
    String(caption ?? '').trim()
  );

  const hasImage = Boolean(String(imageUrl ?? '').trim());

  async function buildShareText(): Promise<string> {
    const base = String(caption ?? '').trim();
    const profileUrl = await resolveBusinessSocialProfileUrl(platform);
    const next = appendSocialProfileLink(base, profileUrl);
    setShareText(next);
    return next;
  }

  async function handleShare() {
    if (!hasImage || busy) return;
    setBusy(true);
    try {
      const text = await buildShareText();
      const result = await shareGeneratedPost({
        imageUrl,
        caption: text,
        filename: getFilename?.(),
      });

      if (result.status === 'shared') {
        toast.success('Shared successfully');
        return;
      }
      if (result.status === 'cancelled') {
        return;
      }
      if (result.status === 'unsupported') {
        setFallbackOpen(true);
        return;
      }
      showErrorToast(result.message);
    } catch {
      showErrorToast('Sharing failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyCaption() {
    setCopyBusy(true);
    try {
      const text = shareText.trim() || (await buildShareText());
      if (!text) {
        showErrorToast('No caption available to copy.');
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success('Caption copied');
    } catch {
      showErrorToast('Could not copy caption.');
    } finally {
      setCopyBusy(false);
    }
  }

  async function handleDownloadImage() {
    if (!hasImage) return;
    setDownloadBusy(true);
    try {
      await downloadImageAsFile(
        imageUrl,
        getFilename?.() || `sociogenie-post-${Date.now()}.png`
      );
      toast.success('Image downloaded');
    } catch {
      showErrorToast('Could not download image');
    } finally {
      setDownloadBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={!hasImage || busy}
        className={cn('cursor-pointer', className)}
        onClick={() => void handleShare()}
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparing…
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4" />
            {label}
          </>
        )}
      </button>

      <Dialog open={fallbackOpen} onOpenChange={setFallbackOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Sharing is not supported in this browser</DialogTitle>
            <DialogDescription>
              Use the options below to share manually — copy the caption
              (includes your business page link when available) and download the
              image, then attach them in WhatsApp or another app.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-stretch">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:flex-1"
              disabled={copyBusy}
              onClick={() => void handleCopyCaption()}
            >
              {copyBusy ? 'Copying…' : 'Copy Caption'}
            </Button>
            <Button
              type="button"
              className="w-full sm:flex-1 bg-gradient-primary text-white"
              disabled={!hasImage || downloadBusy}
              onClick={() => void handleDownloadImage()}
            >
              {downloadBusy ? 'Downloading…' : 'Download Image'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
