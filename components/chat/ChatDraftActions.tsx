'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  putAssistantPrefill,
  type AssistantPrefillKind,
} from '@/lib/assistant-prefill-store';
import type { AssistantToolResult } from '@/src/service/api/assistant.service';

interface ChatDraftActionsProps {
  result: AssistantToolResult;
}

interface DraftSummary {
  /** Prefill kind to push into sessionStorage when the user clicks the CTA. */
  prefillKind: AssistantPrefillKind | null;
  label: string;
  ctaDeepLink: string;
  promptText?: string;
}

function summariseDraft(result: AssistantToolResult): DraftSummary | null {
  const payload = result.payload as Record<string, unknown>;
  const link =
    typeof payload.ctaDeepLink === 'string' ? payload.ctaDeepLink : null;
  const prompt =
    typeof payload.prompt === 'string' ? (payload.prompt as string) : undefined;

  switch (result.kind) {
    case 'draft_quick':
      return {
        prefillKind: 'draft_quick',
        label: 'Open in Quick Create',
        ctaDeepLink: link || '/instant-generation',
        promptText: prompt,
      };
    case 'draft_advert':
      return {
        prefillKind: 'draft_advert',
        label: 'Open in Product Advert',
        ctaDeepLink: link || '/product-advert',
        promptText: prompt,
      };
    case 'festival_info':
      // No prefill — Bulk Create and Festive Post don't accept user prompts.
      // We just deep-link to the page so the user can pick an event there.
      return {
        prefillKind: null,
        label: 'Open Festive Post',
        ctaDeepLink: link || '/festive-post',
      };
    default:
      return null;
  }
}

export function ChatDraftActions({ result }: ChatDraftActionsProps) {
  const summary = summariseDraft(result);
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  if (!summary) return null;

  const handleOpen = () => {
    if (summary.prefillKind) {
      const id = putAssistantPrefill({
        kind: summary.prefillKind,
        payload: result.payload,
      });
      const url = id
        ? `${summary.ctaDeepLink}?assistantPrefill=${id}`
        : summary.ctaDeepLink;
      router.push(url);
      return;
    }
    router.push(summary.ctaDeepLink);
  };

  const handleCopy = async () => {
    if (!summary.promptText) return;
    try {
      await navigator.clipboard.writeText(summary.promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <Button
        type="button"
        size="sm"
        variant="default"
        onClick={handleOpen}
        data-icon="inline-end"
      >
        {summary.label}
        <ArrowRight />
      </Button>
      {summary.promptText && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleCopy}
          data-icon="inline-start"
        >
          {copied ? <Check /> : <Copy />}
          <span className={cn(copied && 'text-emerald-600')}>
            {copied ? 'Copied' : 'Copy prompt'}
          </span>
        </Button>
      )}
    </div>
  );
}
