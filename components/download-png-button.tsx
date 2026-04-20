'use client';

import { useState } from 'react';
import { downloadImageAsFile } from '@/lib/download-image';
import { toast } from 'sonner';

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
      className={className}
      onClick={async () => {
        setBusy(true);
        try {
          await downloadImageAsFile(url, getFilename());
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : 'Could not download image'
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? 'Downloading…' : 'Download PNG'}
    </button>
  );
}
