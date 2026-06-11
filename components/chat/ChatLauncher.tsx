'use client';

import { MessageCircle, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/src/stores/chatStore';

export function ChatLauncher() {
  const open = useChatStore((s) => s.open);
  const setOpen = useChatStore((s) => s.setOpen);

  return (
    <Button
      type="button"
      onClick={() => setOpen(!open)}
      aria-label={open ? 'Close assistant' : 'Open assistant'}
      className={cn(
        'fixed bottom-5 right-5 z-50 h-12 w-12 rounded-full p-0 shadow-lg',
        '[&>svg]:size-5'
      )}
      data-state={open ? 'open' : 'closed'}
    >
      {open ? <X /> : <MessageCircle />}
      <span className="sr-only">
        {open ? 'Close assistant' : 'Open assistant'}
      </span>
    </Button>
  );
}
