'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ImagePlus, Loader2, Sparkles, Trash2, WandSparkles } from 'lucide-react';
import { showErrorToast } from '@/lib/show-error-toast';
import { ImagePreviewButton, ImagePreviewOverlay, useImagePreview } from '@/components/image-preview';
import { ReferenceThumbnail } from '@/components/brand/TemplateDesignEditor';
import { VisualDnaChoice } from '@/components/brand/VisualDnaChoice';
import { DnaStylePreview } from '@/components/brand/DnaStylePreview';
import { extractTemplateDna, getTemplateDna, removeTemplateDnaReference, updateTemplateDna, uploadTemplateDnaReferences, type TemplateDnaPlatform, type TemplateDnaProfile } from '@/src/service/api/template-dna.service';

const platforms: TemplateDnaPlatform[] = ['instagram', 'facebook', 'linkedin'];
export default function TemplateDnaPage() {
  const [profiles, setProfiles] = useState<Partial<Record<TemplateDnaPlatform, TemplateDnaProfile>>>({});
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [profilesLoadFailed, setProfilesLoadFailed] = useState(false);
  const [dirty, setDirty] = useState<Partial<Record<TemplateDnaPlatform, boolean>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [localPreviews, setLocalPreviews] = useState<Partial<Record<TemplateDnaPlatform, string[]>>>({});
  const [pendingFiles, setPendingFiles] = useState<Partial<Record<TemplateDnaPlatform, File[]>>>({});
  const [showExistingPosts, setShowExistingPosts] = useState(false);
  const referencePreview = useImagePreview();
  useEffect(() => { void getTemplateDna().then(data => setProfiles(Object.fromEntries((data as TemplateDnaProfile[]).map(p => [p.platform, p])))).catch(() => { setProfilesLoadFailed(true); showErrorToast('Could not load Template DNA.'); }).finally(() => setProfilesLoading(false)); }, []);
  function edit(platform: TemplateDnaPlatform, next: TemplateDnaProfile) { setProfiles(all => ({ ...all, [platform]: next })); setDirty(all => ({ ...all, [platform]: true })); }
  async function action(platform: TemplateDnaPlatform, name: string, run: () => Promise<TemplateDnaProfile>) {
    setBusy(platform + '-' + name); setMessage('');
    try { const next = await run(); setProfiles(all => ({ ...all, [platform]: next })); setDirty(all => ({ ...all, [platform]: false })); setMessage(name === 'extract' ? 'Template DNA extracted successfully.' : 'Changes saved.'); }
    catch (error) { const detail = (error as { response?: { data?: { message?: string } } }).response?.data?.message; showErrorToast(detail || 'Operation failed. Your saved style remains available.'); }
    finally { setBusy(null); }
  }
  async function uploadAndExtract(platform: TemplateDnaPlatform) {
    const files = pendingFiles[platform] ?? [];
    if (!files.length) return;
    await action(platform, 'extract', async () => {
      const uploaded = await uploadTemplateDnaReferences(platform, files);
      // The preview must remain visible while the extraction job runs. Clear
      // the staged file list so the same files cannot be uploaded twice, but
      // keep the object URLs until extraction has completed.
      setPendingFiles(all => ({ ...all, [platform]: [] }));
      try {
        const extracted = await extractTemplateDna(platform);
        (localPreviews[platform] ?? []).forEach(URL.revokeObjectURL);
        setLocalPreviews(all => ({ ...all, [platform]: [] }));
        return extracted;
      } catch (error) {
        // Upload succeeded but extraction failed: show the saved references
        // once, instead of leaving them duplicated beside local previews.
        setProfiles(all => ({ ...all, [platform]: uploaded }));
        (localPreviews[platform] ?? []).forEach(URL.revokeObjectURL);
        setLocalPreviews(all => ({ ...all, [platform]: [] }));
        throw error;
      }
    });
  }
  return <div className="mx-auto max-w-6xl pb-20"><Link href="/brand-dna" className="mb-6 inline-flex items-center gap-2 text-sm text-secondary transition-colors hover:text-default"><ArrowLeft className="size-4"/>Brand DNA</Link>
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-purple/10 px-3 py-1 text-xs font-semibold text-primary-purple"><Sparkles className="size-3.5"/>Brand consistency</div><h1 className="text-3xl font-bold tracking-tight text-default sm:text-4xl">Template DNA</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">Create a new visual identity from your business data, or teach AI from posts you already use.</p></div><Link href="/brand-dna" className="text-sm font-semibold text-primary-purple hover:underline">Back to Brand DNA</Link></div>
    <VisualDnaChoice onGenerated={() => setShowExistingPosts(false)} onLearnFromPosts={() => setShowExistingPosts(true)} />
    <p role="status" className="mt-3 text-sm text-secondary">{message}</p>
    {showExistingPosts && profilesLoading && <div className="mt-8 flex min-h-40 items-center justify-center rounded-3xl border border-default bg-card"><span className="inline-flex items-center gap-3 text-sm font-medium text-secondary"><Loader2 className="size-5 animate-spin text-primary-purple"/>Loading platform templates…</span></div>}
    {showExistingPosts && !profilesLoading && profilesLoadFailed && <div className="mt-8 rounded-3xl border border-red-500/20 bg-red-500/5 p-6 text-center"><p className="text-sm font-semibold text-default">Platform templates could not be loaded</p><p className="mt-1 text-xs text-secondary">Refresh before editing references. No saved templates were changed.</p></div>}
    {showExistingPosts && !profilesLoading && !profilesLoadFailed && <div className="mt-8 space-y-6">{platforms.map(platform => { const profile = profiles[platform]; const count = profile?.referenceAssets.length ?? 0; const locked = !!busy || !!profile?.extractionId; const statusLabel = profile?.status ? profile.status.replaceAll('_', ' ') : 'Not configured'; const ready = profile?.status === 'ready'; return <section key={platform} className="overflow-hidden rounded-3xl border border-default bg-card shadow-sm">
      <div className="flex flex-col justify-between gap-4 border-b border-default bg-linear-to-r from-card to-primary-purple/5 p-5 sm:flex-row sm:items-center sm:p-6"><div><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-primary-purple/10 text-primary-purple"><span className="text-sm font-bold uppercase">{platform.slice(0, 2)}</span></div><div><h2 className="text-xl font-semibold capitalize text-default">{platform}</h2><p className="mt-0.5 text-sm text-secondary">{count}/8 reference images · {statusLabel}{dirty[platform] ? ' · Unsaved edits' : ''}</p></div></div></div><span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${ready ? 'bg-emerald-500/10 text-emerald-700' : profile?.status === 'failed' ? 'bg-red-500/10 text-red-700' : 'bg-amber-500/10 text-amber-700'}`}>{ready ? <CheckCircle2 className="size-3.5"/> : <span className="size-1.5 rounded-full bg-current"/>}{ready ? 'Ready to use' : statusLabel}</span></div>
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_280px]">
      <div><p className="mb-3 text-sm font-semibold text-default">Reference library</p><p className="mb-4 text-xs leading-5 text-secondary">Use 4–8 of your best-performing posts. Include the layouts you want to preserve, not screenshots of unrelated designs.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{profile?.referenceAssets.map(asset => <div key={asset.id} className="group relative aspect-square overflow-hidden rounded-2xl border border-default bg-element p-2"><ReferenceThumbnail platform={platform} id={asset.id}/><button type="button" aria-label="Remove reference" disabled={locked || dirty[platform]} onClick={() => void action(platform, 'remove', () => removeTemplateDnaReference(platform, asset.id))} className="absolute right-2 top-2 rounded-lg bg-card/90 p-2 text-secondary opacity-0 shadow-sm transition-opacity group-hover:opacity-100 disabled:opacity-40"><Trash2 className="size-4"/></button></div>)}{(localPreviews[platform] ?? []).map((src, index) => <div key={`${src}-${index}`} className="group relative aspect-square overflow-hidden rounded-2xl border border-primary-purple/30 bg-element p-2"><img src={src} alt="Selected style reference preview" className="h-full w-full rounded-lg object-contain" /><ImagePreviewButton variant="overlay-icon" label="Preview reference" ariaLabel="Preview selected style reference" className="absolute right-2 top-2 opacity-0 group-hover:opacity-100" onClick={() => referencePreview.open(src, 'Selected style reference')} /></div>)}{count + (pendingFiles[platform]?.length ?? 0) < 8 && <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-primary-purple/40 bg-primary-purple/5 p-3 text-center transition-colors hover:bg-primary-purple/10"><ImagePlus className="mb-2 size-6 text-primary-purple"/><span className="text-xs font-semibold text-default">Select examples</span><span className="mt-1 text-[11px] text-secondary">JPEG, PNG, WebP</span><input aria-label={'Select ' + platform + ' references'} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={locked || dirty[platform] || count >= 8} className="sr-only" onChange={e => { const files = Array.from(e.target.files ?? []); e.target.value = ''; if (!files.length) return; if (files.length + count > 8 || files.some(f => !['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > 10 * 1024 * 1024)) return showErrorToast('Use 4–8 JPEG, PNG or WebP references, up to 10 MB each.'); const previews = files.map(file => URL.createObjectURL(file)); setPendingFiles(all => ({ ...all, [platform]: files })); setLocalPreviews(all => ({ ...all, [platform]: previews })); }}/></label>}</div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
      {pendingFiles[platform]?.length ? <button type="button" disabled={locked} onClick={() => void uploadAndExtract(platform)} className="rounded-xl border border-primary-purple/30 bg-primary-purple/10 px-4 py-3 text-sm font-semibold text-primary-purple disabled:opacity-40">{busy === platform + '-extract' ? 'Uploading & extracting…' : `Upload & extract ${pendingFiles[platform]?.length}`}</button> : null}
      <button type="button" disabled={locked || dirty[platform] || !!pendingFiles[platform]?.length || count < 4} onClick={() => void action(platform, 'extract', () => extractTemplateDna(platform))} className="rounded-xl btn-brand-fill px-4 py-3 text-sm font-semibold disabled:opacity-40">{busy === platform + '-extract' ? <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin"/>Analyzing references…</span> : profile?.extractedAt ? 'Re-extract measurements' : 'Extract Template DNA'}</button>
      {profile?.extractedAt && <><button type="button" disabled={locked} onClick={() => edit(platform, { ...profile, enabled: !profile.enabled })} className="rounded-xl border border-default px-4 py-3 text-sm text-default">{profile.enabled ? 'Disable profile' : 'Enable profile'}</button><button type="button" disabled={locked || !dirty[platform]} onClick={() => void action(platform, 'save', () => updateTemplateDna(platform, profile))} className="rounded-xl border border-default px-4 py-3 text-sm text-default disabled:opacity-40">Save changes</button></>}
      </div>{dirty[platform] && <p className="mt-2 text-xs text-secondary">Save your edits before changing references or re-extracting.</p>}
      {profile?.lastError && <p className="mt-3 text-sm text-secondary">{profile.lastError}</p>}
      {profile?.needsMeasurementExtraction && profile.extractedAt && <p className="mt-4 rounded-lg bg-element p-3 text-sm text-secondary">This legacy profile remains usable. Re-extract to add measured font sizes, color roles and placements.</p>}
      </div><aside className="h-fit space-y-4 rounded-2xl border border-default bg-element p-4">{ready && profile && <DnaStylePreview label="Learned from your posts" platform={platform} colors={profile.colors.value} fontDescription={profile.typography.value} styleDescription={profile.visualCharacter.value} compact/>}<div><div className="mb-3 flex items-center gap-2 text-sm font-semibold text-default"><WandSparkles className="size-4 text-primary-purple"/>How it works</div><ol className="space-y-3 text-xs leading-5 text-secondary"><li><span className="mr-2 font-bold text-primary-purple">1</span>Upload 4–8 recognizable examples.</li><li><span className="mr-2 font-bold text-primary-purple">2</span>Extract the recurring visual rules.</li><li><span className="mr-2 font-bold text-primary-purple">3</span>Review the post-style preview.</li></ol>{count < 4 && <p className="mt-4 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-800">Add {4 - count} more {4 - count === 1 ? 'image' : 'images'} to unlock extraction.</p>}</div></aside></div>
    </section>; })}</div>}
    <ImagePreviewOverlay src={referencePreview.previewUrl} alt={referencePreview.previewAlt} onClose={referencePreview.close} />
  </div>;
}
