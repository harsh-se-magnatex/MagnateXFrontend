import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * 20px tall, `px-2.5`, fully round.
 *
 * Status badges pair a **step-3 background with step-11 text** — never a
 * solid step-9 fill with white text. Solid fills are reserved for buttons;
 * a page full of solid status chips reads as a page full of CTAs.
 *
 * Status is never carried by colour alone — pair these with an icon or a
 * word, which the call sites already do.
 */
const badgeVariants = cva(
  [
    'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1',
    'overflow-hidden whitespace-nowrap rounded-full border border-transparent px-2.5',
    'text-xs font-medium',
    'transition-[color,background-color,border-color] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]',
    'focus-visible:ring-2 focus-visible:ring-strong',
    'has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
    '[&>svg]:pointer-events-none [&>svg]:size-3!',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-element text-secondary [a]:hover:bg-selected',
        secondary: 'bg-element text-default [a]:hover:bg-selected',
        outline:
          'border-default bg-transparent text-secondary [a]:hover:bg-element [a]:hover:text-default',
        ghost:
          'bg-transparent text-tertiary hover:bg-element hover:text-secondary',
        success: 'bg-success text-success',
        warning: 'bg-warning text-warning',
        destructive: 'bg-danger text-danger [a]:hover:border-danger',
        danger: 'bg-danger text-danger [a]:hover:border-danger',
        info: 'bg-info text-info',
        preview: 'bg-preview text-preview',
        /** Mono, uppercase, tracked in — the eyebrow treatment as a chip. */
        code: 'bg-element font-mono text-[11px] tracking-[-0.3px] text-secondary uppercase',
        link: 'bg-transparent text-link underline-offset-4 hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
