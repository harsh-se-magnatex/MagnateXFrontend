import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type MarqueeProps = {
  items: ReactNode[];
  /** Runs right-to-left by default; `reverse` sends it the other way. */
  reverse?: boolean;
  /** Seconds for one full loop. Longer lists want longer loops. */
  duration?: number;
  className?: string;
  /** Read by screen readers instead of the moving copies. */
  label: string;
};

/**
 * An endless horizontal band. Pure CSS: the list is rendered twice and the
 * track slides by exactly half its width, so the loop has no seam. The
 * second copy is aria-hidden; under reduced motion the band stops and wraps.
 */
export function Marquee({
  items,
  reverse,
  duration = 40,
  className,
  label,
}: MarqueeProps) {
  return (
    <div
      className={cn('marquee', reverse && 'marquee--reverse', className)}
      style={{ '--marquee-duration': `${duration}s` } as React.CSSProperties}
      role="region"
      aria-label={label}
    >
      <div className="marquee__track">
        <ul className="marquee__group">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <ul className="marquee__group" aria-hidden>
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
