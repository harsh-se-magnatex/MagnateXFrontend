'use client';

import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/src/stores/chatStore';

export function ChatThreadList({ onClose }: { onClose: () => void }) {
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeConversationId);
  const loadConversation = useChatStore((s) => s.loadConversation);
  const startNew = useChatStore((s) => s.startNewConversation);
  const removeConversation = useChatStore((s) => s.removeConversation);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="text-xs font-medium text-muted-foreground">
          Conversations
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={async () => {
            await startNew();
            onClose();
          }}
          data-icon="inline-start"
        >
          <Plus />
          New
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="px-3 py-4 text-xs text-muted-foreground">
            No conversations yet. Start by asking something below.
          </p>
        ) : (
          <ul className="space-y-0.5 p-1.5">
            {conversations.map((c) => (
              <li
                key={c.id}
                className={cn(
                  'group flex items-start gap-1 rounded-md p-2 hover:bg-muted',
                  activeId === c.id && 'bg-muted'
                )}
              >
                <button
                  type="button"
                  onClick={async () => {
                    await loadConversation(c.id);
                    onClose();
                  }}
                  className="flex-1 text-left"
                >
                  <div className="line-clamp-1 text-xs font-medium text-foreground">
                    {c.title}
                  </div>
                  {c.lastMessagePreview && (
                    <div className="line-clamp-1 text-[11px] text-muted-foreground">
                      {c.lastMessagePreview}
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void removeConversation(c.id)}
                  className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
