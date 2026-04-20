'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/hooks/useAuth';
import {
  getLogoVariants,
  getProfile,
  getSavedLogoVariants,
  saveLogoVariants,
} from '@/src/service/api/userService';
import { toast } from 'sonner';

const VARIANT_COUNT = 20;

function getVariantStyleLabel(index: number, total: number): string {
  const normalizedIndex = index + 1;
  if (normalizedIndex <= 10) return 'static';
  return 'dual';
}

export default function LogoVariantsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sourceLogo, setSourceLogo] = useState<string>('');
  const [rawLogo, setRawLogo] = useState<string>('');
  const [transparentLogo, setTransparentLogo] = useState<string>('');
  const [variants, setVariants] = useState<string[]>([]);
  const [variantsForSave, setVariantsForSave] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [hasLoadedSaved, setHasLoadedSaved] = useState(false);
  const [forceFreshVariants, setForceFreshVariants] = useState(false);
  const [autoGenPending, setAutoGenPending] = useState(false);
  const [variantsFeatureOff, setVariantsFeatureOff] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  useEffect(() => {
    const loadLogo = async () => {
      let fromSession = '';
      try {
        fromSession = sessionStorage.getItem('template_dna_logo_for_variants') || '';
        setForceFreshVariants(
          sessionStorage.getItem('template_dna_force_fresh_variants') === '1'
        );
      } catch {}
      if (fromSession) {
        setSourceLogo(fromSession);
        return;
      }
      const profile = await getProfile();
      const logo = String(profile?.data?.profile?.logo || '');
      if (logo) setSourceLogo(logo);
    };
    if (user) loadLogo().catch(() => setError('Failed to load logo.'));
  }, [user]);

  const canGenerate = useMemo(() => Boolean(sourceLogo), [sourceLogo]);

  const generate = async () => {
    if (!canGenerate) return;
    try {
      setIsGenerating(true);
      setError('');
      setVariants([]);
      setVariantsForSave([]);
      setRawLogo('');
      setTransparentLogo('');
      const response = await getLogoVariants(VARIANT_COUNT, Date.now(), sourceLogo);
      const next = response?.data?.variants ?? [];
      setRawLogo(String(response?.data?.rawLogo || sourceLogo || ''));
      setTransparentLogo(String(response?.data?.transparentLogo || ''));
      setVariants(next);
      setVariantsForSave(next);
      if (!next.length) {
        setError('No variants returned. Verify backend/comfy configuration.');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate variants.');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (user && !hasLoadedSaved) {
      if (forceFreshVariants) {
        setHasLoadedSaved(true);
        return;
      }
      setError('');
      getSavedLogoVariants(VARIANT_COUNT)
        .then((res) => {
          const urls = res?.data?.variants ?? [];
          if (urls.length) {
            setVariants(urls);
            setVariantsForSave([]);
          }
        })
        .catch(() => {
          // If loading saved fails, we'll just generate fresh variants.
        })
        .finally(() => setHasLoadedSaved(true));
    }
  }, [user, hasLoadedSaved, forceFreshVariants]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (pollStopRef.current) clearTimeout(pollStopRef.current);
    };
  }, []);

  useEffect(() => {
    if (!user || !hasLoadedSaved || forceFreshVariants || variants.length > 0) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const prof = await getProfile();
        const enabled =
          (
            prof?.data?.profile as
              | { useLogoVariantsForImages?: boolean }
              | undefined
          )?.useLogoVariantsForImages === true;
        if (cancelled) return;
        if (!enabled) {
          setVariantsFeatureOff(true);
          return;
        }
        setVariantsFeatureOff(false);

        const first = await getSavedLogoVariants(VARIANT_COUNT);
        const urls = first?.data?.variants ?? [];
        if (urls.length) {
          setVariants(urls);
          return;
        }
        if (cancelled) return;

        setAutoGenPending(true);
        pollTimerRef.current = setInterval(async () => {
          if (cancelled) return;
          try {
            const r = await getSavedLogoVariants(VARIANT_COUNT);
            const u = r?.data?.variants ?? [];
            if (u.length) {
              setVariants(u);
              if (pollTimerRef.current) clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
              if (pollStopRef.current) clearTimeout(pollStopRef.current);
              pollStopRef.current = null;
              setAutoGenPending(false);
            }
          } catch {
            /* ignore */
          }
        }, 2000);

        pollStopRef.current = setTimeout(() => {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
          pollStopRef.current = null;
          setAutoGenPending(false);
        }, 66000);
      } catch {
        setAutoGenPending(false);
      }
    })();

    return () => {
      cancelled = true;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (pollStopRef.current) {
        clearTimeout(pollStopRef.current);
        pollStopRef.current = null;
      }
      setAutoGenPending(false);
    };
  }, [user, hasLoadedSaved, variants.length, forceFreshVariants]);

  const handleSaveVariants = async () => {
    if (!variantsForSave.length) return;
    try {
      setIsSaving(true);
      setError('');
      const res = await saveLogoVariants(variantsForSave.slice(0, VARIANT_COUNT));
      const urls = res?.data?.variants ?? [];
      if (urls.length) setVariants(urls);
      toast.success('Variants saved successfully');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save variants.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Logo Variants</h1>
          <p className="mt-1 text-slate-500">
            Generated variants from your current logo. Total requested: {VARIANT_COUNT}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/template-dna"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Back
          </Link>
          <button
            type="button"
            onClick={generate}
            disabled={!canGenerate || isGenerating}
            className="inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? 'Generating...' : 'Regenerate'}
          </button>
          <button
            type="button"
            onClick={handleSaveVariants}
            disabled={!variantsForSave.length || isSaving}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save Variants'}
          </button>
        </div>
      </header>

      {!canGenerate && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          No logo found. Upload or save a logo first in Template DNA.
        </div>
      )}
      {canGenerate && variantsFeatureOff && !variants.length && !autoGenPending && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 mb-4">
          Logo variants are turned off in Template DNA. Turn the switch on there
          to generate variants automatically, or use Regenerate to preview here
          without saving.
        </div>
      )}
      {canGenerate && autoGenPending && !variants.length && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900 mb-4">
          Loading variants generated for your account… This can take up to a
          minute after you enable the feature.
        </div>
      )}
      {!!error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 mb-4">
          {error}
        </div>
      )}

      {(!!rawLogo || !!transparentLogo) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {!!rawLogo && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-3 py-2 text-xs font-semibold text-slate-600 border-b border-slate-100">
                Raw Logo
              </div>
              <div className="h-36">
                <img src={rawLogo} alt="Raw logo" className="w-full h-full object-contain p-2" />
              </div>
            </div>
          )}
          {!!transparentLogo && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-3 py-2 text-xs font-semibold text-slate-600 border-b border-slate-100">
                Original (Transparent Background)
              </div>
              <div className="h-36 bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0]">
                <img
                  src={transparentLogo}
                  alt="Transparent logo"
                  className="w-full h-full object-contain p-2"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {!!variants.length && (
        <>
          <div className="mb-3 text-sm font-semibold text-slate-700">Variants</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {variants.map((variant, index) => (
            <div
              key={`${variant.slice(0, 24)}-${index}`}
              className="rounded-xl border border-slate-200 bg-white overflow-hidden"
            >
              <div className="h-32">
                <img
                  src={variant}
                  alt={`Logo variant ${index + 1}`}
                  className="w-full h-full object-contain p-2"
                />
              </div>
              <div className="border-t border-slate-100 px-3 py-2 text-xs font-medium text-slate-500">
                <div className="flex items-center justify-between gap-2">
                  <span>Variant {index + 1}</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600">
                    {getVariantStyleLabel(index, variants.length)}
                  </span>
                </div>
              </div>
            </div>
          ))}
          </div>
        </>
      )}
    </div>
  );
}

