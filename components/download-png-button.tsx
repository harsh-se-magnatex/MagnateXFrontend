'use client';

import { useState } from 'react';
import { downloadImageAsFile } from '@/lib/download-image';
import { showErrorToast } from '@/lib/show-error-toast';
import { cn } from '@/lib/utils';

const defaultClassName =
  'w-full text-center py-3 rounded-full bg-cyan-600 text-white font-semibold hover:opacity-90 transition disabled:opacity-60 disabled:cursor-wait';

type Props = {
  url: string;
  /** Resolved when the user clicks so timestamps stay unique. */
  getFilename: () => string;
  className?: string;
};

export function DownloadPngButton({
  url,
  getFilename,
  className = defaultClassName,
}: Props) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      className={cn('cursor-pointer', className)}
      onClick={async () => {
        setBusy(true);
        try {
          await downloadImageAsFile(url, getFilename());
        } catch (e) {
          showErrorToast('Could not download image');
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? 'Downloading…' : 'Download PNG'}
    </button>
  );
}
