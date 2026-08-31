'use client';

import { useState } from 'react';
import { downloadMediaAsFile } from '@/lib/download-image';
import { showErrorToast } from '@/lib/show-error-toast';
import { cn } from '@/lib/utils';

const defaultClassName =
  'inline-flex items-center justify-center rounded-lg border border-primary/30 bg-default px-4 py-2 text-sm font-medium text-link hover:bg-primary/10 disabled:text-quaternary disabled:cursor-wait';

type Props = {
  url: string;
  /** Resolved when the user clicks so timestamps stay unique. */
  getFilename: () => string;
  className?: string;
  label?: string;
};

export function DownloadVideoButton({
  url,
  getFilename,
  className = defaultClassName,
  label = 'Download video',
}: Props) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy || !url.trim()}
      className={cn('cursor-pointer', className)}
      onClick={async () => {
        if (!url.trim() || busy) return;
        setBusy(true);
        try {
          await downloadMediaAsFile(url, getFilename());
        } catch {
          showErrorToast('Could not download video. Please try again.');
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? 'Downloading…' : label}
    </button>
  );
}
