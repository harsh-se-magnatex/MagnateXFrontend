'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { GuestAuthLink } from '@/components/auth/GuestAuthLink';
import { prepareGenerationImage } from '@/lib/prepare-generation-image';
import {
  claimLeadMagnetEmail,
  generateLeadMagnet,
  LEAD_MAGNET_CONSENT_FALLBACK,
  pollLeadMagnetStatus,
  previewLeadMagnet,
  type LeadMagnetDna,
  type LeadMagnetPlatform,
  type LeadMagnetOffering,
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

const TRY_IT_INDUSTRIES = [
  'Fashion',
  'Food & Beverage',
  'Tech',
  'Health',
  'Education',
  'Retail',
  'Finance',
  'Travel',
  'Entertainment',
  'Real Estate',
  'E-commerce',
  'Consulting',
  'Beauty',
  'Fitness',
  'Art & Design',
  'Other',
] as const;

const PREVIEW_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 12 * 60_000;

async function readImage(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new Error('Choose a PNG, JPEG, or WebP image.');
  }
  const prepared = await prepareGenerationImage(file, {
    maxEdgePx: 2048,
    maxBytes: 4 * 1024 * 1024,
    mimeType: 'image/webp',
  });
  if (prepared.size > 4 * 1024 * 1024) {
    throw new Error('This image could not be resized below 4 MB.');
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(prepared);
  });
}

/** User-facing stages. The internal `loading` / `generating` waits belong to
 *  the stage they resolve, and `result` is the payoff rather than a step. */
const FLOW_STAGES = [
  { key: 'site', label: 'Brand details', steps: ['website'] },
  { key: 'email', label: 'Email', steps: ['email', 'loading'] },
  { key: 'brand', label: 'Your offer', steps: ['brand'] },
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
  { at: 0, label: 'Preparing your brand' },
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
  const logoInputRef = React.useRef<HTMLInputElement | null>(null);
  const productInputRef = React.useRef<HTMLInputElement | null>(null);
  const [step, setStep] = React.useState<Step>('website');
  const [email, setEmail] = React.useState('');
  const [emailAcknowledged, setEmailAcknowledged] = React.useState(false);
  const [website, setWebsite] = React.useState('');
  const [hasWebsite, setHasWebsite] = React.useState(true);
  const [manualName, setManualName] = React.useState('');
  const [manualIndustry, setManualIndustry] = React.useState('');
  const [manualColors, setManualColors] = React.useState({
    primary: '#7c6bf5',
    secondary: '#9b8afb',
    accent: '#c7b8fd',
  });
  const [logoImage, setLogoImage] = React.useState('');
  const [logoFileName, setLogoFileName] = React.useState('');
  const [offering, setOffering] = React.useState<LeadMagnetOffering | null>(
    null
  );
  const [productImage, setProductImage] = React.useState('');
  const [productFileName, setProductFileName] = React.useState('');
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
    if (hasWebsite && !website.trim()) {
      setError('Enter your website to continue.');
      return;
    }
    if (
      !hasWebsite &&
      (!manualName.trim() ||
        !Object.values(manualColors).every((color) =>
          /^#[0-9a-fA-F]{6}$/.test(color)
        ))
    ) {
      setError('Add your name and all three brand colors to continue.');
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
    if (hasWebsite && !website.trim()) {
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
      if (hasWebsite) {
        await runWebsitePreview({ email: data.email, website });
      } else {
        setDomainKey('');
        setDna({
          website: '',
          businessName: manualName.trim(),
          industry: manualIndustry,
          brandDescription: '',
          logo: logoImage,
          location: '',
          hashtags: '',
          primaryColor: manualColors.primary,
          secondaryColor: manualColors.secondary,
          accentColor: manualColors.accent,
        });
        setStep('brand');
        scrollToSection();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify email');
      // Stay on email if claim failed; go back to email if preview failed after claim.
      setStep('email');
    } finally {
      setBusy(false);
    }
  };

  const onPickPlatform = async (nextPlatform: LeadMagnetPlatform) => {
    if (busy || !dna || !offering || (offering === 'product' && !productImage))
      return;
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
        offering,
        logoImage: !hasWebsite ? logoImage : undefined,
        productImage: offering === 'product' ? productImage : undefined,
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
    setHasWebsite(true);
    setManualName('');
    setManualIndustry('');
    setManualColors({
      primary: '#7c6bf5',
      secondary: '#9b8afb',
      accent: '#c7b8fd',
    });
    setLogoImage('');
    setLogoFileName('');
    setOffering(null);
    setProductImage('');
    setProductFileName('');
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
          Add your website or brand details, enter your email, choose what you
          offer, and we&apos;ll craft one sample post — no signup required.
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
                  <div
                    className="grid gap-3 sm:grid-cols-2"
                    role="group"
                    aria-label="Website availability"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setHasWebsite(true);
                        setError(null);
                      }}
                      className={`lead-magnet-platform-btn ${hasWebsite ? 'ring-2 ring-violet-400' : ''}`}
                      aria-pressed={hasWebsite}
                    >
                      I have a website
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHasWebsite(false);
                        setError(null);
                      }}
                      className={`lead-magnet-platform-btn ${!hasWebsite ? 'ring-2 ring-violet-400' : ''}`}
                      aria-pressed={!hasWebsite}
                    >
                      I don&apos;t have a website
                    </button>
                  </div>
                  {hasWebsite ? (
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
                  ) : (
                    <div className="space-y-4">
                      <label className="landing-body block text-sm text-white/70">
                        Brand or business name
                        <input
                          type="text"
                          maxLength={120}
                          value={manualName}
                          onChange={(e) => setManualName(e.target.value)}
                          placeholder="Your business"
                          className="lead-magnet-input mt-2"
                        />
                      </label>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {(
                          [
                            ['primary', 'Primary'],
                            ['secondary', 'Secondary'],
                            ['accent', 'Accent'],
                          ] as const
                        ).map(([key, label]) => (
                          <label
                            key={key}
                            className="landing-body block text-sm text-white/70"
                          >
                            {label} color
                            <input
                              type="color"
                              value={manualColors[key]}
                              onChange={(e) =>
                                setManualColors((current) => ({
                                  ...current,
                                  [key]: e.target.value,
                                }))
                              }
                              className="mt-2 block h-12 w-24 cursor-pointer rounded border border-white/20 bg-transparent p-1"
                            />
                          </label>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="landing-body text-sm text-white/70">
                            Logo{' '}
                            <span className="text-white/35">(optional)</span>
                          </p>
                          {logoImage ? (
                            <button
                              type="button"
                              className="landing-body inline-flex items-center gap-1 text-xs text-white/45 hover:text-white/80"
                              onClick={() => {
                                setLogoImage('');
                                setLogoFileName('');
                                if (logoInputRef.current)
                                  logoInputRef.current.value = '';
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Remove
                            </button>
                          ) : null}
                        </div>
                        <input
                          ref={logoInputRef}
                          id="try-it-logo-upload"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            void readImage(file)
                              .then((data) => {
                                setLogoImage(data);
                                setLogoFileName(file.name);
                                setError(null);
                              })
                              .catch((err) => setError(err.message));
                          }}
                          className="sr-only"
                        />
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="flex w-full items-center gap-4 rounded-xl border border-dashed border-white/20 bg-white/[0.025] p-3 text-left transition hover:border-white/40 hover:bg-white/[0.05]"
                        >
                          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/30">
                            {logoImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={logoImage}
                                alt="Logo preview"
                                className="h-full w-full object-contain p-1"
                              />
                            ) : (
                              <ImagePlus className="h-6 w-6 text-white/35" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="landing-body block text-sm text-white/75">
                              {logoFileName || 'Upload your logo'}
                            </span>
                            <span className="landing-body mt-1 block text-xs text-white/40">
                              PNG, JPG, or WebP up to 4 MB
                            </span>
                          </span>
                          <Upload className="h-4 w-4 shrink-0 text-white/45" />
                        </button>
                      </div>
                    </div>
                  )}
                  <button
                    type="submit"
                    className="landing-btn-primary w-full sm:w-auto"
                    disabled={
                      busy ||
                      (hasWebsite
                        ? !website.trim()
                        : !manualName.trim() ||
                          !Object.values(manualColors).every((color) =>
                            /^#[0-9a-fA-F]{6}$/.test(color)
                          ))
                    }
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
                    {hasWebsite ? (
                      <>
                        Looking up{' '}
                        <span className="text-white/60">
                          {website.replace(/^https?:\/\//, '')}
                        </span>{' '}
                        after we verify your email
                      </>
                    ) : (
                      <>
                        Preparing a sample for{' '}
                        <span className="text-white/60">{manualName}</span>{' '}
                        after we verify your email
                      </>
                    )}
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
                      Change brand details
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
                      {hasWebsite
                        ? 'We found this brand from your website'
                        : 'Your brand details'}
                    </p>
                    <p className="landing-body mt-1 text-xs text-white/40">
                      Choose whether to feature a service or a product.
                    </p>
                  </div>
                  <BrandPreviewCard dna={dna} />
                  {dna.logo.trim() ? (
                    <button
                      type="button"
                      className="landing-body inline-flex items-center gap-1 text-xs text-white/45 hover:text-white/80"
                      onClick={() => {
                        setDna({ ...dna, logo: '' });
                        setLogoImage('');
                        setLogoFileName('');
                        if (logoInputRef.current)
                          logoInputRef.current.value = '';
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove logo from this
                      post
                    </button>
                  ) : null}
                  <div
                    className="grid gap-3 sm:grid-cols-2"
                    role="group"
                    aria-label="What do you offer?"
                  >
                    <button
                      type="button"
                      className={`lead-magnet-platform-btn ${offering === 'service' ? 'ring-2 ring-violet-400' : ''}`}
                      aria-pressed={offering === 'service'}
                      onClick={() => {
                        setOffering('service');
                        setError(null);
                      }}
                    >
                      Service
                    </button>
                    <button
                      type="button"
                      className={`lead-magnet-platform-btn ${offering === 'product' ? 'ring-2 ring-violet-400' : ''}`}
                      aria-pressed={offering === 'product'}
                      onClick={() => {
                        setOffering('product');
                        setError(null);
                      }}
                    >
                      Product
                    </button>
                  </div>
                  {!hasWebsite && offering === 'service' ? (
                    <label className="landing-body block text-sm text-white/70">
                      Industry
                      <select
                        value={manualIndustry}
                        onChange={(e) => {
                          setManualIndustry(e.target.value);
                          setError(null);
                        }}
                        className="lead-magnet-input mt-2"
                      >
                        <option value="">Select your industry</option>
                        {TRY_IT_INDUSTRIES.map((industry) => (
                          <option key={industry} value={industry}>
                            {industry}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  {offering === 'product' ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="landing-body text-sm text-white/70">
                          Product image
                        </p>
                        {productImage ? (
                          <button
                            type="button"
                            className="landing-body inline-flex items-center gap-1 text-xs text-white/45 hover:text-white/80"
                            onClick={() => {
                              setProductImage('');
                              setProductFileName('');
                              if (productInputRef.current)
                                productInputRef.current.value = '';
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remove
                          </button>
                        ) : null}
                      </div>
                      <input
                        ref={productInputRef}
                        id="try-it-product-upload"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          void readImage(file)
                            .then((data) => {
                              setProductImage(data);
                              setProductFileName(file.name);
                              setError(null);
                            })
                            .catch((err) => setError(err.message));
                        }}
                        className="sr-only"
                      />
                      <button
                        type="button"
                        onClick={() => productInputRef.current?.click()}
                        className="flex w-full items-center gap-4 rounded-xl border border-dashed border-white/20 bg-white/[0.025] p-3 text-left transition hover:border-white/40 hover:bg-white/[0.05]"
                      >
                        <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/30">
                          {productImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={productImage}
                              alt="Product preview"
                              className="h-full w-full object-contain p-1"
                            />
                          ) : (
                            <ImagePlus className="h-6 w-6 text-white/35" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="landing-body block text-sm text-white/75">
                            {productFileName || 'Upload your product image'}
                          </span>
                          <span className="landing-body mt-1 block text-xs text-white/40">
                            PNG, JPG, or WebP up to 4 MB
                          </span>
                        </span>
                        <Upload className="h-4 w-4 shrink-0 text-white/45" />
                      </button>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="landing-btn-primary w-full sm:w-auto"
                      onClick={() => {
                        if (!offering) {
                          setError('Choose service or product.');
                          return;
                        }
                        if (
                          !hasWebsite &&
                          offering === 'service' &&
                          !manualIndustry
                        ) {
                          setError('Select your industry.');
                          return;
                        }
                        if (offering === 'product' && !productImage) {
                          setError('Choose a product image.');
                          return;
                        }
                        if (!hasWebsite && offering === 'service') {
                          setDna({ ...dna, industry: manualIndustry });
                        }
                        setError(null);
                        setStep('platform');
                        scrollToSection();
                      }}
                    >
                      Continue
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
                      Change brand details
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
                          disabled={busy || !dna || !offering}
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
                      Try another brand
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
