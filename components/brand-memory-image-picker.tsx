'use client';

import { useState } from 'react';
import { Images } from 'lucide-react';
import {
  BrandMemoryImagePickerDialog,
  type BrandMemoryPhoto,
} from '@/components/shared/BrandMemoryImagePickerDialog';

type Props = { disabled?: boolean; excludedPaths?: string[] } & (
  | {
      onChoose: (photo: BrandMemoryPhoto) => void | Promise<void>;
      onChooseMany?: never;
      maxSelection?: never;
    }
  | {
      onChoose?: never;
      onChooseMany: (photos: BrandMemoryPhoto[]) => void | Promise<void>;
      maxSelection: number;
    }
);

export function BrandMemoryImagePicker({
  disabled = false,
  excludedPaths,
  onChoose,
  onChooseMany,
  maxSelection,
}: Props) {
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
        Choose from Brand Memory
      </button>
      <BrandMemoryImagePickerDialog
        open={open}
        onOpenChange={setOpen}
        onSelect={onChoose}
        onSelectMany={onChooseMany}
        maxSelection={maxSelection}
        excludedPaths={excludedPaths}
        description={
          onChooseMany
            ? `Select up to ${maxSelection} photos for this campaign.`
            : undefined
        }
      />
    </>
  );
}
