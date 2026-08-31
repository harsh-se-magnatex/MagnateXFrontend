'use client';

import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { AssistantToolResult } from '@/src/service/api/assistant.service';

interface ChatToolResultCardProps {
  result: AssistantToolResult;
  /** When provided, renders an X button in the top-right of the card. */
  onDismiss?: () => void;
}

function DismissButton({ onDismiss }: { onDismiss?: () => void }) {
  if (!onDismiss) return null;
  return (
    <button
      type="button"
      onClick={onDismiss}
      aria-label="Dismiss"
      className="absolute right-1 top-1 inline-flex size-5 items-center justify-center rounded-full text-secondary transition-expo hover:bg-element hover:text-default"
    >
      <X className="size-3" />
    </button>
  );
}

function cardClass(extra?: string) {
  return cn('relative', extra);
}

function getString(
  payload: Record<string, unknown>,
  key: string
): string | null {
  const value = payload[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function getArrayString(
  payload: Record<string, unknown>,
  key: string
): string[] {
  const value = payload[key];
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is string => typeof v === 'string' && v.length > 0
  );
}

export function ChatToolResultCard({
  result,
  onDismiss,
}: ChatToolResultCardProps) {
  const payload = result.payload as Record<string, unknown>;
  // Reserve right-side padding when the dismiss button is rendered so the X
  // never overlaps the card heading.
  const rightPad = onDismiss ? 'pr-6' : '';

  if (result.kind === 'analytics_summary') {
    const platform = String(payload.platform ?? 'platform');
    if (payload.connected === false) {
      return (
        <div
          className={cardClass(
            cn(
              'mt-2 rounded-lg border border-dashed border-muted-foreground/40 bg-background/60 p-2 text-xs text-secondary',
              rightPad
            )
          )}
        >
          {platform} isn&apos;t connected yet — open Connected Accounts to add
          it.
          <DismissButton onDismiss={onDismiss} />
        </div>
      );
    }
    const followers = payload.followers as number | undefined;
    const reach = payload.reach as number | undefined;
    const engagements = payload.engagements as number | undefined;
    return (
      <div
        className={cardClass(
          cn(
            'mt-2 rounded-lg border border-default bg-background/60 p-2 text-xs',
            rightPad
          )
        )}
      >
        <div className="font-medium capitalize">{platform} snapshot</div>
        <ul className="mt-1 space-y-0.5 text-secondary">
          {followers != null && (
            <li>Followers: {followers.toLocaleString()}</li>
          )}
          {reach != null && <li>Reach: {reach.toLocaleString()}</li>}
          {engagements != null && (
            <li>Engagements: {engagements.toLocaleString()}</li>
          )}
        </ul>
        <DismissButton onDismiss={onDismiss} />
      </div>
    );
  }

  if (result.kind === 'error_explanation') {
    const friendly = getString(payload, 'friendly');
    const action = getString(payload, 'action');
    if (!friendly) return null;
    return (
      <div
        className={cardClass(
          cn(
            'mt-2 rounded-lg border border-warning bg-warning p-2 text-xs',
            rightPad
          )
        )}
      >
        <div className="font-medium text-warning dark:text-warning">
          What this means
        </div>
        <p className="mt-1 text-default">{friendly}</p>
        {action && (
          <p className="mt-1 text-secondary">
            <strong className="font-medium">Next:</strong> {action}
          </p>
        )}
        <DismissButton onDismiss={onDismiss} />
      </div>
    );
  }

  if (result.kind === 'draft_quick' || result.kind === 'draft_advert') {
    const summary = getString(payload, 'summary');
    const prompt = getString(payload, 'prompt');
    const hashtags = getArrayString(payload, 'hashtags');
    return (
      <div
        className={cardClass(
          cn(
            'mt-2 rounded-lg border border-default bg-background/60 p-2 text-xs',
            rightPad
          )
        )}
      >
        {summary && <div className="font-medium text-default">{summary}</div>}
        {prompt && (
          <details className="mt-1">
            <summary className="cursor-pointer select-none text-secondary">
              View generation prompt
            </summary>
            <p className="mt-1 whitespace-pre-wrap text-secondary">{prompt}</p>
          </details>
        )}
        {hashtags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-secondary">
            {hashtags.map((tag) => (
              <span key={tag} className="rounded bg-element px-1.5 py-0.5">
                {tag.startsWith('#') ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        )}
        <DismissButton onDismiss={onDismiss} />
      </div>
    );
  }

  if (result.kind === 'festival_info') {
    const festivals = Array.isArray(payload.festivals)
      ? (payload.festivals as Array<Record<string, unknown>>)
      : [];
    if (festivals.length === 0) {
      return (
        <div
          className={cardClass(
            cn(
              'mt-2 rounded-lg border border-dashed border-muted-foreground/40 bg-background/60 p-2 text-xs text-secondary',
              rightPad
            )
          )}
        >
          No major festivals in the next few weeks.
          <DismissButton onDismiss={onDismiss} />
        </div>
      );
    }
    return (
      <div
        className={cardClass(
          cn(
            'mt-2 rounded-lg border border-default bg-background/60 p-2 text-xs',
            rightPad
          )
        )}
      >
        <div className="mb-1 font-medium text-default">Upcoming festivals</div>
        <ul className="space-y-1">
          {festivals.slice(0, 5).map((f) => {
            const name = typeof f.name === 'string' ? f.name : 'Festival';
            const date = typeof f.date === 'string' ? f.date : '';
            const daysAway =
              typeof f.daysAway === 'number' ? f.daysAway : undefined;
            const approximate = Boolean(f.approximate);
            const whyItFits =
              typeof f.whyItFits === 'string' ? f.whyItFits : '';
            return (
              <li key={`${name}-${date}`} className="text-default">
                <span className="font-medium">{name}</span>{' '}
                <span className="text-secondary">
                  · {date}
                  {daysAway != null &&
                    ` (${daysAway}d${approximate ? ' approx' : ''})`}
                </span>
                {whyItFits && <div className="text-secondary">{whyItFits}</div>}
              </li>
            );
          })}
        </ul>
        <p className="mt-1.5 text-[11px] text-secondary">
          Pick the event on the Occasion Posts page — the engine writes the
          caption and image for you from your brand context.
        </p>
        <DismissButton onDismiss={onDismiss} />
      </div>
    );
  }

  return null;
}
