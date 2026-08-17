'use client';

import { cn } from '@/lib/utils';
import {
  isPresetPageLook,
  PAGE_LOOK_PRESETS,
} from '@/lib/page-look-styles';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// import { PageLookPreview } from '@/components/onboarding/PageLookPreview';

type PageLookSelectorProps = {
  value: string;
  onChange: (value: string) => void;
  idPrefix?: string;
  customPlaceholder?: string;
  /** Shown in the phone mock header when preview is enabled */
  // businessName?: string;
  /** Side-by-side preview on large screens */
  // showPreview?: boolean;
};

export function PageLookSelector({
  value,
  onChange,
  idPrefix = 'page-look',
  customPlaceholder = 'e.g. dark moody with neon accents, retro film grain…',
  // businessName,
  // showPreview = true,
}: PageLookSelectorProps) {
  const trimmed = value.trim();
  const selectedPreset = PAGE_LOOK_PRESETS.find(
    (p) => p.label.toLowerCase() === trimmed.toLowerCase()
  );
  const customActive = trimmed.length > 0 && !selectedPreset;

  const selectPreset = (label: string) => {
    onChange(label);
  };

  const handleCustomChange = (next: string) => {
    onChange(next);
  };

  const options = (
    <div className="space-y-4 min-w-0">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PAGE_LOOK_PRESETS.map((preset) => {
          const selected = selectedPreset?.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => selectPreset(preset.label)}
              className={cn(
                'rounded-xl border px-4 py-3 text-left transition-all',
                selected
                  ? 'border-primary-blue bg-primary-blue/10 ring-2 ring-primary-blue/30'
                  : 'border-border bg-card hover:border-primary-blue/40 hover:bg-primary-blue/5'
              )}
              aria-pressed={selected}
            >
              <span className="block text-sm font-semibold text-foreground">
                {preset.label}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {preset.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Live phone mock preview beside selected preset (disabled — re-enable to show UI next to options)
  // if (!showPreview) {
  //   return options;
  // }
  //
  // return (
  //   <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px] xl:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
  //     {options}
  //     <div className="lg:sticky lg:top-4">
  //       <PageLookPreview
  //         value={value}
  //         businessName={businessName}
  //         className="transition-all duration-300"
  //       />
  //     </div>
  //   </div>
  // );

  return options;
}

/** Normalize stored value for display in the selector. */
export function normalizePageLookValue(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (isPresetPageLook(s)) {
    const preset = PAGE_LOOK_PRESETS.find(
      (p) => p.label.toLowerCase() === s.toLowerCase() || p.id === s.toLowerCase()
    );
    return preset?.label ?? s;
  }
  return s;
}
