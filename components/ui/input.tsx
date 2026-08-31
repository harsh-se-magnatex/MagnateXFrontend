import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * 36px tall so it lines up with a button, and 12px radius — inputs are
 * deliberately *not* pills. Background is `bg-element`, the same step a
 * secondary button sits on.
 *
 * Focus promotes the border to step 8 and adds nothing else. No glow, no
 * coloured ring: the border change is the whole affordance.
 */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-9 w-full min-w-0 rounded-lg border border-default bg-element px-3 py-1 text-base text-default outline-none md:text-sm',
        'transition-[border-color,background-color] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]',
        'placeholder:text-quaternary',
        'focus-visible:border-strong',
        'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-default',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-subtle disabled:text-quaternary',
        'aria-invalid:border-danger',
        className
      )}
      {...props}
    />
  );
}

export { Input };
