'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { ReferenceThumbnail } from '@/components/brand/TemplateDesignEditor';
import { DnaStylePreview } from '@/components/brand/DnaStylePreview';
import { showErrorToast } from '@/lib/show-error-toast';
import {
  extractTemplateDna,
  getTemplateDna,
  removeTemplateDnaReference,
  uploadTemplateDnaReferences,
  type TemplateDnaPlatform,
  type TemplateDnaProfile,
} from '@/src/service/api/template-dna.service';

const platforms: TemplateDnaPlatform[] = ['instagram', 'facebook', 'linkedin'];

export function TemplateDnaReferenceSetup() {
  const [profiles, setProfiles] = useState<Partial<Record<TemplateDnaPlatform, TemplateDnaProfile>>>({});
  const [files, setFiles] = useState<Partial<Record<TemplateDnaPlatform, File[]>>>({});
  const [busy, setBusy] = useState<TemplateDnaPlatform | null>(null);

  useEffect(() => {
    void getTemplateDna()
      .then(data => setProfiles(Object.fromEntries((data as TemplateDnaProfile[]).map(profile => [profile.platform, profile]))))
      .catch(() => showErrorToast('Could not load your existing-post setup.'));
  }, []);

  async function uploadAndExtract(platform: TemplateDnaPlatform) {
    const selected = files[platform] ?? [];
    const currentCount = profiles[platform]?.referenceAssets.length ?? 0;
    if (currentCount + selected.length < 4) return showErrorToast(`Add ${4 - currentCount - selected.length} more reference ${4 - currentCount - selected.length === 1 ? 'image' : 'images'}.`);
    setBusy(platform);
    try {
      let profile = profiles[platform];
      if (selected.length) profile = await uploadTemplateDnaReferences(platform, selected);
      setProfiles(all => ({ ...all, [platform]: profile }));
      setFiles(all => ({ ...all, [platform]: [] }));
      const extracted = await extractTemplateDna(platform);
      setProfiles(all => ({ ...all, [platform]: extracted }));
    } catch (error) {
      const detail = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      showErrorToast(detail || (error instanceof Error ? error.message : 'Could not extract Template DNA.'));
    } finally {
      setBusy(null);
    }
  }

  async function remove(platform: TemplateDnaPlatform, id: string) {
    setBusy(platform);
    try {
      const next = await removeTemplateDnaReference(platform, id);
      setProfiles(all => ({ ...all, [platform]: next }));
    } catch {
      showErrorToast('Could not remove that reference.');
    } finally {
      setBusy(null);
    }
  }

  return <div className="space-y-3">{platforms.map(platform => {
    const profile = profiles[platform];
    const savedCount = profile?.referenceAssets.length ?? 0;
    const selected = files[platform] ?? [];
    const total = savedCount + selected.length;
    const working = busy === platform || profile?.status === 'extracting';
    return <section key={platform} className="rounded-2xl border border-default bg-card p-4">
      <div className="flex items-center justify-between gap-3"><div><h4 className="text-sm font-semibold capitalize text-default">{platform}</h4><p className="text-xs text-secondary">{savedCount} saved · {selected.length} selected · 4–8 required</p></div>{profile?.status === 'ready' && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="size-4"/>Ready</span>}</div>
      {savedCount > 0 && <div className="mt-3 grid grid-cols-4 gap-2">{profile?.referenceAssets.map(asset => <div key={asset.id} className="group relative aspect-square overflow-hidden rounded-xl border border-default bg-element p-1"><ReferenceThumbnail platform={platform} id={asset.id}/><button type="button" aria-label="Remove reference" disabled={!!busy} onClick={() => void remove(platform, asset.id)} className="absolute right-1 top-1 rounded-md bg-card/90 p-1 text-secondary opacity-0 shadow group-hover:opacity-100 disabled:opacity-40"><Trash2 className="size-3.5"/></button></div>)}</div>}
      {profile?.status === 'ready' && <DnaStylePreview className="mt-3" label="Learned from your posts" platform={platform} colors={profile.colors.value} fontDescription={profile.typography.value} styleDescription={profile.visualCharacter.value} compact/>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {total < 8 && <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-primary-purple/40 bg-primary-purple/5 px-3 py-2 text-xs font-semibold text-primary-purple"><ImagePlus className="size-4"/>Select posts<input type="file" className="sr-only" multiple accept="image/jpeg,image/png,image/webp" disabled={!!busy} onChange={event => { const next = Array.from(event.target.files ?? []); event.target.value = ''; if (next.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) || savedCount + next.length > 8) return showErrorToast('Use up to 8 JPEG, PNG or WebP images, no larger than 10 MB each.'); setFiles(all => ({ ...all, [platform]: next })); }}/></label>}
        <button type="button" disabled={working || total < 4 || total > 8} onClick={() => void uploadAndExtract(platform)} className="inline-flex items-center gap-2 rounded-xl btn-brand-fill px-3 py-2 text-xs font-semibold disabled:opacity-40">{working && <Loader2 className="size-4 animate-spin"/>}{profile?.extractedAt ? 'Re-extract' : 'Upload & extract'}</button>
      </div>
    </section>;
  })}</div>;
}
