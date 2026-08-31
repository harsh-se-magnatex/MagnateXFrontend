import * as React from 'react';

import { cn } from '@/lib/utils';

/** Same surface language as Input — element background, 12px radius, border
 *  promotion on focus. Only the height rule differs. */
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-16 w-full rounded-lg border border-default bg-element px-3 py-2 text-base leading-relaxed text-default outline-none md:text-sm',
        'transition-[border-color,background-color] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]',
        'placeholder:text-quaternary',
        'focus-visible:border-strong',
        'disabled:cursor-not-allowed disabled:bg-subtle disabled:text-quaternary',
        'aria-invalid:border-danger',
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
