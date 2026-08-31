import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * Every variant is a full pill: 36px tall, 14px/500, `rounded-full`, `gap-2`.
 *
 * Three things about this set are deliberate and easy to undo by accident:
 *
 * 1. `default` carries the brand gradient. An earlier pass made it pure
 *    white-on-dark on the reasoning that a CTA should be the highest-contrast
 *    thing on screen — correct for a developer tool, wrong for this product.
 *    A social-media marketing app whose main button is greyscale is arguing
 *    against its own pitch. `variant="neutral"` is the high-contrast one, for
 *    surfaces that need to stay quiet.
 *
 * 2. Colour still means something everywhere else. Status stays green /
 *    amber / red, and none of those is ever a gradient — the sweep is brand
 *    expression, and confusing the two is how a palette stops communicating.
 *
 * 3. Disabled states never use `opacity`. Each variant names an explicit
 *    disabled background / border / text token, so a disabled control stays
 *    legible instead of dissolving into the page.
 *
 * Motion is the system's one curve at its one state duration: named
 * properties, 150ms, cubic-bezier(0.4, 0, 0.2, 1). No transform on press —
 * a button that moves is a different design language.
 */
const buttonVariants = cva(
  [
    'group/button inline-flex shrink-0 cursor-pointer items-center justify-center',
    'whitespace-nowrap rounded-full border border-solid border-transparent',
    'text-sm font-medium outline-none select-none',
    'transition-[color,background-color,border-color,box-shadow] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]',
    'focus-visible:ring-2 focus-visible:ring-strong focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-screen)]',
    'disabled:pointer-events-none disabled:cursor-not-allowed',
    'aria-invalid:border-danger',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(' '),
  {
    variants: {
      variant: {
        // The product's primary action carries the brand sweep. This is a
        // tool for making colourful things; its main button should look like
        // it belongs to one. Hover brightens rather than moves — the 150ms
        // colour rule still holds.
        default: 'btn-brand-fill',
        primary: 'btn-brand-fill',
        // Maximum-contrast primary, no hue. For surfaces that need to stay
        // calm — dense tables, destructive confirmations, anywhere a second
        // gradient would compete with the one already on screen.
        neutral: 'btn-brand-fill',
        // Filled neutral: element background, one step up on hover.
        secondary:
          'bg-element text-default hover:bg-selected disabled:bg-subtle disabled:text-quaternary aria-expanded:bg-selected',
        // Bordered, transparent fill — Expo's "tertiary".
        outline:
          'border-default bg-transparent text-default hover:bg-element disabled:border-soft disabled:text-quaternary aria-expanded:bg-element',
        tertiary:
          'border-default bg-transparent text-default hover:bg-element disabled:border-soft disabled:text-quaternary aria-expanded:bg-element',
        // No fill, no border — hierarchy from colour alone.
        ghost:
          'bg-transparent text-secondary hover:bg-element hover:text-default disabled:text-quaternary aria-expanded:bg-element aria-expanded:text-default',
        quaternary:
          'bg-transparent text-default hover:bg-element disabled:text-quaternary',
        // Solid destructive: step 10 fill, step 11 on hover.
        destructive:
          'bg-danger-solid text-white hover:bg-danger-solid-hover disabled:bg-danger disabled:text-quaternary focus-visible:ring-[var(--border-danger)]',
        // Quiet destructive for inline row actions.
        'destructive-soft':
          'bg-danger text-danger border-danger hover:bg-danger-solid hover:text-white hover:border-transparent disabled:text-quaternary',
        // Alias kept so existing `variant="brand"` call sites keep working.
        brand: 'btn-brand-fill',
        link: 'bg-transparent text-link underline-offset-4 hover:underline',
      },
      size: {
        // 36px is the system height — inputs and nav pills match it.
        default: 'h-9 gap-2 px-4',
        xs: "h-6 gap-1.5 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-11 gap-2 px-6',
        icon: 'size-9',
        'icon-xs': "size-6 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        'icon-lg': 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
