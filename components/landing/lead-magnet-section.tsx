'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import { GuestAuthLink } from '@/components/auth/GuestAuthLink';
import {
  claimLeadMagnetEmail,
  generateLeadMagnet,
  LEAD_MAGNET_CONSENT_FALLBACK,
  previewLeadMagnet,
  type LeadMagnetDna,
  type LeadMagnetPlatform,
  type LeadMagnetPost,
} from '@/src/service/api/lead-magnet';

type Step = 'email' | 'website' | 'platform' | 'loading' | 'generating' | 'result';

const PLATFORMS: { id: LeadMagnetPlatform; label: string }[] = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'linkedin', label: 'LinkedIn' },
];

const PREVIEW_TIMEOUT_MS = 90_000;

export function LeadMagnetSection() {
  const sectionRef = React.useRef<HTMLElement | null>(null);
  const resultRef = React.useRef<HTMLDivElement | null>(null);
  const [step, setStep] = React.useState<Step>('email');
  const [email, setEmail] = React.useState('');
  const [website, setWebsite] = React.useState('');
  const [platform, setPlatform] = React.useState<LeadMagnetPlatform | null>(
    null
  );
  const [pickingPlatform, setPickingPlatform] =
    React.useState<LeadMagnetPlatform | null>(null);
  const [domainKey, setDomainKey] = React.useState('');
  const [dna, setDna] = React.useState<LeadMagnetDna | null>(null);
  const [consentText, setConsentText] = React.useState(
    LEAD_MAGNET_CONSENT_FALLBACK
  );
  const [post, setPost] = React.useState<LeadMagnetPost | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const scrollToSection = React.useCallback(() => {
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const onContinueEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Enter your email to continue.');
      return;
    }
    setBusy(true);
    try {
      const data = await claimLeadMagnetEmail(email);
      setEmail(data.email);
      if (data.consentText) setConsentText(data.consentText);
      setStep('website');
      scrollToSection();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify email');
    } finally {
      setBusy(false);
    }
  };

  const onContinueWebsite = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!website.trim()) {
      setError('Enter your website to continue.');
      return;
    }
    setStep('platform');
  };

  const onPickPlatform = async (nextPlatform: LeadMagnetPlatform) => {
    if (busy) return;
    setBusy(true);
    setPickingPlatform(nextPlatform);
    setError(null);
    setStep('loading');
    try {
      const data = await Promise.race([
        previewLeadMagnet({ email, website }),
        new Promise<never>((_, reject) => {
          setTimeout(
            () =>
              reject(
                new Error(
                  'Looking up that website is taking too long. Try again, or use a simpler URL.'
                )
              ),
            PREVIEW_TIMEOUT_MS
          );
        }),
      ]);
      setDomainKey(data.domainKey);
      setDna(data.dna);
      if (data.consentText) setConsentText(data.consentText);
      setPlatform(nextPlatform);
      setStep('generating');
      scrollToSection();

      const gen = await generateLeadMagnet({
        email,
        website: data.dna.website || website,
        platform: nextPlatform,
        dna: data.dna,
      });
      setDomainKey(gen.domainKey);
      setPost(gen.post);
      setStep('result');
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('platform');
    } finally {
      setBusy(false);
      setPickingPlatform(null);
    }
  };

  const reset = () => {
    setStep('email');
    setEmail('');
    setWebsite('');
    setPlatform(null);
    setPickingPlatform(null);
    setDomainKey('');
    setDna(null);
    setPost(null);
    setError(null);
    setBusy(false);
  };

  return (
    <section
      ref={sectionRef}
      className="lead-magnet-section relative z-10 min-h-screen bg-[#07070c]"
    >
      <div className="lead-magnet-section__glow" aria-hidden />
      <div className="mx-auto max-w-3xl px-6 pb-20 pt-28 md:pb-28 md:pt-32">
        <p className="landing-eyebrow text-center">Try it free</p>
        <h2 className="landing-display mt-4 text-center text-[clamp(1.85rem,4vw,2.75rem)] leading-[1.1] tracking-[-0.03em] text-white">
          See a post for your brand
        </h2>
        <p className="landing-body mx-auto mt-4 max-w-xl text-center text-base text-white/60">
          Enter your email, drop your website, pick a platform, and we&apos;ll
          craft one sample post from your brand — no signup required.
        </p>

        <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md md:p-8">
          {step === 'email' && (
            <form onSubmit={onContinueEmail} className="space-y-4">
              <label className="landing-body block text-sm text-white/70">
                Email
                <input
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="lead-magnet-input mt-2"
                  disabled={busy}
                />
              </label>
              <p className="landing-body -mt-1 text-xs leading-relaxed text-white/45">
                {consentText}
              </p>
              <button
                type="submit"
                className="landing-btn-primary w-full sm:w-auto"
                disabled={busy || !email.trim()}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking…
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'website' && (
            <form onSubmit={onContinueWebsite} className="space-y-4">
              <p className="landing-body text-xs text-white/40">
                Using {email}
              </p>
              <label className="landing-body block text-sm text-white/70">
                Your website
                <input
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="yourbusiness.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="lead-magnet-input mt-2"
                />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="landing-btn-primary w-full sm:w-auto"
                  disabled={busy}
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="landing-body text-sm text-white/45 underline-offset-2 hover:text-white/70 hover:underline"
                  onClick={() => setStep('email')}
                  disabled={busy}
                >
                  Change email
                </button>
              </div>
            </form>
          )}

          {step === 'platform' && (
            <div className="space-y-5">
              <p className="landing-body text-sm text-white/70">
                Choose one platform for your sample post
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {PLATFORMS.map((p) => {
                  const isThis = pickingPlatform === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={busy}
                      onClick={() => void onPickPlatform(p.id)}
                      className="lead-magnet-platform-btn"
                    >
                      {isThis ? (
                        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      ) : (
                        p.label
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="landing-body text-sm text-white/45 underline-offset-2 hover:text-white/70 hover:underline"
                onClick={() => setStep('website')}
                disabled={busy}
              >
                Change website
              </button>
            </div>
          )}

          {step === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-white/70" />
              <p className="landing-display text-lg text-white">
                Looking up your brand…
              </p>
              <p className="landing-body max-w-sm text-sm text-white/50">
                Pulling business details from{' '}
                <span className="text-white/70">{website}</span>.
              </p>
            </div>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-white/70" />
              <p className="landing-display text-lg text-white">
                Creating your post…
              </p>
              <p className="landing-body max-w-sm text-sm text-white/50">
                {dna?.businessName
                  ? `Crafting a ${PLATFORMS.find((p) => p.id === platform)?.label ?? ''} sample for ${dna.businessName}.`
                  : 'This usually takes a minute or two.'}
              </p>
            </div>
          )}

          {step === 'result' && post && (
            <div ref={resultRef} className="space-y-6">
              <p className="landing-body text-sm text-white/55">
                Your {PLATFORMS.find((p) => p.id === platform)?.label} sample
                {domainKey ? ` for ${domainKey}` : ''}
              </p>
              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
                {post.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.imageUrl}
                    alt="Generated social post"
                    className="mx-auto max-h-[min(70vh,640px)] w-full object-contain"
                  />
                ) : (
                  <div className="px-4 py-16 text-center text-sm text-white/45">
                    Image is ready in storage — refresh if it doesn&apos;t load.
                  </div>
                )}
                <div className="border-t border-white/10 p-4">
                  <p className="landing-body whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                    {post.caption || 'No caption'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <GuestAuthLink
                  href="/sign-up"
                  className="landing-btn-primary group"
                >
                  Get daily posts like this
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </GuestAuthLink>
                <button
                  type="button"
                  onClick={reset}
                  className="landing-btn-secondary"
                >
                  Try another email
                </button>
                <Link
                  href="/product"
                  className="landing-body text-sm text-white/45 underline-offset-2 hover:text-white/70 hover:underline"
                >
                  See how it works
                </Link>
              </div>
            </div>
          )}

          {error ? (
            <p
              className="landing-body mt-4 text-sm text-rose-300/90"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
