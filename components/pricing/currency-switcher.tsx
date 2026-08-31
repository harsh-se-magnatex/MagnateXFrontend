'use client';

import { Globe } from 'lucide-react';
import { useCurrency } from '@/components/pricing/currency-provider';
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '@/lib/geo-currency';
import { cn } from '@/lib/utils';

/**
 * Lets a visitor override the inferred currency — which matters more than it
 * looks: detection is approximate by nature (VPNs, travel, a browser time zone
 * that doesn't match where you bank), and an explicit control is the honest
 * answer to that rather than pretending detection is authoritative.
 */
export function CurrencySwitcher({ className }: { className?: string }) {
  const { currency, setCurrency } = useCurrency();

  return (
    <label
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-default bg-element px-3 py-2 text-sm transition-expo hover:border-strong',
        className
      )}
    >
      <Globe className="size-4 text-tertiary" aria-hidden />
      <span className="sr-only">Display currency</span>
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
        className="cursor-pointer bg-transparent pr-1 font-medium text-default outline-none"
      >
        {SUPPORTED_CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} · {c.label}
          </option>
        ))}
      </select>
    </label>
  );
}
