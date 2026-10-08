import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type MarqueeProps = {
  items: ReactNode[];
  /** Runs right-to-left by default; `reverse` sends it the other way. */
  reverse?: boolean;
  /** Seconds for one pass of `items`. Repeats added by `minItems` stretch it
   *  in proportion, so the band keeps the same speed. */
  duration?: number;
  /**
   * Repeat the list until a group holds at least this many items. A group
   * narrower than the viewport leaves an empty gap before the loop restarts,
   * which reads as the band "ending" — set this so one group always spans
   * the widest screen.
   */
  minItems?: number;
  /** Hovering pauses the band by default; false keeps it moving. */
  pauseOnHover?: boolean;
  className?: string;
  /** Read by screen readers instead of the moving copies. */
  label: string;
};

/**
 * An endless horizontal band. Pure CSS: the group is rendered twice and the
 * track slides by exactly half its width, so the loop has no seam. Repeated
 * copies are aria-hidden; under reduced motion the band stops and wraps.
 */
export function Marquee({
  items,
  reverse,
  duration = 40,
  minItems = 0,
  pauseOnHover = true,
  className,
  label,
}: MarqueeProps) {
  const repeats =
    items.length > 0 ? Math.max(1, Math.ceil(minItems / items.length)) : 1;
  const group = Array.from({ length: repeats }, (_, r) =>
    items.map((item, i) => ({ item, key: `${r}-${i}`, copy: r > 0 }))
  ).flat();

  return (
    <div
      className={cn(
        'marquee',
        reverse && 'marquee--reverse',
        !pauseOnHover && 'marquee--no-pause',
        className
      )}
      style={
        {
          '--marquee-duration': `${duration * repeats}s`,
        } as React.CSSProperties
      }
      role="region"
      aria-label={label}
    >
      <div className="marquee__track">
        <ul className="marquee__group">
          {group.map(({ item, key, copy }) => (
            <li key={key} aria-hidden={copy || undefined}>
              {item}
            </li>
          ))}
        </ul>
        <ul className="marquee__group" aria-hidden>
          {group.map(({ item, key }) => (
            <li key={key}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
