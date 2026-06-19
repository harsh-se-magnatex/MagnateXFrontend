// EDIT_PHOTO_DISABLED — module preserved for Edit_Photo_V1; not imported on App_Mode.
'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { CreativeDesignDocument } from '@/lib/creative-design/types';
import { CreativeEditor } from './CreativeEditor';

type CreativeEditorModalProps = {
  open: boolean;
  onClose: () => void;
  designJson: CreativeDesignDocument | undefined;
  platform?: string;
  scheduledPostId?: string;
  caption?: string | null;
  onSaved?: (payload: { imageUrl: string; designJson: CreativeDesignDocument }) => void;
};

export function CreativeEditorModal({
  open,
  onClose,
  designJson,
  platform,
  scheduledPostId,
  caption,
  onSaved,
}: CreativeEditorModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !designJson) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">Edit creative</h2>
          <p className="truncate text-xs text-slate-500 sm:text-sm">
            Click text or the logo to move and resize · Style with the panel on the right
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Close editor"
        >
          <X className="h-5 w-5" />
        </button>
      </header>
      <div className="min-h-0 flex-1">
        <CreativeEditor
          className="h-full"
          designJson={designJson}
          platform={platform}
          scheduledPostId={scheduledPostId}
          caption={caption}
          onSaved={(payload) => {
            onSaved?.(payload);
            onClose();
          }}
        />
      </div>
    </div>
  );
}
