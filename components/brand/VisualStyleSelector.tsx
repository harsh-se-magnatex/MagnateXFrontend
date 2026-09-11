'use client';

import { useEffect, useState } from 'react';
import { Check, Palette, Sparkles } from 'lucide-react';
import { PageLookPreview } from '@/components/onboarding/PageLookPreview';
import { getVisualStyle, setVisualStyle, type VisualStyleStatus } from '@/src/service/api/template-dna.service';
import { showErrorToast } from '@/lib/show-error-toast';

type Props = { imageStyle?: string; businessName?: string; brandColors?: string[] };

export function VisualStyleSelector({ imageStyle = '', businessName = '', brandColors = [] }: Props) {
  const [status, setStatus] = useState<VisualStyleStatus>();
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<VisualStyleStatus['source']>('brand');
  useEffect(() => { void getVisualStyle().then(next => { setStatus(next); setExpanded(next.source); }).catch(() => showErrorToast('Could not load visual style preference.')); }, []);
  async function choose(source: VisualStyleStatus['source']) {
    setExpanded(source); setSaving(true);
    try { const next = await setVisualStyle(source); setStatus(next); window.dispatchEvent(new CustomEvent('visual-style-changed', { detail: source })); }
    catch { showErrorToast('Could not save visual style preference.'); } finally { setSaving(false); }
  }
  const active = status?.source;
  const colors = brandColors.filter(Boolean).slice(0, 3);
  return <section className="overflow-hidden rounded-3xl border border-default bg-card shadow-sm">
    <div className="border-b border-default bg-linear-to-br from-card via-card to-primary-purple/5 p-5 sm:p-6"><div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-purple/10 text-primary-purple"><Palette className="size-5" /></div><div><div className="mb-1 inline-flex items-center gap-2 text-xs font-semibold text-primary-purple"><Sparkles className="size-3.5" />Creative direction</div><h2 className="text-lg font-semibold text-default">Choose your visual source</h2><p className="mt-1 text-sm leading-6 text-secondary">Pick one source for new content. Select a box to see what it contains.</p></div></div></div>
    <div role="group" aria-label="Image creation style" className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">{(['brand', 'template_dna'] as const).map(source => { const selected = expanded === source; const isTemplate = source === 'template_dna'; return <button type="button" key={source} aria-pressed={active === source} disabled={!status || saving} onClick={() => void choose(source)} className={`relative rounded-2xl border p-5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'border-primary-purple bg-primary-purple/8 ring-2 ring-primary-purple/20' : 'border-default bg-element hover:border-primary-purple/50 hover:bg-card'}`}>{active === source && <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-primary-purple text-white"><Check className="size-4" /></span>}<p className="pr-7 text-base font-semibold text-default">{isTemplate ? 'Template DNA' : 'How It Looks + Brand Colors'}</p></button>; })}</div>
    {expanded === 'brand' ? <div className="grid gap-5 border-t border-default p-5 sm:grid-cols-[1fr_220px] sm:p-6"><div><p className="text-sm font-semibold text-default">How It Looks &amp; Brand Colors</p><p className="mt-1 text-sm leading-6 text-secondary">Your selected page look and palette will guide every generated visual.</p><div className="mt-4 flex flex-wrap gap-2">{colors.length ? colors.map((color, index) => <span key={`${color}-${index}`} className="inline-flex items-center gap-2 rounded-full border border-default bg-element px-3 py-1.5 text-xs text-secondary"><span className="size-4 rounded-full border border-black/10" style={{ backgroundColor: color }} />{color}</span>) : <span className="text-xs text-secondary">Add brand colors below to preview your palette.</span>}</div></div><PageLookPreview value={imageStyle} businessName={businessName} /></div> : <div className="border-t border-default bg-element/50 p-5 sm:p-6"><p className="text-sm font-semibold text-default">Template DNA values</p><p className="mt-1 text-sm leading-6 text-secondary">Recurring layouts, typography, spacing, and color rules are used where Template DNA is configured.</p><p className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-5 text-amber-800">For platforms without Template DNA, How It Looks and Brand Colors will be used automatically.</p></div>}
  </section>;
}
