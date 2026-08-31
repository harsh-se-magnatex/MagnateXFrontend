'use client';

import { useRef } from 'react';
import { Send, Square } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/src/stores/chatStore';

const SUGGESTED_PROMPTS = [
  'What does Create Post do?',
  'Suggest a Diwali post for me',
  'Summarize my Instagram analytics',
  'Why did my last post fail?',
];

export function ChatComposer() {
  const draft = useChatStore((s) => s.composerDraft);
  const setDraft = useChatStore((s) => s.setComposerDraft);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const abortStream = useChatStore((s) => s.abortStream);
  const usage = useChatStore((s) => s.usage);
  const messages = useChatStore((s) => s.messages);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const atCap = usage != null && usage.used >= usage.cap;
  const canSend = !isStreaming && draft.trim().length > 0 && !atCap;
  const showSuggestions = messages.length === 0 && !isStreaming;

  const submit = () => {
    if (!canSend) return;
    void sendMessage(draft);
  };

  return (
    <div className="border-t border-default bg-background px-3 pb-3 pt-2">
      {showSuggestions && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                setDraft(prompt);
                textareaRef.current?.focus();
              }}
              className="rounded-full border border-default bg-element px-2.5 py-1 text-[11px] text-secondary transition-expo hover:bg-element"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-1.5">
        <Textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={
            atCap
              ? 'Limit reached — try again after the window resets.'
              : 'Ask about SocioGenie, your brand, or your analytics…'
          }
          rows={2}
          disabled={atCap}
          className={cn(
            'min-h-12 max-h-40 resize-none text-sm',
            atCap && 'opacity-60'
          )}
        />
        {isStreaming ? (
          <Button
            type="button"
            variant="outline"
            onClick={abortStream}
            className="h-12 w-12 p-0"
            aria-label="Stop generating"
          >
            <Square />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={submit}
            disabled={!canSend}
            className="h-12 w-12 p-0"
            aria-label="Send"
          >
            <Send />
          </Button>
        )}
      </div>
      <p className="mt-1.5 text-[10px] text-secondary">
        Drafts only. The bot never enqueues jobs — open the linked page to run
        them.
      </p>
    </div>
  );
}
