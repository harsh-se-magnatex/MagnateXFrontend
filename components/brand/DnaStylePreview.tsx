'use client';

import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  label?: string;
  platform?: string;
  colors?: unknown;
  fontColor?: string;
  fontDescription?: unknown;
  styleDescription?: unknown;
  presetId?: string;
  compact?: boolean;
  className?: string;
};

const fallbackPalettes: Record<string, [string, string, string]> = {
  minimalistic: ['#F5F1E8', '#171717', '#C8B89A'],
  minimalist: ['#F5F1E8', '#171717', '#C8B89A'],
  maximalist: ['#7C3AED', '#FB7185', '#FACC15'],
  bold: ['#111827', '#F43F5E', '#F8FAFC'],
  elegant: ['#2C2624', '#D5BDAF', '#F5EBE0'],
  playful: ['#0EA5E9', '#FB7185', '#FDE047'],
  vintage: ['#7C2D12', '#D6A756', '#F5E7C6'],
  professional: ['#172554', '#3B82F6', '#EFF6FF'],
};

function validColor(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return (
    /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value.trim()) ||
    /^rgba?\([\d.,%\s]+\)$/i.test(value.trim()) ||
    /^hsla?\([\d.,%\s]+\)$/i.test(value.trim())
  );
}

function colorList(value: unknown): string[] {
  const candidates = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? Object.values(value as Record<string, unknown>)
      : [];
  return candidates.filter(validColor).map(color => color.trim()).slice(0, 3);
}

function fontFamily(value: unknown): CSSProperties['fontFamily'] {
  const description = String(value ?? '').toLowerCase();
  if (description.includes('mono')) return 'ui-monospace, SFMono-Regular, Consolas, monospace';
  if (description.includes('serif')) return 'Georgia, Cambria, Times New Roman, serif';
  if (description.includes('condensed') || description.includes('narrow')) return 'Arial Narrow, Impact, sans-serif';
  if (description.includes('rounded') || description.includes('playful')) return 'Trebuchet MS, Arial, sans-serif';
  return 'Arial, Helvetica, sans-serif';
}

export function DnaStylePreview({
  label = 'Your Template DNA',
  platform,
  colors,
  fontColor,
  fontDescription,
  styleDescription,
  presetId = 'professional',
  compact = false,
  className,
}: Props) {
  const fallback = fallbackPalettes[presetId.toLowerCase()] ?? fallbackPalettes.professional;
  const extracted = colorList(colors);
  const palette = [
    extracted[0] ?? fallback[0],
    extracted[1] ?? fallback[1],
    extracted[2] ?? fallback[2],
  ];
  const copyColor = validColor(fontColor) ? fontColor : palette[2];
  const styleText = `${String(styleDescription ?? '')} ${presetId}`.toLowerCase();
  const energetic = /(bold|maximal|playful|vibrant|dynamic)/.test(styleText);
  const restrained = /(minimal|elegant|clean|refined)/.test(styleText);
  const typeStyle: CSSProperties = {
    color: copyColor,
    fontFamily: fontFamily(fontDescription),
    textTransform: energetic ? 'uppercase' : 'none',
    letterSpacing: restrained ? '-0.035em' : energetic ? '-0.055em' : '-0.025em',
  };

  return (
    <div className={cn('rounded-2xl border border-default bg-card p-3', className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-secondary">Post style preview</p>
          <p className="truncate text-xs font-semibold text-default">{label}</p>
        </div>
        {platform && <span className="rounded-full bg-primary-purple/10 px-2 py-1 text-[9px] font-bold uppercase text-primary-purple">{platform}</span>}
      </div>
      <div
        className={cn('relative isolate overflow-hidden rounded-xl border border-black/10 shadow-sm', compact ? 'aspect-[4/3]' : 'aspect-[4/5]')}
        style={{ background: `linear-gradient(145deg, ${palette[0]} 0%, ${palette[0]} 54%, ${palette[1]} 100%)` }}
        role="img"
        aria-label={`${label} example post`}
      >
        <span className="absolute -right-[18%] -top-[12%] size-[62%] rounded-full opacity-80 blur-[1px]" style={{ backgroundColor: palette[1] }} />
        <span className={cn('absolute rounded-full opacity-90', energetic ? '-left-[12%] bottom-[3%] size-[58%]' : 'bottom-[9%] right-[8%] size-[32%]')} style={{ backgroundColor: palette[2] }} />
        {!restrained && <span className="absolute left-[9%] top-[11%] h-1.5 w-[22%] rounded-full" style={{ backgroundColor: copyColor }} />}
        <div className="absolute inset-0 flex flex-col justify-between p-[10%]">
          <span className="relative z-10 text-[9px] font-semibold uppercase tracking-[0.2em] opacity-75" style={{ color: copyColor }}>Your brand</span>
          <div className="relative z-10 max-w-[88%]">
            <p className={cn('font-black leading-[0.93]', compact ? 'text-xl' : 'text-3xl')} style={typeStyle}>Ideas that move</p>
            <p className="mt-3 max-w-[80%] text-[10px] font-medium leading-4 opacity-80" style={{ color: copyColor, fontFamily: typeStyle.fontFamily }}>A consistent visual direction for every post you create.</p>
          </div>
          <div className="relative z-10 flex gap-1.5">
            {palette.map((color, index) => <span key={`${index}-${color}`} className="size-2.5 rounded-full border border-white/30" style={{ backgroundColor: color }} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
