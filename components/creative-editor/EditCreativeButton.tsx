// EDIT_PHOTO_DISABLED — module preserved for Edit_Photo_V1; not imported on App_Mode.
'use client';

import { Pencil } from 'lucide-react';
import type { CreativeDesignDocument } from '@/lib/creative-design/types';

type EditCreativeButtonProps = {
  designJson?: CreativeDesignDocument | null;
  onClick: () => void;
  className?: string;
};

export function EditCreativeButton({ designJson, onClick, className }: EditCreativeButtonProps) {
  if (!designJson) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        className ??
        'inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100'
      }
    >
      <Pencil className="h-4 w-4" />
      Edit text & logo
    </button>
  );
}
