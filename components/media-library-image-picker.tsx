'use client';

import { useState } from 'react';
import { Images } from 'lucide-react';
import { MediaLibraryImagePickerDialog } from '@/components/shared/MediaLibraryImagePickerDialog';
import type { GeneratedMediaLibraryItem } from '@/src/service/api/generated-media-library.service';

type PickerProps = { disabled?: boolean } & (
  | { onChoose: (item: GeneratedMediaLibraryItem) => void | Promise<void>; onChooseMany?: never; maxSelection?: never }
  | { onChoose?: never; onChooseMany: (items: GeneratedMediaLibraryItem[]) => void | Promise<void>; maxSelection: number }
);

export function MediaLibraryImagePicker({ onChoose, onChooseMany, maxSelection, disabled = false }: PickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-default bg-element px-4 py-2 text-xs font-semibold text-default transition hover:bg-hover disabled:opacity-50"
      >
        <Images className="h-4 w-4" aria-hidden />
        Choose from Media Library
      </button>
      <MediaLibraryImagePickerDialog
        open={open}
        onOpenChange={setOpen}
        title="Choose from Media Library"
        description={onChooseMany
          ? `Select up to ${maxSelection} image${maxSelection === 1 ? '' : 's'} for this campaign.`
          : 'Pick an image to use in this generation.'}
        imageOnly
        onSelectItem={onChoose}
        onSelectItems={onChooseMany}
        maxSelection={maxSelection}
      />
    </>
  );
}
