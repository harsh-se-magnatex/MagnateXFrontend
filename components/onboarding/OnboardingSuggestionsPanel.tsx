'use client';

import { CheckCircle2, Lightbulb, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type OnboardingColorSuggestions = {
  primary: string[];
  secondary: string[];
  accent: string[];
};

export type OnboardingFieldSuggestions = {
  logos: string[];
  hashtags: string[];
  slogans: string[];
  colors: OnboardingColorSuggestions;
};

type ColorRole = 'primary' | 'secondary' | 'accent';

type OnboardingSuggestionsPanelProps = {
  stepName: string;
  sourceLabel: 'website' | 'catalog' | null;
  suggestions: OnboardingFieldSuggestions;
  loading?: boolean;
  selectedKey: string | null;
  onSelectLogo: (url: string) => void;
  onSelectHashtag: (tag: string) => void;
  onSelectSlogan: (slogan: string) => void;
  onSelectColor: (field: string, hex: string) => void;
  selectedHashtagKeys: Set<string>;
  activeFieldValue: string;
};

function suggestionKey(field: string, value: string): string {
  return `${field}:${value}`;
}

function normalizeHex(hex: string): string {
  const t = hex.trim();
  return t.startsWith('#') ? t.toUpperCase() : `#${t.toUpperCase()}`;
}

const COLOR_STEP_LABELS: Record<string, { role: ColorRole; title: string }> = {
  primaryColor: { role: 'primary', title: 'Primary options' },
  secondaryColor: { role: 'secondary', title: 'Secondary options' },
  accentColor: { role: 'accent', title: 'Accent options' },
};

export function OnboardingSuggestionsPanel({
  stepName,
  sourceLabel,
  suggestions,
  loading,
  selectedKey,
  onSelectLogo,
  onSelectHashtag,
  onSelectSlogan,
  onSelectColor,
  selectedHashtagKeys,
  activeFieldValue,
}: OnboardingSuggestionsPanelProps) {
  const showLogos =
    stepName === 'logo' &&
    sourceLabel === 'website' &&
    suggestions.logos.length > 0;
  const showHashtags =
    stepName === 'hashtags' && suggestions.hashtags.length > 0;
  const showSlogans =
    stepName === 'brandSlogan' && suggestions.slogans.length > 0;

  const colorMeta = COLOR_STEP_LABELS[stepName];
  const colorOptions = colorMeta
    ? suggestions.colors[colorMeta.role]
    : [];
  const showColors = Boolean(colorMeta && colorOptions.length > 0);

  const hasContent = showLogos || showHashtags || showSlogans || showColors;

  if (!hasContent && !loading) return null;

  const sourceText =
    sourceLabel === 'catalog'
      ? 'From your catalog'
      : sourceLabel === 'website'
        ? 'From your website'
        : 'AI suggestions';

  const activeHex = normalizeHex(activeFieldValue || '');

  return (
    <aside
      className={cn(
        'flex w-full flex-col rounded-3xl border border-border/60 bg-card/80 shadow-lg backdrop-blur-sm',
        'lg:sticky lg:top-8 lg:w-[min(100%,280px)] lg:shrink-0 lg:self-start'
      )}
      aria-label="Field suggestions"
    >
      <div className="border-b border-border/50 px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded-xl bg-primary-blue/10 text-primary-blue">
            <Lightbulb className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Suggestions</p>
            <p className="truncate text-xs text-muted-foreground">{sourceText}</p>
          </div>
        </div>
      </div>

      <div className="max-h-[min(52vh,420px)] overflow-y-auto overscroll-contain px-4 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <Loader2 className="size-5 animate-spin text-primary-blue" />
            <p className="text-xs text-muted-foreground">Generating ideas…</p>
          </div>
        ) : null}

        {showLogos && (
          <div className="space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Logos
            </p>
            <div className="grid grid-cols-2 gap-2">
              {suggestions.logos.map((url) => {
                const key = suggestionKey('logo', url);
                const active = selectedKey === key;
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => onSelectLogo(url)}
                    className={cn(
                      'relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border-2 bg-background p-2 transition-all',
                      active
                        ? 'border-primary-purple ring-2 ring-primary-purple/30'
                        : 'border-border hover:border-primary-blue/50 hover:shadow-sm'
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt="Suggested logo"
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                    />
                    {active && (
                      <span className="absolute right-1.5 top-1.5 inline-flex size-5 items-center justify-center rounded-full bg-gradient-primary text-white shadow">
                        <CheckCircle2 className="size-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {showHashtags && (
          <div className="space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Hashtags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.hashtags.map((tag) => {
                const clean = tag.replace(/^#+/, '').trim();
                const on = selectedHashtagKeys.has(clean.toLowerCase());
                const key = suggestionKey('hashtag', clean);
                const active = selectedKey === key || on;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onSelectHashtag(clean)}
                    className={cn(
                      'inline-flex max-w-full items-center gap-1 truncate rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                      active
                        ? 'border-transparent bg-gradient-primary text-white shadow-sm'
                        : 'border-border bg-background text-foreground hover:border-primary-blue/40 hover:bg-primary-blue/5'
                    )}
                  >
                    {active && <CheckCircle2 className="size-3 shrink-0" />}#
                    {clean}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {showSlogans && (
          <div className="space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Slogans
            </p>
            <div className="flex flex-col gap-2">
              {suggestions.slogans.map((line) => {
                const key = suggestionKey('brandSlogan', line);
                const active =
                  selectedKey === key ||
                  activeFieldValue.trim() === line.trim();
                return (
                  <button
                    key={line}
                    type="button"
                    onClick={() => onSelectSlogan(line)}
                    className={cn(
                      'rounded-xl border px-3 py-2.5 text-left text-xs leading-relaxed transition-all',
                      active
                        ? 'border-primary-purple/60 bg-primary-purple/5 text-foreground shadow-sm ring-1 ring-primary-purple/20'
                        : 'border-border bg-background text-foreground hover:border-primary-blue/40 hover:bg-primary-blue/5'
                    )}
                  >
                    {line}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {showColors && colorMeta && (
          <div className="space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {colorMeta.title}
            </p>
            <div className="flex flex-col gap-2">
              {colorOptions.map((hex) => {
                const normalized = normalizeHex(hex);
                const field = stepName;
                const key = suggestionKey(field, normalized);
                const active =
                  selectedKey === key ||
                  (activeHex.length === 7 && activeHex === normalized);
                return (
                  <button
                    key={normalized}
                    type="button"
                    onClick={() => onSelectColor(field, normalized)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border-2 p-2.5 text-left transition-all',
                      active
                        ? 'border-primary-purple ring-2 ring-primary-purple/25'
                        : 'border-border hover:border-primary-blue/50'
                    )}
                  >
                    <span
                      className="size-9 shrink-0 rounded-lg border border-border shadow-inner"
                      style={{ backgroundColor: normalized }}
                    />
                    <span className="font-mono text-xs font-medium tracking-wide text-foreground">
                      {normalized}
                    </span>
                    {active && (
                      <CheckCircle2 className="ml-auto size-4 shrink-0 text-primary-purple" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
