'use client';

import { useEffect, useRef, useState } from 'react';
import { History, Plus, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useChatStore } from '@/src/stores/chatStore';

import { ChatComposer } from './ChatComposer';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatRateLimitChip } from './ChatRateLimitChip';
import { ChatThreadList } from './ChatThreadList';

export function ChatSheet() {
  const open = useChatStore((s) => s.open);
  const setOpen = useChatStore((s) => s.setOpen);
  const messages = useChatStore((s) => s.messages);
  const usage = useChatStore((s) => s.usage);
  const streamError = useChatStore((s) => s.streamError);
  const startNew = useChatStore((s) => s.startNewConversation);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const isStreaming = useChatStore((s) => s.isStreaming);

  const [showThreads, setShowThreads] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Snap to the bottom of the thread whenever new content lands.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming]);

  // When the sheet opens, the scrollable container is only mounted after the
  // Radix portal animation. Snap to the bottom on the next two animation
  // frames plus once more after the slide-in finishes (~220ms), so the user
  // always lands on the latest message instead of the top of the history.
  useEffect(() => {
    if (!open || showThreads) return;
    let cancelled = false;
    const rafIds: number[] = [];
    const timeoutIds: number[] = [];
    const snap = () => {
      const el = scrollRef.current;
      if (cancelled || !el) return;
      el.scrollTop = el.scrollHeight;
    };
    rafIds.push(requestAnimationFrame(snap));
    rafIds.push(requestAnimationFrame(() => requestAnimationFrame(snap)));
    timeoutIds.push(window.setTimeout(snap, 220));
    return () => {
      cancelled = true;
      rafIds.forEach(cancelAnimationFrame);
      timeoutIds.forEach(window.clearTimeout);
    };
  }, [open, showThreads, messages.length]);

  useEffect(() => {
    if (!open) setShowThreads(false);
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        showCloseButton
        className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border p-3">
          <div className="flex items-center gap-2 pr-8">
            <Sparkles className="size-4 text-primary" />
            <SheetTitle className="text-sm font-semibold">
              SocioGenie Assistant
            </SheetTitle>
            <div className="ml-auto flex items-center gap-1">
              <ChatRateLimitChip usage={usage} />
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => setShowThreads((v) => !v)}
                aria-label="Show conversation history"
                aria-expanded={showThreads}
              >
                <History />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => {
                  void startNew();
                  setShowThreads(false);
                }}
                aria-label="New conversation"
              >
                <Plus />
              </Button>
            </div>
          </div>
          <SheetDescription className="text-[11px] text-muted-foreground">
            Brand-aware drafts and product help. Nothing here gets posted automatically.
          </SheetDescription>
        </SheetHeader>

        {showThreads ? (
          <ChatThreadList onClose={() => setShowThreads(false)} />
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto py-3">
              {messages.length === 0 ? (
                <EmptyState />
              ) : (
                messages.map((m) => (
                  <ChatMessageItem key={m.id} message={m} />
                ))
              )}
              {streamError && (
                <div className="mx-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {streamError}
                </div>
              )}
            </div>
            <ChatComposer />
          </>
        )}

        {!activeConversationId && messages.length === 0 && (
          <div className="sr-only" aria-hidden>
            new conversation
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function EmptyState() {
  return (
    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
      <div className="mx-auto mb-2 inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="size-4" />
      </div>
      <p className="text-foreground">Hi! I&apos;m the SocioGenie assistant.</p>
      <p className="mt-1 text-[12px]">
        Ask me anything about your brand, your analytics, or a SocioGenie feature.
      </p>
      <p className="mt-1 text-[11px]">
        I can also draft posts, campaigns, festive ideas, or product ads — you decide when to run them.
      </p>
    </div>
  );
}
