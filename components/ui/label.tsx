import * as React from 'react';
import { Label as LabelPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

/** 14px/500 `text-default`, 8px above the control it labels. */
function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-sm leading-none font-medium text-default select-none',
        'group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:text-quaternary',
        'peer-disabled:cursor-not-allowed peer-disabled:text-quaternary',
        className
      )}
      {...props}
    />
  );
}

export { Label };
