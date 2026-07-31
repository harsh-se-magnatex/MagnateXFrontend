'use client';

/**
 * Phone mock preview for page-look presets.
 * Currently unused — wired from PageLookSelector when preview panel is re-enabled.
 */

import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { PAGE_LOOK_PRESETS } from '@/lib/page-look-styles';
import {
  CUSTOM_PAGE_LOOK_PREVIEW,
  PAGE_LOOK_PREVIEW_THEMES,
  type PageLookPreviewTheme,
} from '@/lib/page-look-preview-themes';

type PageLookPreviewProps = {
  value: string;
  businessName?: string;
  className?: string;
};

function resolvePreview(value: string): {
  theme: PageLookPreviewTheme;
  label: string;
  isCustom: boolean;
} {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      theme: PAGE_LOOK_PREVIEW_THEMES.minimalistic,
      label: 'Pick a style',
      isCustom: false,
    };
  }

  const preset = PAGE_LOOK_PRESETS.find(
    (p) => p.label.toLowerCase() === trimmed.toLowerCase()
  );
  if (preset) {
    return {
      theme: PAGE_LOOK_PREVIEW_THEMES[preset.id],
      label: preset.label,
      isCustom: false,
    };
  }

  return {
    theme: CUSTOM_PAGE_LOOK_PREVIEW,
    label: trimmed,
    isCustom: true,
  };
}

export function PageLookPreview({
  value,
  businessName,
  className,
}: PageLookPreviewProps) {
  const { theme, label, isCustom } = resolvePreview(value);
  const displayName = businessName?.trim() || 'Your brand';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border/60 p-4',
        `bg-gradient-to-br ${theme.shellBg}`,
        className
      )}
    >
      <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Page preview
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={label}
          initial={{ opacity: 0, scale: 0.96, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -4 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className={cn(
              'mx-auto w-full max-w-[220px] overflow-hidden rounded-[1.35rem] border-2 bg-white shadow-xl',
              theme.frameClass
            )}
          >
        {/* Status bar */}
        <div className="flex items-center justify-between bg-black/90 px-3 py-1">
          <span className="text-[8px] font-medium text-white/90">9:41</span>
          <div className="flex gap-0.5">
            <span className="size-1 rounded-full bg-white/80" />
            <span className="size-1 rounded-full bg-white/80" />
            <span className="size-1 rounded-full bg-white/60" />
          </div>
        </div>

        {/* App header */}
        <div
          className={cn(
            'flex items-center justify-between px-3 py-2',
            theme.headerBg,
            theme.headerText
          )}
        >
          <span className="text-[10px] font-bold truncate max-w-[120px]">
            {displayName}
          </span>
          <div className="flex gap-1">
            <span className="size-2 rounded-full bg-current opacity-40" />
            <span className="size-2 rounded-full bg-current opacity-40" />
          </div>
        </div>

        {/* Profile hero */}
        <div className={cn('px-3 py-3', theme.heroBg)}>
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                'size-10 shrink-0 rounded-full shadow-sm',
                theme.heroAccent
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold text-foreground">
                {displayName}
              </p>
              <p className={cn('text-[9px] leading-snug', theme.bioClass)}>
                {isCustom ? `"${label}"` : theme.vibeLine}
              </p>
            </div>
          </div>
          <div className="mt-2.5 flex gap-1">
            <div className="h-1.5 flex-1 rounded-full bg-black/10" />
            <div className="h-1.5 w-8 rounded-full bg-black/5" />
          </div>
        </div>

        {/* Post grid */}
        <div className="grid grid-cols-3 gap-0.5 bg-white p-0.5">
          {theme.tileStyles.map((tileClass, i) => (
            <div
              key={i}
              className={cn('aspect-square rounded-sm', tileClass)}
            />
          ))}
        </div>

        {/* Bottom nav hint */}
        <div className="flex justify-center gap-3 border-t border-black/5 bg-white py-2">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn(
                'size-2 rounded-full',
                i === 0 ? theme.heroAccent : 'bg-black/10'
              )}
            />
          ))}
        </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <p className="mt-3 text-center text-xs font-medium text-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-center text-[10px] text-muted-foreground">
        {isCustom ? 'Custom look' : theme.vibeLine}
      </p>
    </div>
  );
}
