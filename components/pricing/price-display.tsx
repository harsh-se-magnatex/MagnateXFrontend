'use client';

import { cn } from '@/lib/utils';
import { useCurrency } from '@/components/pricing/currency-provider';
import {
  PRICING_DISCLAIMER,
  RATES_AS_OF,
  localizePrice,
} from '@/lib/geo-currency';

/**
 * The one place a plan or pack price gets rendered.
 *
 * Whenever the figure is a conversion it carries `≈` and is followed by the USD
 * amount, because USD is what the invoice is actually denominated in. Never
 * render a converted number on its own.
 */
export function PriceDisplay({
  usd,
  period,
  className,
  amountClassName,
}: {
  usd: number;
  period?: string;
  className?: string;
  amountClassName?: string;
}) {
  const { currency } = useCurrency();
  const price = localizePrice(usd, currency);

  return (
    <div className={className}>
      <div className="flex flex-wrap items-baseline gap-x-1">
        <span className={amountClassName}>{price.display}</span>
        {period ? <span className="ml-1 text-secondary">{period}</span> : null}
      </div>
      {price.isConverted ? (
        <p className="mt-1 text-xs text-tertiary">
          billed as {price.usdDisplay} USD
        </p>
      ) : null}
    </div>
  );
}

/** Inline variant for prose and table rows — no USD sub-line. */
export function InlinePrice({ usd }: { usd: number }) {
  const { currency } = useCurrency();
  return <>{localizePrice(usd, currency).display}</>;
}

/**
 * Only renders once a non-USD currency is in play — there is nothing to
 * disclaim when the figure shown is already the settlement currency.
 */
export function PricingDisclaimer({ className }: { className?: string }) {
  const { currency } = useCurrency();
  if (currency === 'USD') return null;

  return (
    <p
      className={cn(
        'text-xs leading-relaxed text-tertiary',
        className
      )}
    >
      {PRICING_DISCLAIMER}{' '}
      <span className="whitespace-nowrap">Rates as of {RATES_AS_OF}.</span>
    </p>
  );
}
