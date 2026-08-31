import * as React from 'react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';
import { CheckIcon } from 'lucide-react';

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-default transition-expo outline-none group-has-disabled/field:text-quaternary after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-strong focus-visible:ring-2 focus-visible:ring-strong disabled:cursor-not-allowed disabled:text-quaternary aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-[var(--border-danger)] aria-invalid:aria-checked:border-danger data-checked:border-transparent data-checked:bg-[var(--purple-9)] data-checked:text-white ',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
