'use client';

import { cn } from '@/lib/utils';
import {
  SHOWCASE_BRAND_OPTIONS,
  type ShowcaseBrandId,
} from '@/components/landing/social-preview/showcase-brands';

type BrandSwitcherProps = {
  active: ShowcaseBrandId;
  onChange: (brandId: ShowcaseBrandId) => void;
};

export function BrandSwitcher({ active, onChange }: BrandSwitcherProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-eyebrow text-center">Choose an example brand</p>
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {SHOWCASE_BRAND_OPTIONS.map((brand) => {
          const isActive = active === brand.id;
          return (
            <button
              key={brand.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(brand.id)}
              className={cn(
                'min-w-[150px] rounded-2xl border px-4 py-3 text-left transition-expo sm:min-w-[170px]',
                isActive
                  ? 'nav-active border-[color-mix(in_srgb,var(--brand-violet)_45%,var(--border-default))]'
                  : 'border-default bg-element hover:border-strong hover:bg-subtle'
              )}
            >
              <p
                className={cn(
                  'text-sm font-semibold',
                  isActive ? 'text-default' : 'text-secondary'
                )}
              >
                {brand.label}
              </p>
              <p className="mt-0.5 truncate text-xs text-tertiary">
                {brand.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
