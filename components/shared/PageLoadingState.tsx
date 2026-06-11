import { Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

type PageLoadingStateProps = {
  message?: string;
  className?: string;
};

export function PageLoadingState({
  message = 'Loading ...',
  className,
}: PageLoadingStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[50vh] items-center justify-center',
        className
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-lg shadow-primary-blue/20 animate-pulse">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {message}
        </span>
      </div>
    </div>
  );
}
