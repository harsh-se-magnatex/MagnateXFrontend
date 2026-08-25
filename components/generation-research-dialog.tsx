'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Search } from 'lucide-react';
import {
  formatResearchContextForDisplay,
  hasViewableResearch,
  parseResearchSource,
  researchProviderLabel,
  type GenerationResearch,
} from '@/lib/generation-research';
import { Button } from '@/components/ui/button';
import { ResearchMarkdownContent } from '@/components/research-markdown-content';
import { lockBodyScroll } from '@/lib/body-scroll-lock';

type GenerationResearchDialogProps = {
  open: boolean;
  onClose: () => void;
  research: GenerationResearch | null;
  title?: string;
};

function ResearchSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h3>
      {children}
    </section>
  );
}

export function GenerationResearchDialog({
  open,
  onClose,
  research,
  title = 'Research context',
}: GenerationResearchDialogProps) {
  useEffect(() => {
    if (!open) return;
    const releaseBodyScroll = lockBodyScroll();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      releaseBodyScroll();
    };
  }, [open, onClose]);

  if (!open || !hasViewableResearch(research) || !research) return null;
  const contextText = research.context
    ? formatResearchContextForDisplay(research.context)
    : '';
    
  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center p-4 sm:p-6 bg-black/55 backdrop-blur-sm"
      style={{ minHeight: '100dvh', height: '100dvh' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="generation-research-dialog-title"
    >
      <div
        className="rounded-2xl border border-border bg-card text-foreground shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col min-h-0 overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 p-4 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Search className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <h2
              id="generation-research-dialog-title"
              className="text-lg font-semibold truncate"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            aria-label="Close research dialog"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-5 overscroll-contain">
          {research.contentTypeLabel || research.contentType ? (
            <ResearchSection label="Content type">
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-sm font-medium text-foreground">
                  {research.contentTypeLabel ?? research.contentType}
                </p>
                {research.contentTypeLabel &&
                research.contentType &&
                research.contentTypeLabel.toLowerCase() !==
                  research.contentType.replace(/_/g, ' ').toLowerCase() ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {research.contentType}
                  </p>
                ) : null}
              </div>
            </ResearchSection>
          ) : null}

          {research.contentAngle ? (
            <ResearchSection label="Content angle">
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <ResearchMarkdownContent markdown={research.contentAngle} />
              </div>
            </ResearchSection>
          ) : null}

          {contextText ? (
            <ResearchSection label="Industry research">
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <ResearchMarkdownContent markdown={contextText} />
              </div>
            </ResearchSection>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-border bg-muted/30 px-4 py-3 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
