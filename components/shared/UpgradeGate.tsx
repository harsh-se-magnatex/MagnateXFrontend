'use client';

import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type TooltipSide = ComponentProps<typeof TooltipContent>['side'];

export type UpgradeGateProps = {
  /**
   * When false, children render as-is with no wrapper. When true, the gate
   * shows the tooltip on hover/focus and visually disables the wrapped
   * control (cursor-not-allowed + child pointer events suppressed so the
   * underlying control cannot be activated even if `disabled` is omitted).
   */
  gated: boolean;
  /** Tooltip body text. Required when `gated`. */
  tooltip: string;
  side?: TooltipSide;
  /** Forwarded to the wrapping `<span>` (useful for flex/sizing parity). */
  className?: string;
  children: ReactNode;
};

/**
 * Disable a control behind a plan-mode paywall while still showing a hover
 * tooltip explaining the upgrade. Wraps the child in a `<span>` so the
 * tooltip trigger receives pointer events (browsers swallow events on
 * `disabled` form elements). Child pointer events are suppressed via a
 * Tailwind arbitrary variant, so clicks against the underlying control
 * become no-ops without extra wiring at the call site.
 *
 * Relies on `<TooltipProvider>` being mounted higher in the tree
 * (`app/(main)/layout.tsx`).
 *
 * @example
 * // Auto-mode users cannot use Manual Review:
 * <UpgradeGate gated={billing?.mode === 'auto'} tooltip="Upgrade to manual mode" className="flex-1">
 *   <button disabled={billing?.mode === 'auto'} className="w-full ...">Manual Review</button>
 * </UpgradeGate>
 *
 * // Manual-mode users cannot use Auto Approve:
 * <UpgradeGate gated={billing?.mode === 'manual'} tooltip="Upgrade to automatic mode" className="flex-1">
 *   <button disabled={billing?.mode === 'manual'} className="w-full ...">Auto Approve</button>
 * </UpgradeGate>
 */
export function UpgradeGate({
  gated,
  tooltip,
  side = 'top',
  className,
  children,
}: UpgradeGateProps) {
  // Layout parity: even when the gate is OPEN we still apply the same
  // wrapper className (`flex-1`, sizing helpers, etc.) so a sibling
  // `<UpgradeGate gated>` doesn't end up squished by a sibling that
  // rendered as a raw `<button>` and consumed all the flex space. The
  // previous shortcut `return <>{children}</>` caused exactly that bug
  // on the automation page's Manual Review / Auto Approve segmented
  // control \u2014 the active side ate the whole row and the disabled side
  // collapsed to two-line min-content width.
  if (!gated) {
    if (!className) return <>{children}</>;
    return (
      <span className={cn('inline-flex', className)}>{children}</span>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-disabled="true"
          tabIndex={0}
          className={cn(
            'inline-flex cursor-not-allowed [&>*]:pointer-events-none',
            className
          )}
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side={side}>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
