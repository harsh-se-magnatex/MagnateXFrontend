'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Tabs as TabsPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

function Tabs({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        'group/tabs flex gap-4 data-horizontal:flex-col',
        className
      )}
      {...props}
    />
  );
}

/**
 * Two shapes, and they are not interchangeable.
 *
 * `default` is a segmented pill: a `bg-element` track with a fully round
 * thumb riding on it. It is for switching between peer views of the same
 * data — Instagram / Facebook / LinkedIn.
 *
 * `line` is an underline rail, for page-level sections where the tabs are
 * navigation rather than a control. The active mark is a 2px step-12 rule,
 * not a filled shape.
 */
const tabsListVariants = cva(
  [
    'group/tabs-list inline-flex w-fit items-center justify-center text-secondary',
    'group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'gap-1 rounded-full bg-element p-1 group-data-horizontal/tabs:h-9',
        line: 'gap-1 rounded-none border-b border-default bg-transparent group-data-horizontal/tabs:h-9 group-data-vertical/tabs:border-r group-data-vertical/tabs:border-b-0',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function TabsList({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'relative inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap px-3 text-sm font-medium text-secondary',
        'transition-[color,background-color] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]',
        'outline-none hover:text-default focus-visible:ring-2 focus-visible:ring-strong',
        'disabled:pointer-events-none disabled:text-quaternary',
        'group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // Segmented pill: the thumb is a full-radius `bg-default` surface.
        'group-data-[variant=default]/tabs-list:h-7 group-data-[variant=default]/tabs-list:rounded-full',
        'group-data-[variant=default]/tabs-list:data-active:bg-default group-data-[variant=default]/tabs-list:data-active:text-default',
        // Underline rail: a 2px step-12 rule, nothing filled.
        'group-data-[variant=line]/tabs-list:h-9 group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:bg-transparent',
        'group-data-[variant=line]/tabs-list:data-active:text-default',
        'after:absolute after:bg-[var(--text-default)] after:opacity-0 after:transition-opacity after:duration-150',
        'group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:-bottom-px group-data-horizontal/tabs:after:h-0.5',
        'group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-px group-data-vertical/tabs:after:w-0.5',
        'group-data-[variant=line]/tabs-list:data-active:after:opacity-100',
        className
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 text-sm text-secondary outline-none', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
