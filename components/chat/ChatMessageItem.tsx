'use client';

import { cn } from '@/lib/utils';
import { useChatStore, type ChatMessage } from '@/src/stores/chatStore';

import { ChatDraftActions } from './ChatDraftActions';
import { ChatToolResultCard } from './ChatToolResultCard';

interface ChatMessageItemProps {
  message: ChatMessage;
}

export function ChatMessageItem({ message }: ChatMessageItemProps) {
  const isDismissed = useChatStore((s) =>
    Boolean(message.id && s.dismissedToolResults[message.id])
  );
  const dismissToolResult = useChatStore((s) => s.dismissToolResult);

  if (message.role === 'user') {
    return (
      <div className="flex justify-end px-4">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-link-foreground whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  const refused = message.meta?.refused;
  const showToolResult = Boolean(message.toolResult) && !isDismissed;

  return (
    <div className="flex justify-start px-4">
      <div
        className={cn(
          'max-w-[90%] rounded-2xl rounded-bl-md bg-element px-3 py-2 text-sm text-default',
          refused &&
            'border border-dashed border-muted-foreground/40 bg-transparent italic text-secondary'
        )}
      >
        {message.pending && !message.content ? (
          <span className="inline-flex items-center gap-1 text-secondary">
            <span className="size-1.5 rounded-full bg-current opacity-60 animate-bounce [animation-delay:-0.2s]" />
            <span className="size-1.5 rounded-full bg-current opacity-60 animate-bounce [animation-delay:-0.1s]" />
            <span className="size-1.5 rounded-full bg-current opacity-60 animate-bounce" />
          </span>
        ) : (
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        )}

        {showToolResult && message.toolResult && (
          <>
            <ChatToolResultCard
              result={message.toolResult}
              onDismiss={() => dismissToolResult(message.id)}
            />
            <ChatDraftActions result={message.toolResult} />
          </>
        )}
      </div>
    </div>
  );
}
