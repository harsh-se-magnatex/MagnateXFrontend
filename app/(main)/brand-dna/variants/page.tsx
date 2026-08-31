'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
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
import { showErrorToast } from '@/lib/show-error-toast';
import { workspacePageTitleClass } from '@/lib/workspace-ui';

const VARIANT_COUNT = 10;
const MAX_REGENERATIONS = 1;

export default function LogoVariantsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sourceLogo, setSourceLogo] = useState<string>('');
  const [rawLogo, setRawLogo] = useState<string>('');
  const [transparentLogo, setTransparentLogo] = useState<string>('');
  const [variants, setVariants] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [hasLoadedSaved, setHasLoadedSaved] = useState(false);
  const [forceFreshVariants, setForceFreshVariants] = useState(false);
  const [autoGenPending, setAutoGenPending] = useState(false);
  const [variantsFeatureOff, setVariantsFeatureOff] = useState(false);
  const [regenerateCount, setRegenerateCount] = useState(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Blocks the empty-variants poll while a manual Generate/Regenerate is in flight. */
  const manualGenInFlightRef = useRef(false);
  const autoStartedFreshRef = useRef(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  useEffect(() => {
    const loadLogo = async () => {
      let fromSession = '';
      try {
        fromSession =
          sessionStorage.getItem('template_dna_logo_for_variants') || '';
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
  const canRegenerate =
    variants.length > 0 && regenerateCount < MAX_REGENERATIONS;

  const generate = async (options?: { isRegeneration?: boolean }) => {
    if (!canGenerate) {
      showErrorToast('No logo found. Save a logo in Template DNA first.');
      return;
    }
    if (options?.isRegeneration && !canRegenerate) {
      showErrorToast('Logo variant regeneration limit reached.');
      return;
    }
    if (manualGenInFlightRef.current || isGenerating) return;
    try {
      manualGenInFlightRef.current = true;
      setIsGenerating(true);
      setError('');
      setAutoGenPending(false);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (pollStopRef.current) {
        clearTimeout(pollStopRef.current);
        pollStopRef.current = null;
      }
      // Keep existing variants visible until the new set arrives so the UI
      // does not look "stuck" on an empty grid with no network activity.
      const response = await getLogoVariants(
        VARIANT_COUNT,
        Date.now(),
        sourceLogo,
        { isRegeneration: options?.isRegeneration === true }
      );
      const next = (response?.data?.variants ?? []).slice(0, VARIANT_COUNT);
      setRawLogo(String(response?.data?.rawLogo || sourceLogo || ''));
      setTransparentLogo(String(response?.data?.transparentLogo || ''));
      setVariants(next);
      if (next.length) {
        setIsSaving(true);
        const saveRes = await saveLogoVariants(next, {
          isRegeneration: options?.isRegeneration === true,
        });
        const saved = (saveRes?.data?.variants ?? []).slice(0, VARIANT_COUNT);
        if (saved.length) setVariants(saved);
        const savedCount = Number(saveRes?.data?.regenerateCount ?? 0);
        if (Number.isFinite(savedCount)) {
          setRegenerateCount(savedCount);
        } else if (options?.isRegeneration) {
          setRegenerateCount((prev) => prev + 1);
        }
        try {
          sessionStorage.removeItem('template_dna_force_fresh_variants');
        } catch {}
        setForceFreshVariants(false);
        toast.success('Variants generated and saved');
      }
      if (!next.length) {
        setError('No variants returned. Verify backend/comfy configuration.');
      }
    } catch (e: unknown) {
      setError('Failed to generate variants.');
      showErrorToast('Failed to generate variants. Please Try Again Later.');
    } finally {
      manualGenInFlightRef.current = false;
      setIsGenerating(false);
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (user && !hasLoadedSaved) {
      setError('');
      getSavedLogoVariants(VARIANT_COUNT)
        .then((res) => {
          const urls = (res?.data?.variants ?? []).slice(0, VARIANT_COUNT);
          const savedCount = Number(res?.data?.regenerateCount ?? 0);
          if (Number.isFinite(savedCount)) {
            setRegenerateCount(savedCount);
          }
          if (!forceFreshVariants && urls.length) {
            setVariants(urls);
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
    if (manualGenInFlightRef.current) return;

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
        if (cancelled || manualGenInFlightRef.current) return;
        if (!enabled) {
          setVariantsFeatureOff(true);
          return;
        }
        setVariantsFeatureOff(false);

        const first = await getSavedLogoVariants(VARIANT_COUNT);
        const urls = (first?.data?.variants ?? []).slice(0, VARIANT_COUNT);
        const savedCount = Number(first?.data?.regenerateCount ?? 0);
        if (Number.isFinite(savedCount)) {
          setRegenerateCount(savedCount);
        }
        if (urls.length) {
          setVariants(urls);
          return;
        }
        if (cancelled || manualGenInFlightRef.current) return;

        setAutoGenPending(true);
        pollTimerRef.current = setInterval(async () => {
          if (cancelled || manualGenInFlightRef.current) return;
          try {
            const r = await getSavedLogoVariants(VARIANT_COUNT);
            const u = (r?.data?.variants ?? []).slice(0, VARIANT_COUNT);
            const savedCount = Number(r?.data?.regenerateCount ?? 0);
            if (Number.isFinite(savedCount)) {
              setRegenerateCount(savedCount);
            }
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

  // Coming from Template DNA "Variants" with force-fresh: kick off generation
  // immediately so the click path is not a dead empty page.
  useEffect(() => {
    if (
      !user ||
      !hasLoadedSaved ||
      !forceFreshVariants ||
      !sourceLogo ||
      autoStartedFreshRef.current ||
      isGenerating ||
      variants.length > 0
    ) {
      return;
    }
    autoStartedFreshRef.current = true;
    void generate({ isRegeneration: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot on force-fresh entry
  }, [
    user,
    hasLoadedSaved,
    forceFreshVariants,
    sourceLogo,
    variants.length,
    isGenerating,
  ]);

  if (loading) return <PageLoadingState />;
  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className={workspacePageTitleClass}>Logo Variants</h1>
          <p className="mt-1 text-secondary">
            Generated variants from your current logo. Total requested:{' '}
            {VARIANT_COUNT}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/brand-dna"
            className="inline-flex items-center justify-center rounded-lg border border-default bg-default px-4 py-2 text-sm font-semibold text-default transition-expo hover:bg-hover"
          >
            Back
          </Link>
          {hasLoadedSaved && (
            <button
              type="button"
              onClick={() =>
                void generate({ isRegeneration: variants.length > 0 })
              }
              disabled={
                !canGenerate ||
                isGenerating ||
                isSaving ||
                (variants.length > 0 && !canRegenerate)
              }
              className="inline-flex items-center justify-center rounded-full border border-primary-purple/25 bg-primary-purple/10 px-4 py-2 text-sm font-semibold text-preview transition-expo hover:bg-element disabled:cursor-not-allowed disabled:text-quaternary"
            >
              {isGenerating
                ? 'Generating...'
                : isSaving
                  ? 'Saving...'
                  : variants.length > 0
                    ? canRegenerate
                      ? 'Regenerate'
                      : 'Regenerate Used'
                    : 'Generate'}
            </button>
          )}
        </div>
      </header>

      {!canGenerate && (
        <div className="rounded-xl border border-warning bg-warning p-4 text-sm text-warning">
          No logo found. Upload or save a logo first in Template DNA.
        </div>
      )}
      {canGenerate &&
        variantsFeatureOff &&
        !variants.length &&
        !autoGenPending && (
          <div className="rounded-xl border border-default bg-element p-4 text-sm text-default mb-4">
            Logo variants are turned off in Template DNA. Turn the switch on
            there to generate variants automatically, or use Generate here to
            create and save up to {VARIANT_COUNT} variants.
          </div>
        )}
      {canGenerate && autoGenPending && !variants.length && (
        <div className="rounded-xl border border-primary-purple/25 bg-primary-purple/10 p-4 text-sm text-preview mb-4">
          Loading variants generated for your account… This can take up to a
          minute after you enable the feature.
        </div>
      )}
      {!!error && (
        <div className="rounded-xl border border-danger bg-danger p-4 text-sm text-danger mb-4">
          {error}
        </div>
      )}

      {(!!rawLogo || !!transparentLogo) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {!!rawLogo && (
            <div className="rounded-xl border border-default bg-default overflow-hidden">
              <div className="px-3 py-2 text-xs font-semibold text-secondary border-b border-default">
                Raw Logo
              </div>
              <div className="h-36">
                <img
                  src={rawLogo}
                  alt="Raw logo"
                  className="w-full h-full object-contain p-2"
                />
              </div>
            </div>
          )}
          {!!transparentLogo && (
            <div className="rounded-xl border border-default bg-default overflow-hidden">
              <div className="px-3 py-2 text-xs font-semibold text-secondary border-b border-default">
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
          <div className="mb-3 text-sm font-semibold text-default">
            Variants ({variants.length}/{VARIANT_COUNT})
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {variants.map((variant, index) => (
              <div
                key={`${variant.slice(0, 24)}-${index}`}
                className="rounded-xl border border-default bg-default overflow-hidden"
              >
                <div className="h-32">
                  <img
                    src={variant}
                    alt={`Logo variant ${index + 1}`}
                    className="w-full h-full object-contain p-2"
                  />
                </div>
                <div className="border-t border-default px-3 py-2 text-xs font-medium text-secondary">
                  <span>Variant {index + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
