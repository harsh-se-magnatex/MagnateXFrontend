'use client';

import { cn } from '@/lib/utils';

export type BrandColors = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
};

type ColorKey = keyof BrandColors;
type Props = {
  value: BrandColors;
  onChange: (key: ColorKey, value: string) => void;
  disabled?: boolean;
  suggestions?: Partial<Record<ColorKey, string[]>>;
  idPrefix: string;
  className?: string;
};

const fields: Array<{ key: ColorKey; label: string; fallback: string }> = [
  { key: 'primaryColor', label: 'Primary', fallback: '#6366F1' },
  { key: 'secondaryColor', label: 'Secondary', fallback: '#8B5CF6' },
  { key: 'accentColor', label: 'Accent', fallback: '#F59E0B' },
];

export function isValidBrandColor(value: string): boolean {
  return !value.trim() || /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

function pickerColor(value: string, fallback: string): string {
  const color = value.trim();
  if (!isValidBrandColor(color) || !color) return fallback;
  return color.length === 4
    ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
    : color;
}

export function BrandColorsFields({ value, onChange, disabled = false, suggestions, idPrefix, className }: Props) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-3', className)}>
      {fields.map(({ key, label, fallback }) => {
        const current = value[key] ?? '';
        const invalid = !isValidBrandColor(current);
        return (
          <div key={key} className="rounded-xl border border-default bg-element p-3">
            <label htmlFor={`${idPrefix}-${key}`} className="mb-2 block text-xs font-semibold text-default">{label} color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label={`Pick ${label.toLowerCase()} brand color`}
                value={pickerColor(current, fallback)}
                onChange={event => onChange(key, event.target.value.toUpperCase())}
                disabled={disabled}
                className="size-10 shrink-0 cursor-pointer rounded-lg border border-default bg-transparent p-0.5 disabled:cursor-not-allowed"
              />
              <input
                id={`${idPrefix}-${key}`}
                type="text"
                value={current}
                onChange={event => onChange(key, event.target.value)}
                placeholder="#RRGGBB"
                maxLength={7}
                disabled={disabled}
                aria-invalid={invalid}
                className={cn('min-w-0 w-full rounded-lg border bg-card px-2.5 py-2 font-mono text-sm text-default outline-none focus:border-primary-purple', invalid ? 'border-red-500' : 'border-default')}
              />
            </div>
            {invalid && <p className="mt-1 text-xs text-red-600">Use a hex color such as #123ABC.</p>}
            {!!suggestions?.[key]?.length && (
              <div className="mt-2 flex flex-wrap gap-1.5" aria-label={`${label} color suggestions`}>
                {suggestions[key]?.slice(0, 5).map(color => (
                  <button key={color} type="button" onClick={() => onChange(key, color)} disabled={disabled} title={color} aria-label={`Use ${color} for ${label.toLowerCase()} color`} className="size-6 rounded-full border border-black/20 disabled:opacity-50" style={{ backgroundColor: color }} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
