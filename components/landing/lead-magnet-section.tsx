'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { GuestAuthLink } from '@/components/auth/GuestAuthLink';
import {
  claimLeadMagnetEmail,
  generateLeadMagnet,
  LEAD_MAGNET_CONSENT_FALLBACK,
  pollLeadMagnetStatus,
  previewLeadMagnet,
  type LeadMagnetDna,
  type LeadMagnetPlatform,
  type LeadMagnetPost,
} from '@/src/service/api/lead-magnet';

type Step =
  | 'email'
  | 'website'
  | 'loading'
  | 'brand'
  | 'platform'
  | 'generating'
  | 'result';

const PLATFORMS: { id: LeadMagnetPlatform; label: string }[] = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'linkedin', label: 'LinkedIn' },
];

const PREVIEW_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 12 * 60_000;

/** User-facing stages. The internal `loading` / `generating` waits belong to
 *  the stage they resolve, and `result` is the payoff rather than a step. */
const FLOW_STAGES = [
  { key: 'site', label: 'Website', steps: ['website'] },
  { key: 'email', label: 'Email', steps: ['email', 'loading'] },
  { key: 'brand', label: 'Brand', steps: ['brand'] },
  { key: 'platform', label: 'Platform', steps: ['platform', 'generating'] },
] as const;

function FlowProgress({ step }: { step: Step }) {
  if (step === 'result') return null;

  const activeIndex = Math.max(
    0,
    FLOW_STAGES.findIndex((s) => (s.steps as readonly string[]).includes(step))
  );

  return (
    <ol className="mb-8 flex items-center justify-center gap-2 sm:gap-3">
      {FLOW_STAGES.map((stage, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <li key={stage.key} className="flex items-center gap-2 sm:gap-3">
            <span
              className="flex items-center gap-2"
              aria-current={active ? 'step' : undefined}
            >
              <span
                className={[
                  'h-1.5 w-1.5 rounded-full transition-expo',
                  active
                    ? ' bg-default shadow-[0_0_10px_2px_rgba(199,184,253,0.55)]'
                    : done
                      ? 'bg-default'
                      : 'bg-default',
                ].join(' ')}
                aria-hidden
              />
              <span
                className={[
                  'landing-body text-[11px] uppercase tracking-[0.16em] transition-expo',
                  active
                    ? 'text-white/85'
                    : done
                      ? 'text-white/45'
                      : 'text-white/25',
                ].join(' ')}
              >
                {stage.label}
              </span>
            </span>
            {i < FLOW_STAGES.length - 1 ? (
              <span
                className={[
                  'hidden h-px w-5 transition-expo sm:block',
                  i < activeIndex ? 'bg-default' : 'bg-default',
                ].join(' ')}
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * What the pipeline is actually doing, in the user's words. Shown in order
 * while the job runs so a multi-minute wait reads as progress rather than a
 * hang — the single biggest reason people abandon this flow.
 */
const GENERATING_STAGES = [
  { at: 0, label: 'Reading your website' },
  { at: 14, label: 'Learning your brand voice' },
  { at: 32, label: 'Choosing an angle that fits' },
  { at: 52, label: 'Designing the visual' },
  { at: 76, label: 'Writing your caption' },
] as const;

/** Expected run in seconds — the ring paces against this, never completing early. */
const GENERATING_EXPECTED_S = 100;

function GeneratingState({
  elapsedMs,
  businessName,
  platformLabel,
}: {
  elapsedMs: number;
  businessName?: string;
  platformLabel?: string;
}) {
  const elapsedS = Math.max(0, Math.floor(elapsedMs / 1000));

  const stageIndex = GENERATING_STAGES.reduce(
    (acc, stage, i) => (elapsedS >= stage.at ? i : acc),
    0
  );
  const stage = GENERATING_STAGES[stageIndex];

  // Ease toward — but never reach — completion, so the ring never implies
  // "done" while the job is still running. Caps at 92%.
  const progress = Math.min(
    0.92,
    1 - Math.exp(-elapsedS / GENERATING_EXPECTED_S)
  );

  const R = 34;
  const CIRC = 2 * Math.PI * R;

  return (
    <div className="flex flex-col items-center gap-5 py-10 text-center">
      <div className="relative h-24 w-24">
        <svg
          className="h-full w-full -rotate-90"
          viewBox="0 0 80 80"
          aria-hidden
        >
          <circle
            cx="40"
            cy="40"
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-white/10"
          />
          <circle
            cx="40"
            cy="40"
            r={R}
            fill="none"
            stroke="url(#lm-ring)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - progress)}
            style={{
              transition:
                'stroke-dashoffset 900ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
          <defs>
            <linearGradient id="lm-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c7b8fd" />
              <stop offset="100%" stopColor="#7c6bf5" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-white/45" aria-hidden />
        </span>
      </div>

      <div className="space-y-2" role="status" aria-live="polite">
        <p className="landing-display text-lg text-white">{stage.label}…</p>
        <p className="landing-body mx-auto max-w-sm text-sm text-white/50">
          {businessName
            ? `Crafting a ${platformLabel ?? ''} sample for ${businessName}.`.replace(
                /\s+/g,
                ' '
              )
            : 'This usually takes a minute or two.'}
        </p>
      </div>

      {/* Stage rail — position in the sequence, without a fake countdown. */}
      <div className="flex items-center gap-1.5" aria-hidden>
        {GENERATING_STAGES.map((s, i) => (
          <span
            key={s.at}
            className={
              i <= stageIndex
                ? 'h-1 w-6 rounded-full bg-default transition-expo'
                : 'h-1 w-6 rounded-full bg-default transition-expo'
            }
          />
        ))}
      </div>

      {elapsedS > 75 ? (
        <p className="landing-body text-xs text-white/40">
          Still working — this one&apos;s taking a little longer. We&apos;ll
          show it the moment it&apos;s ready.
        </p>
      ) : null}
    </div>
  );
}

function BrandColorSwatch({ hex, label }: { hex: string; label: string }) {
  const color = hex.trim();
  if (!color) return null;
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-7 w-7 shrink-0 rounded-full border border-white/15"
        style={{ backgroundColor: color }}
        title={`${label}: ${color}`}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="landing-body text-[11px] uppercase tracking-wide text-white/40">
          {label}
        </p>
        <p className="landing-body truncate font-mono text-xs text-white/65">
          {color}
        </p>
      </div>
    </div>
  );
}

function BrandPreviewCard({ dna }: { dna: LeadMagnetDna }) {
  const colors = [
    { hex: dna.primaryColor, label: 'Primary' },
    { hex: dna.secondaryColor, label: 'Secondary' },
    { hex: dna.accentColor, label: 'Accent' },
  ].filter((c) => c.hex.trim());

  const hashtags = dna.hashtags
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/35">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-5 sm:p-5">
        <div className="mx-auto flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-default sm:mx-0">
          {dna.logo.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dna.logo}
              alt={`${dna.businessName || 'Brand'} logo`}
              className="h-full w-full object-contain p-2"
            />
          ) : (
            <span className="landing-display text-2xl text-white/35">
              {(dna.businessName || '?').slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
          <h3 className="landing-display text-xl text-white">
            {dna.businessName || 'Your business'}
          </h3>
          <div className="landing-body flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-white/55 sm:justify-start">
            {dna.industry ? <span>{dna.industry}</span> : null}
            {dna.industry && dna.location ? (
              <span className="text-white/25" aria-hidden>
                ·
              </span>
            ) : null}
            {dna.location ? <span>{dna.location}</span> : null}
          </div>
          {dna.website ? (
            <p className="landing-body truncate text-sm text-white/45">
              {dna.website.replace(/^https?:\/\//, '')}
            </p>
          ) : null}
        </div>
      </div>

      {dna.brandDescription.trim() ? (
        <div className="border-t border-white/10 px-4 py-3 sm:px-5">
          <p className="landing-body text-sm leading-relaxed text-white/70">
            {dna.brandDescription.length > 280
              ? `${dna.brandDescription.slice(0, 280).trim()}…`
              : dna.brandDescription}
          </p>
        </div>
      ) : null}

      {colors.length > 0 ? (
        <div className="grid gap-3 border-t border-white/10 px-4 py-3 sm:grid-cols-3 sm:px-5">
          {colors.map((c) => (
            <BrandColorSwatch key={c.label} hex={c.hex} label={c.label} />
          ))}
        </div>
      ) : null}

      {hashtags.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t border-white/10 px-4 py-3 sm:px-5">
          {hashtags.map((tag) => (
            <span
              key={tag}
              className="landing-body rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/55"
            >
              {tag.startsWith('#') ? tag : `#${tag}`}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function LeadMagnetSection() {
  const sectionRef = React.useRef<HTMLElement | null>(null);
  const resultRef = React.useRef<HTMLDivElement | null>(null);
  const [step, setStep] = React.useState<Step>('website');
  const [email, setEmail] = React.useState('');
  const [emailAcknowledged, setEmailAcknowledged] = React.useState(false);
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
  const [generatingSince, setGeneratingSince] = React.useState<number | null>(
    null
  );
  const [error, setError] = React.useState<string | null>(null);
  const [, setTick] = React.useState(0);

  const scrollToSection = React.useCallback(() => {
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  React.useEffect(() => {
    if (step !== 'generating' || generatingSince == null) return;
    // 2s cadence so the progress ring eases and stage labels advance on time.
    // Cost is negligible; the alternative is a wait that looks frozen.
    const id = window.setInterval(() => setTick((n) => n + 1), 2_000);
    return () => window.clearInterval(id);
  }, [step, generatingSince]);

  const runWebsitePreview = React.useCallback(
    async (args: { email: string; website: string }) => {
      setStep('loading');
      scrollToSection();
      const data = await Promise.race([
        previewLeadMagnet({ email: args.email, website: args.website }),
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
      if (data.dna.website) setWebsite(data.dna.website);
      setStep('brand');
      scrollToSection();
    },
    [scrollToSection]
  );

  /** Website first — collect URL only; no scrape until email is verified. */
  const onContinueWebsite = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!website.trim()) {
      setError('Enter your website to continue.');
      return;
    }
    setStep('email');
    scrollToSection();
  };

  /**
   * Email second — claim check (already generated?), then start website fetch.
   */
  const onContinueEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Enter your email to continue.');
      return;
    }
    if (!emailAcknowledged) {
      setError('Please acknowledge how your email will be used to continue.');
      return;
    }
    if (!website.trim()) {
      setError('Enter your website to continue.');
      setStep('website');
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const data = await claimLeadMagnetEmail(email);
      setEmail(data.email);
      if (data.consentText) setConsentText(data.consentText);
      await runWebsitePreview({ email: data.email, website });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify email');
      // Stay on email if claim failed; go back to email if preview failed after claim.
      setStep('email');
    } finally {
      setBusy(false);
    }
  };

  const onPickPlatform = async (nextPlatform: LeadMagnetPlatform) => {
    if (busy || !dna) return;
    setBusy(true);
    setPickingPlatform(nextPlatform);
    setError(null);
    setPlatform(nextPlatform);
    setStep('generating');
    setGeneratingSince(Date.now());
    scrollToSection();

    try {
      const queued = await generateLeadMagnet({
        email,
        website: dna.website || website,
        platform: nextPlatform,
        dna,
      });
      setDomainKey(queued.domainKey);

      if (queued.status === 'ready' && queued.post) {
        setPost(queued.post);
        setStep('result');
        requestAnimationFrame(() => {
          resultRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        });
        return;
      }

      const startedAt = Date.now();
      while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const status = await pollLeadMagnetStatus({
          email,
          jobId: queued.jobId,
        });
        if (status.domainKey) setDomainKey(status.domainKey);
        if (status.status === 'ready' && status.post) {
          setPost(status.post);
          setStep('result');
          requestAnimationFrame(() => {
            resultRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          });
          return;
        }
        if (status.status === 'failed') {
          throw new Error(
            status.error || 'Generation failed. Please try again.'
          );
        }
      }
      throw new Error(
        'This is taking longer than expected. Please try again in a few minutes.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('platform');
    } finally {
      setBusy(false);
      setPickingPlatform(null);
      setGeneratingSince(null);
    }
  };

  const reset = () => {
    setStep('website');
    setEmail('');
    setEmailAcknowledged(false);
    setWebsite('');
    setPlatform(null);
    setPickingPlatform(null);
    setDomainKey('');
    setDna(null);
    setPost(null);
    setError(null);
    setBusy(false);
    setGeneratingSince(null);
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
          Drop your website, enter your email, confirm your brand, pick a
          platform, and we&apos;ll craft one sample post — no signup required.
        </p>

        <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md md:p-8">
          <FlowProgress step={step} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 'website' && (
                <form onSubmit={onContinueWebsite} className="space-y-4">
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
                      disabled={busy}
                    />
                  </label>
                  <button
                    type="submit"
                    className="landing-btn-primary w-full sm:w-auto"
                    disabled={busy || !website.trim()}
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}

              {step === 'email' && (
                <form
                  onSubmit={(e) => void onContinueEmail(e)}
                  className="space-y-4"
                >
                  <p className="landing-body text-xs text-white/40">
                    Looking up{' '}
                    <span className="text-white/60">
                      {website.replace(/^https?:\/\//, '')}
                    </span>{' '}
                    after we verify your email
                  </p>
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
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/65 transition-expo hover:border-white/20 hover:bg-white/[0.05]">
                    <input
                      type="checkbox"
                      checked={emailAcknowledged}
                      onChange={(e) => {
                        setEmailAcknowledged(e.target.checked);
                        if (e.target.checked) setError(null);
                      }}
                      disabled={busy}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-violet-400"
                    />
                    <span>
                      I acknowledge that my email address will be used to
                      contact me about this request and relevant updates.
                    </span>
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      className="landing-btn-primary w-full sm:w-auto"
                      disabled={busy || !email.trim() || !emailAcknowledged}
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
                    <button
                      type="button"
                      className="landing-body text-sm text-white/45 underline-offset-2 hover:text-white/70 hover:underline"
                      onClick={() => {
                        setError(null);
                        setStep('website');
                      }}
                      disabled={busy}
                    >
                      Change website
                    </button>
                  </div>
                </form>
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

              {step === 'brand' && dna && (
                <div className="space-y-5">
                  <div>
                    <p className="landing-body text-sm text-white/70">
                      We found this brand from your website
                    </p>
                    <p className="landing-body mt-1 text-xs text-white/40">
                      Confirm it looks right, then pick a platform for your
                      sample post.
                    </p>
                  </div>
                  <BrandPreviewCard dna={dna} />
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="landing-btn-primary w-full sm:w-auto"
                      onClick={() => {
                        setError(null);
                        setStep('platform');
                        scrollToSection();
                      }}
                    >
                      Looks good
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="landing-body text-sm text-white/45 underline-offset-2 hover:text-white/70 hover:underline"
                      onClick={() => {
                        setDna(null);
                        setDomainKey('');
                        setStep('website');
                      }}
                    >
                      Change website
                    </button>
                  </div>
                </div>
              )}

              {step === 'platform' && (
                <div className="space-y-5">
                  {dna?.businessName ? (
                    <p className="landing-body text-xs text-white/40">
                      Creating a sample for {dna.businessName}
                    </p>
                  ) : null}
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
                          disabled={busy || !dna}
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
                    onClick={() => setStep('brand')}
                    disabled={busy}
                  >
                    Back to brand
                  </button>
                </div>
              )}

              {step === 'generating' && (
                <GeneratingState
                  elapsedMs={
                    generatingSince != null ? Date.now() - generatingSince : 0
                  }
                  businessName={dna?.businessName || undefined}
                  platformLabel={
                    PLATFORMS.find((p) => p.id === platform)?.label
                  }
                />
              )}

              {step === 'result' && post && (
                <div ref={resultRef} className="space-y-6">
                  <p className="landing-body text-sm text-white/55">
                    Your {PLATFORMS.find((p) => p.id === platform)?.label}{' '}
                    sample
                    {dna?.businessName
                      ? ` for ${dna.businessName}`
                      : domainKey
                        ? ` for ${domainKey}`
                        : ''}
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
                        Image is ready in storage — refresh if it doesn&apos;t
                        load.
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
                      Try another website
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
            </motion.div>
          </AnimatePresence>

          {error ? (
            <motion.p
              className="landing-body mt-4 text-sm text-danger"
              role="alert"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {error}
            </motion.p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
