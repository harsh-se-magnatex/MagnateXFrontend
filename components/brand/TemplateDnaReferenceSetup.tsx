'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { ReferenceThumbnail } from '@/components/brand/TemplateDesignEditor';
import { showErrorToast } from '@/lib/show-error-toast';
import {
  extractTemplateDna, getTemplateDna, removeTemplateDnaReference,
  updateTemplateDna, uploadTemplateDnaReferences, type TemplateDnaProfile,
} from '@/src/service/api/template-dna.service';

const scope = 'brand';
const previewFieldLabels = [
  ['font', 'Font'],
  ['style', 'Style'],
  ['fontColor', 'Font color'],
  ['fontSize', 'Font size'],
] as const;

export function TemplateDnaReferenceSetup() {
  const [profile, setProfile] = useState<TemplateDnaProfile | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getTemplateDna().then(setProfile)
      .catch(() => showErrorToast('Could not load Template DNA.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (profile?.status !== 'extracting') return;
    const timer = window.setInterval(() => {
      void getTemplateDna().then(setProfile).catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [profile?.status]);

  async function uploadAndExtract() {
    if (!profile || profile.referenceAssets.length + files.length < 1) return;
    setBusy(true);
    try {
      if (files.length) {
        const uploaded = await uploadTemplateDnaReferences(scope, files);
        setProfile(uploaded);
        setFiles([]);
      }
      setProfile(await extractTemplateDna(scope));
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Could not extract Template DNA.');
      void getTemplateDna().then(setProfile).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try { setProfile(await removeTemplateDnaReference(scope, id)); }
    catch { showErrorToast('Could not remove that reference.'); }
    finally { setBusy(false); }
  }

  async function toggleEnabled() {
    if (!profile) return;
    setBusy(true);
    try { setProfile(await updateTemplateDna(scope, { ...profile, enabled: !profile.enabled })); }
    catch { showErrorToast('Could not change Template DNA.'); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="flex items-center gap-2 text-sm text-secondary"><Loader2 className="size-4 animate-spin" />Loading Template DNA…</div>;
  if (!profile) return <p className="text-sm text-secondary">Template DNA could not be loaded. Refresh to try again.</p>;

  const count = profile.referenceAssets.length;
  const total = count + files.length;
  const working = busy || profile.status === 'extracting';
  const preview = profile.preview;
  const fontColorHex = preview?.fields.fontColor.match(/#[0-9a-fA-F]{6}\b/)?.[0];
  return <section className="rounded-2xl border border-default bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-semibold text-default">Your brand Template DNA</h2><p className="mt-1 text-sm text-secondary">One visual identity for Instagram, Facebook, and LinkedIn. Add 1–8 posts that represent the brand you want to reproduce.</p></div>
      {profile.status === 'ready' && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="size-4" />Ready</span>}
    </div>
    <p className="mt-3 text-xs text-secondary">{count} saved · {files.length} selected · {profile.status.replaceAll('_', ' ')}</p>
    {count > 0 && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{profile.referenceAssets.map(asset => <div key={asset.id} className="group relative aspect-square overflow-hidden rounded-xl border border-default bg-element p-1"><ReferenceThumbnail platform={scope} id={asset.id} /><button type="button" aria-label="Remove reference" disabled={working} onClick={() => void remove(asset.id)} className="absolute right-1 top-1 rounded-md bg-card/90 p-1 text-secondary opacity-0 shadow group-hover:opacity-100 focus:opacity-100 disabled:opacity-40"><Trash2 className="size-4" /></button></div>)}</div>}
    {profile.extractedAt && preview && <div className="mt-5 space-y-3 border-t border-default pt-5">
      <h3 className="text-sm font-semibold text-default">Extracted style</h3>
      <div className="grid gap-2 sm:grid-cols-2">{previewFieldLabels.map(([key, label]) => <div key={key} className="rounded-xl border border-default bg-element p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">{label}</p><div className="mt-1 flex items-center gap-2"><span className="break-words text-sm font-medium text-default">{preview.fields[key]}</span>{key === 'fontColor' && fontColorHex && <span className="size-5 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: fontColorHex }} />}</div></div>)}</div>
    </div>}
    {files.length > 0 && <p className="mt-3 text-xs text-secondary">Selected: {files.map(file => file.name).join(', ')}</p>}
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {total < 8 && <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-primary-purple/40 bg-primary-purple/5 px-3 py-2 text-xs font-semibold text-primary-purple"><ImagePlus className="size-4" />Select posts<input type="file" className="sr-only" multiple accept="image/jpeg,image/png,image/webp" disabled={working} onChange={event => { const next = Array.from(event.target.files ?? []); event.target.value = ''; if (next.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) || count + next.length > 8) return showErrorToast('Use up to 8 JPEG, PNG or WebP images, no larger than 10 MB each.'); setFiles(next); }} /></label>}
      <button type="button" disabled={working || total < 1 || total > 8} onClick={() => void uploadAndExtract()} className="inline-flex items-center gap-2 rounded-xl btn-brand-fill px-3 py-2 text-xs font-semibold disabled:opacity-40">{working && <Loader2 className="size-4 animate-spin" />}{profile.extractedAt ? 'Update brand DNA' : 'Create brand DNA'}</button>
      {profile.extractedAt && <button type="button" disabled={working} onClick={() => void toggleEnabled()} className="rounded-xl border border-default px-3 py-2 text-xs font-semibold text-default disabled:opacity-40">{profile.enabled ? 'Disable' : 'Enable'}</button>}
    </div>
    {profile.lastError && <p className="mt-3 text-sm text-red-600">{profile.lastError}</p>}
  </section>;
}
