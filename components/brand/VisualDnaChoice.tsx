'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, Palette, RefreshCw, Sparkles, Upload } from 'lucide-react';
import { PAGE_LOOK_PRESETS } from '@/lib/page-look-styles';
import { SEVEN_VISUAL_STYLES } from '@/components/landing/seven-visuals/seven-visuals-data';
import { cn } from '@/lib/utils';
import { TemplateDnaReferenceSetup } from '@/components/brand/TemplateDnaReferenceSetup';
import { DnaStylePreview } from '@/components/brand/DnaStylePreview';
import { showErrorToast } from '@/lib/show-error-toast';
import {
  generateVisualStyle,
  getGeneratedVisualStyle,
  getVisualStyle,
  setVisualStyle,
  type GeneratedVisualStyle,
} from '@/src/service/api/template-dna.service';

type Props = {
  business?: Record<string, unknown>;
  onGenerated?: (style: GeneratedVisualStyle) => void;
  onLearnFromPosts?: () => void;
  compact?: boolean;
};

const fieldLabels: Array<[keyof GeneratedVisualStyle['fields'], string]> = [
  ['font', 'Font'],
  ['style', 'Style'],
  ['fontColor', 'Font color'],
  ['fontSize', 'Font size'],
];

export function VisualDnaChoice({ business, onGenerated, onLearnFromPosts, compact = false }: Props) {
  const [generated, setGenerated] = useState<GeneratedVisualStyle | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [switching, setSwitching] = useState<'create' | 'learn' | null>(null);
  const [selectedPath, setSelectedPath] = useState<'create' | 'learn' | null>(null);

  useEffect(() => {
    void Promise.all([getGeneratedVisualStyle(), getVisualStyle()])
      .then(([value, status]) => {
        if (value) setGenerated(value);
        if (status.source === 'template_dna') {
          setSelectedPath('learn');
          onLearnFromPosts?.();
        } else if (value) {
          setSelectedPath('create');
        }
      })
      .catch(() => { setLoadFailed(true); showErrorToast('Could not load your Template DNA preference.'); })
      .finally(() => setInitializing(false));
    // The initial source is loaded once; callbacks only reveal the matching block.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create(presetId: string) {
    setBusy(presetId);
    try {
      const next = await generateVisualStyle(presetId, business);
      setGenerated(next);
      setSelectedPath('create');
      setShowPresets(false);
      onGenerated?.(next);
      window.dispatchEvent(new CustomEvent('visual-style-changed', { detail: 'brand' }));
    } catch (error) {
      const detail = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      showErrorToast(detail || 'Could not generate your visual style. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function chooseLearn() {
    setSwitching('learn');
    try {
      await setVisualStyle('template_dna');
      setSelectedPath('learn');
      onLearnFromPosts?.();
      window.dispatchEvent(new CustomEvent('visual-style-changed', { detail: 'template_dna' }));
    } catch {
      showErrorToast('Could not switch the visual style source.');
    } finally {
      setSwitching(null);
    }
  }

  async function chooseCreate() {
    if (!generated) {
      setShowPresets(true);
      return;
    }
    setSwitching('create');
    try {
      await setVisualStyle('brand');
      setSelectedPath('create');
      setShowPresets(false);
      onGenerated?.(generated);
      window.dispatchEvent(new CustomEvent('visual-style-changed', { detail: 'brand' }));
    } catch {
      showErrorToast('Could not switch the visual style source.');
    } finally {
      setSwitching(null);
    }
  }

  if (initializing) {
    return <div className="flex min-h-44 items-center justify-center rounded-3xl border border-default bg-card"><div className="flex items-center gap-3 text-sm font-medium text-secondary"><Loader2 className="size-5 animate-spin text-primary-purple"/>Loading Template DNA…</div></div>;
  }
  if (loadFailed) {
    return <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-5 text-center"><p className="text-sm font-semibold text-default">Template DNA could not be loaded</p><p className="mt-1 text-xs text-secondary">Refresh the page before changing your visual source. Your saved selection has not been changed.</p></div>;
  }

  return <div className="space-y-5">
    <div className="grid gap-4 md:grid-cols-2">
      <section className={cn('rounded-3xl border bg-card p-5 transition-all', selectedPath === 'create' ? 'border-primary-purple ring-2 ring-primary-purple/15' : 'border-default', compact && 'p-4')}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-purple/10 text-primary-purple"><Sparkles className="size-5"/></span><div><h3 className="font-semibold text-default">Create your own</h3><p className="mt-1 text-xs leading-5 text-secondary">Let AI turn your business data and a visual direction into one style for every platform.</p></div></div>
          {selectedPath === 'create' && <Check className="size-5 shrink-0 text-primary-purple"/>}
        </div>
        {!generated && !showPresets && <button type="button" disabled={!!switching} onClick={() => void chooseCreate()} className="mt-5 w-full rounded-xl btn-brand-fill px-4 py-3 text-sm font-semibold disabled:opacity-50">Generate</button>}
        {generated && <div className="mt-5 space-y-3">
          <DnaStylePreview
            label={generated.label}
            colors={[
              generated.preview?.background,
              ...(generated.preview?.accentPalette ?? []),
              generated.fields.fontColor,
            ]}
            fontColor={generated.fields.fontColor}
            fontDescription={generated.fields.font}
            styleDescription={`${generated.fields.style} ${generated.preview?.composition ?? ''}`}
            presetId={generated.selectedPresetId}
            compact
          />
          <div className="grid gap-2 sm:grid-cols-2">{fieldLabels.map(([key, label]) => <div key={key} className="rounded-xl border border-default bg-element p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">{label}</p><div className="mt-1 flex items-center gap-2"><span className="text-sm font-medium text-default">{generated.fields[key]}</span>{key === 'fontColor' && <span className="size-5 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: generated.fields.fontColor }}/>}</div></div>)}</div>
          {selectedPath !== 'create' && <button type="button" disabled={!!switching} onClick={() => void chooseCreate()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl btn-brand-fill px-4 py-3 text-sm font-semibold disabled:opacity-50">{switching === 'create' && <Loader2 className="size-4 animate-spin"/>}Use this style</button>}
          <button type="button" disabled={!!switching} onClick={() => setShowPresets(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary-purple/30 px-4 py-3 text-sm font-semibold text-primary-purple disabled:opacity-50"><RefreshCw className="size-4"/>Regenerate</button>
        </div>}
      </section>
      <button type="button" disabled={!!switching || !!busy} onClick={() => void chooseLearn()} className={cn('rounded-3xl border bg-card p-5 text-left transition-all hover:border-primary-purple/50 disabled:opacity-60', selectedPath === 'learn' ? 'border-primary-purple ring-2 ring-primary-purple/15' : 'border-default', compact && 'p-4')}>
        <div className="flex items-start justify-between gap-3"><div className="flex gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-purple/10 text-primary-purple"><Upload className="size-5"/></span><div><h3 className="font-semibold text-default">Learn from my existing posts</h3><p className="mt-1 text-xs leading-5 text-secondary">Upload examples separately for Instagram, Facebook, and LinkedIn so AI can learn each format.</p></div></div>{selectedPath === 'learn' && <Check className="size-5 shrink-0 text-primary-purple"/>}</div>
        <span className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary-purple/30 px-4 py-3 text-sm font-semibold text-primary-purple">{switching === 'learn' && <Loader2 className="size-4 animate-spin"/>}{selectedPath === 'learn' ? 'Selected' : 'Switch to existing posts'}</span>
      </button>
    </div>
    {compact && selectedPath === 'learn' && <TemplateDnaReferenceSetup />}
    {showPresets && <section className="rounded-3xl border border-default bg-card p-5"><div className="mb-4 flex items-center gap-2"><Palette className="size-5 text-primary-purple"/><div><h3 className="font-semibold text-default">Choose a visual direction</h3><p className="text-xs text-secondary">AI will personalize this direction using your business data.</p></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{PAGE_LOOK_PRESETS.map(preset => { const previewId = preset.id === 'minimalistic' ? 'minimalist' : preset.id; const preview = SEVEN_VISUAL_STYLES.find(style => style.id === previewId)?.visuals[0]?.image; return <button key={preset.id} type="button" disabled={!!busy} onClick={() => void create(preset.id)} className="overflow-hidden rounded-2xl border border-default bg-element text-left transition-colors hover:border-primary-purple disabled:opacity-50">{preview && <span className="block aspect-[16/9] w-full bg-cover bg-center" style={{ backgroundImage: `url(${preview})` }} aria-hidden/>}<span className="block p-4"><span className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-default">{preset.label}</span>{busy === preset.id && <Loader2 className="size-4 animate-spin text-primary-purple"/>}</span><span className="mt-1 block text-xs leading-5 text-secondary">{preset.description}</span></span></button>; })}</div></section>}
  </div>;
}
