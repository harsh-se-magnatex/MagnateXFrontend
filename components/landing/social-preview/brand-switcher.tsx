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
    <div className="flex flex-col gap-2">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Choose a brand
      </p>
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {SHOWCASE_BRAND_OPTIONS.map((brand) => {
          const isActive = active === brand.id;
          return (
            <button
              key={brand.id}
              type="button"
              onClick={() => onChange(brand.id)}
              className={cn(
                'min-w-[160px] rounded-2xl border px-4 py-3 text-left transition-all duration-200 sm:min-w-[180px]',
                isActive
                  ? 'border-primary-purple/50 bg-card/90 shadow-lg shadow-primary-purple/15 ring-1 ring-primary-purple/25'
                  : 'border-border/50 bg-card/40 hover:border-border hover:bg-card/70'
              )}
            >
              <p
                className={cn(
                  'text-sm font-bold',
                  isActive ? 'text-foreground' : 'text-foreground/80'
                )}
              >
                {brand.label}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {brand.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
