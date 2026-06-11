'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  Globe,
  Hash,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Palette,
  Phone,
  Sparkles,
  Tag,
  Upload,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { scrapeUrl } from '@/src/service/api/scrape';
import {
  onBoardUser,
  suggestOnboardingBrandCopy,
  uploadLogo,
} from '@/src/service/api/userService';
import { showErrorToast } from '@/lib/show-error-toast';

type QuestionType =
  | 'text'
  | 'number'
  | 'select'
  | 'file'
  | 'color'
  | 'textarea'
  | 'hashtags'
  | 'brandSlogan';

type Question = {
  name: string;
  label: string;
  description?: string;
  placeholder?: string;
  type: QuestionType;
  options?: string[];
  icon: React.ComponentType<{ className?: string }>;
};

const questions: Question[] = [
  {
    name: 'website',
    label: 'Website URL',
    description:
      "Paste your site and we'll try to fill in the rest of the form for you.",
    placeholder: 'https://yourbrand.com',
    type: 'text',
    icon: Globe,
  },
  {
    name: 'businessName',
    label: 'What is your business name?',
    description: 'The name your customers know you by.',
    placeholder: 'Acme Co.',
    type: 'text',
    icon: Building2,
  },
  {
    name: 'businesscontact',
    label: 'What is your business contact?',
    description: 'A phone number where customers can reach you.',
    placeholder: '+1 555 123 4567',
    type: 'number',
    icon: Phone,
  },
  {
    name: 'industry',
    label: 'Select your industry',
    description: 'Helps us tune content to your niche.',
    type: 'select',
    icon: Tag,
    options: [
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
    ],
  },
  {
    name: 'logo',
    label: 'Upload your logo',
    description: 'PNG or JPG, ideally on a transparent background.',
    type: 'file',
    icon: ImageIcon,
  },
  {
    name: 'location',
    label: 'Select your location',
    description: 'Where your brand is primarily based.',
    type: 'select',
    icon: MapPin,
    options: [
      'United States',
      'India',
      'United Kingdom',
      'Canada',
      'Australia',
      'Germany',
      'France',
      'Brazil',
      'Japan',
      'China',
      'South Africa',
      'Mexico',
      'Spain',
      'Italy',
      'Singapore',
      'Netherlands',
      'UAE',
      'Indonesia',
      'Russia',
      'Other',
    ],
  },
  {
    name: 'hashtags',
    label: 'Preferred hashtags',
    description: 'Tap our AI suggestions or type your own, comma-separated.',
    placeholder: 'e.g. coffee, mornings, yourbrand',
    type: 'hashtags',
    icon: Hash,
  },
  {
    name: 'brandSlogan',
    label: 'Brand slogan',
    description: 'A short line that captures your brand promise.',
    placeholder: 'Your brand slogan or tagline',
    type: 'brandSlogan',
    icon: Sparkles,
  },
  {
    name: 'primaryColor',
    label: 'Primary Brand Color',
    description: 'Your dominant brand color — used most prominently.',
    type: 'color',
    icon: Palette,
  },
  {
    name: 'secondaryColor',
    label: 'Secondary Brand Color',
    description: 'Supports your primary color across assets.',
    type: 'color',
    icon: Palette,
  },
  {
    name: 'accentColor',
    label: 'Accent Brand Color',
    description: 'A pop color for highlights and call-outs.',
    type: 'color',
    icon: Palette,
  },
  {
    name: 'brandDescription',
    label: 'What does your brand do?',
    description: 'A few sentences about what you sell and who you serve.',
    placeholder:
      'We make small-batch cold brew for office breakrooms — bold flavor, no jitters.',
    type: 'textarea',
    icon: FileText,
  },
];

function parseHashtagTokens(raw: unknown): string[] {
  if (raw == null || raw === '') return [];
  const s = String(raw).trim();
  if (!s) return [];
  return s
    .split(/[,]+/)
    .map((t) => t.replace(/^#+/, '').trim())
    .filter(Boolean);
}

function normalizeHashtagKey(t: string): string {
  return t.replace(/^#+/, '').trim().toLowerCase();
}

export default function OnboardingMenu() {
  const [step, setStep] = useState<number>(0);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [fetchingBusinessData, setFetchingBusinessData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [copySuggestions, setCopySuggestions] = useState<{
    hashtags: string[];
    slogans: string[];
  } | null>(null);
  const formDataRef = useRef(formData);
  const hashtagSuggestStartedRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    if (localStorage.getItem('isNewUser') != null) {
      localStorage.removeItem('isNewUser');
    }
  }, []);

  useEffect(() => {
    const q = questions[step];
    if (q?.name !== 'hashtags' || hashtagSuggestStartedRef.current) return;
    hashtagSuggestStartedRef.current = true;
    let cancelled = false;
    const fd = formDataRef.current;
    (async () => {
      setSuggestLoading(true);
      try {
        const res = await suggestOnboardingBrandCopy({
          businessName:
            typeof fd.businessName === 'string' ? fd.businessName : undefined,
          industry: typeof fd.industry === 'string' ? fd.industry : undefined,
          location: typeof fd.location === 'string' ? fd.location : undefined,
          website: typeof fd.website === 'string' ? fd.website : undefined,
          brandDescription:
            typeof fd.brandDescription === 'string'
              ? fd.brandDescription
              : undefined,
        });
        if (
          !cancelled &&
          res.success &&
          res.data &&
          typeof res.data === 'object'
        ) {
          const { hashtags, slogans } = res.data;
          if (Array.isArray(hashtags) && Array.isArray(slogans)) {
            setCopySuggestions({ hashtags, slogans });
          }
        }
      } catch (error) {
        hashtagSuggestStartedRef.current = false;
        showErrorToast(
          error instanceof Error
            ? error.message
            : 'Could not load AI suggestions — you can still type your own.'
        );
      } finally {
        if (!cancelled) setSuggestLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, files } = target;
    if (target.type === 'file') {
      const file = files?.[0];
      if (file) {
        setFormData((prev) => ({ ...prev, [name]: file }));
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const toggleHashtagChip = (tag: string) => {
    const clean = tag.replace(/^#+/, '').trim();
    if (!clean) return;
    setFormData((prev) => {
      const tokens = parseHashtagTokens(prev.hashtags);
      const key = normalizeHashtagKey(clean);
      const idx = tokens.findIndex((t) => normalizeHashtagKey(t) === key);
      const next =
        idx >= 0 ? tokens.filter((_, i) => i !== idx) : [...tokens, clean];
      return { ...prev, hashtags: next.join(', ') };
    });
  };

  const handleNext = async () => {
    if (step < questions.length - 1) return setStep(step + 1);
    const dataToSave = { ...formData };
    try {
      setLoading(true);
      if (formData.logo instanceof File || typeof formData.logo === 'string') {
        const uploadRes = await uploadLogo(formData.logo);
        const uploadedUrl = (uploadRes as { data?: { url?: string } })?.data
          ?.url;
        if (uploadedUrl) dataToSave.logo = uploadedUrl;
      }
      const response = await onBoardUser(dataToSave);
      if (response.success) router.push('/brand-memory');
    } catch (error) {
      showErrorToast(
        error instanceof Error ? error.message : 'Failed to onboard user'
      );
    } finally {
      setLoading(false);
    }
  };

  const skipEntirely = () => router.push('/home');

  const skipCurrentStep = () => {
    if (step < questions.length - 1) setStep(step + 1);
    else void handleNext();
  };

  const fetchOnboarding = async (name: string) => {
    if (name === 'website') {
      setFetchingBusinessData(true);
      try {
        const response = await scrapeUrl(String(formData.website ?? ''));
        const payload = response.data ?? response;
        const dnaFields =
          (payload as { dna?: Record<string, unknown> }).dna ?? payload;
        const flat: Record<string, unknown> = {
          ...(dnaFields as Record<string, unknown>),
        };
        setFormData((prev) => ({ ...prev, ...flat }));
      } catch (error) {
        showErrorToast(
          error instanceof Error
            ? error.message
            : 'Failed to extract business data'
        );
      } finally {
        setFetchingBusinessData(false);
      }
    }
  };

  const current = questions[step];
  const Icon = current.icon;
  const totalSteps = questions.length;
  const progressValue = useMemo(
    () => ((step + 1) / totalSteps) * 100,
    [step, totalSteps]
  );
  const selectedHashtagKeys = useMemo(
    () =>
      new Set(parseHashtagTokens(formData.hashtags).map(normalizeHashtagKey)),
    [formData.hashtags]
  );

  const renderHashtagsStep = () => {
    const tokens = parseHashtagTokens(formData.hashtags);
    return (
      <div className="space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Suggestions
            </Label>
            {suggestLoading && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Generating…
              </span>
            )}
          </div>
          {copySuggestions && copySuggestions.hashtags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {copySuggestions.hashtags.map((tag) => {
                const key = normalizeHashtagKey(tag);
                const on = selectedHashtagKeys.has(key);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleHashtagChip(tag)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-all',
                      on
                        ? 'border-transparent bg-gradient-primary text-white shadow-sm'
                        : 'border-border bg-card text-foreground hover:border-primary-blue/40 hover:bg-primary-blue/5 hover:text-primary-blue'
                    )}
                  >
                    {on && <CheckCircle2 className="size-3.5" />}#
                    {tag.replace(/^#+/, '')}
                  </button>
                );
              })}
            </div>
          ) : !suggestLoading ? (
            <p className="text-sm text-muted-foreground">
              No suggestions yet — type your own below.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="hashtags"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Your list
          </Label>
          <Input
            id="hashtags"
            type="text"
            name="hashtags"
            value={String(formData.hashtags ?? '')}
            onChange={handleChange}
            placeholder="e.g. coffee, mornings, yourbrand"
            className="h-11 rounded-xl bg-card px-3 text-base shadow-sm"
          />
          {tokens.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {tokens.length} hashtag{tokens.length === 1 ? '' : 's'} selected
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderBrandSloganStep = () => (
    <div className="space-y-5">
      {copySuggestions && copySuggestions.slogans.length > 0 && (
        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            AI suggestions
          </Label>
          <div className="flex flex-col gap-2">
            {copySuggestions.slogans.map((line) => {
              const active = formData.brandSlogan === line;
              return (
                <button
                  type="button"
                  key={line}
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, brandSlogan: line }))
                  }
                  className={cn(
                    'group flex items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all',
                    active
                      ? 'border-primary-purple/60 bg-primary-purple/5 text-foreground shadow-sm'
                      : 'border-border bg-card text-foreground hover:border-primary-blue/40 hover:bg-primary-blue/5'
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border',
                      active
                        ? 'border-primary-purple/60 bg-gradient-primary text-white'
                        : 'border-border bg-background text-muted-foreground group-hover:border-primary-blue/50'
                    )}
                  >
                    {active && <CheckCircle2 className="size-3.5" />}
                  </span>
                  <span className="leading-relaxed">{line}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="space-y-2">
        <Label
          htmlFor="brandSlogan"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Or write your own
        </Label>
        <Input
          id="brandSlogan"
          type="text"
          name="brandSlogan"
          value={String(formData.brandSlogan ?? '')}
          onChange={handleChange}
          placeholder="Your brand slogan or tagline"
          className="h-11 rounded-xl bg-card px-3 text-base shadow-sm"
        />
      </div>
    </div>
  );

  const renderField = () => {
    if (current.type === 'hashtags') return renderHashtagsStep();
    if (current.type === 'brandSlogan') return renderBrandSloganStep();

    if (current.type === 'textarea') {
      return (
        <Textarea
          id={current.name}
          name={current.name}
          value={String(formData[current.name] ?? '')}
          onChange={handleChange}
          rows={5}
          placeholder={current.placeholder}
          className="min-h-[140px] rounded-xl bg-card px-3 py-3 text-base shadow-sm"
        />
      );
    }

    if (current.type === 'select') {
      return (
        <div className="relative">
          <select
            id={current.name}
            name={current.name}
            value={String(formData[current.name] ?? '')}
            onChange={handleChange}
            className={cn(
              'h-11 w-full appearance-none rounded-xl border border-input bg-card px-3 pr-10 text-base text-foreground shadow-sm transition-colors outline-none',
              'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
            )}
          >
            <option value="" disabled>
              Select…
            </option>
            {(current.options ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <svg
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      );
    }

    if (current.type === 'file') {
      const hasLogo =
        preview || (typeof formData.logo === 'string' && formData.logo);
      const logoSrc =
        preview ||
        (typeof formData.logo === 'string' ? formData.logo : undefined);
      return (
        <div className="space-y-3">
          <label
            htmlFor={current.name}
            className={cn(
              'group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/60 px-6 py-10 text-center transition-all',
              'hover:border-primary-blue/50 hover:bg-primary-blue/5'
            )}
          >
            {hasLogo && logoSrc ? (
              <div className="flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoSrc}
                  alt="Logo preview"
                  className="h-24 max-w-[180px] rounded-xl border border-border bg-background object-contain p-2 shadow-sm"
                />
                <span className="text-xs font-medium text-muted-foreground">
                  Click to replace
                </span>
              </div>
            ) : (
              <>
                <span className="flex size-12 items-center justify-center rounded-full bg-gradient-primary text-white shadow-sm transition-transform group-hover:scale-105">
                  <Upload className="size-5" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Click to upload your logo
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG or JPG · transparent background recommended
                  </p>
                </div>
              </>
            )}
            <input
              id={current.name}
              type="file"
              name={current.name}
              accept="image/*"
              onChange={handleChange}
              className="sr-only"
            />
          </label>
        </div>
      );
    }

    if (current.type === 'color') {
      const colorValue = String(formData[current.name] || '#5a41e3');
      return (
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-3 shadow-sm">
          <label
            htmlFor={current.name}
            className="relative size-14 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border shadow-inner"
            style={{ backgroundColor: colorValue }}
          >
            <input
              id={current.name}
              type="color"
              name={current.name}
              value={colorValue}
              onChange={handleChange}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
          </label>
          <div className="flex-1 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Hex value
            </p>
            <Input
              type="text"
              name={current.name}
              value={colorValue}
              onChange={handleChange}
              placeholder="#000000"
              className="h-9 rounded-lg bg-background px-2.5 font-mono text-sm uppercase tracking-wide"
            />
          </div>
        </div>
      );
    }

    return (
      <Input
        id={current.name}
        type={current.type}
        name={current.name}
        value={String(formData[current.name] ?? '')}
        onChange={handleChange}
        placeholder={current.placeholder}
        className="h-11 rounded-xl bg-card px-3 text-base shadow-sm"
      />
    );
  };

  return (
    <div className="relative isolate min-h-svh w-full overflow-hidden bg-background">
      <div
        className="absolute -top-32 -left-32 size-[420px] rounded-full bg-primary-blue/15 blur-[120px]"
        aria-hidden
      />
      <div
        className="absolute -bottom-32 right-0 size-[480px] rounded-full bg-primary-purple/15 blur-[120px]"
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-10 pattern-grid opacity-50"
        aria-hidden
      />

      {fetchingBusinessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md">
          <Card className="w-[min(360px,calc(100vw-2rem))] items-center gap-3 px-6 py-8 text-center shadow-lg">
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-gradient-primary text-white shadow-md">
              <Sparkles className="size-5" />
            </span>
            <p className="bg-gradient-primary-text text-xl font-bold">
              Reading your website…
            </p>
            <p className="text-sm text-muted-foreground">
              We&apos;re extracting brand details so you can review and edit
              them in the next steps.
            </p>
            <Spinner className="size-5 text-primary" />
          </Card>
        </div>
      )}

      <div className="relative flex min-h-svh flex-col items-center justify-center px-4 py-10 sm:py-16">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="SocioGenie" className="size-9" />
              <div className="leading-tight">
                <p className="text-sm font-semibold text-foreground">
                  SocioGenie
                </p>
                <p className="text-xs text-muted-foreground">
                  Brand onboarding
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={skipEntirely}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
              Skip entirely
            </Button>
          </header>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>
                Step{' '}
                <span className="text-foreground">{step + 1}</span> of{' '}
                {totalSteps}
              </span>
              <span>{Math.round(progressValue)}%</span>
            </div>
            <Progress value={progressValue} className="h-1.5" />
          </div>

          <Card
            id="tour-onb-card"
            className="overflow-visible rounded-3xl border-border/60 bg-card/90 p-6 shadow-lg backdrop-blur-sm sm:p-8"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={current.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6"
              >
                <div className="flex items-start gap-4">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-white shadow-sm">
                    <Icon className="size-5" />
                  </span>
                  <div className="space-y-1.5">
                    <h2 className="bg-gradient-primary-text text-2xl font-bold leading-tight tracking-tight sm:text-[28px]">
                      {current.label}
                    </h2>
                    {current.description && (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {current.description}
                      </p>
                    )}
                  </div>
                </div>

                <div>{renderField()}</div>
              </motion.div>
            </AnimatePresence>

            <div
              id="tour-onb-controls"
              className="mt-8 flex items-center gap-3"
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
                disabled={step === 0 || loading || fetchingBusinessData}
                className="h-11 flex-1 rounded-xl"
              >
                <ArrowLeft className="size-4" />
                Previous
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (current.name === 'website') {
                    void fetchOnboarding(current.name);
                  }
                  void handleNext();
                }}
                disabled={loading || fetchingBusinessData}
                aria-busy={loading || fetchingBusinessData}
                className="h-11 flex-1 rounded-xl bg-gradient-primary text-white shadow-md shadow-primary-blue/20 transition-all hover:shadow-lg hover:shadow-primary-blue/25"
              >
                {fetchingBusinessData ? (
                  <>
                    <Spinner className="size-4 text-white" />
                    Fetching…
                  </>
                ) : loading ? (
                  <>
                    <Spinner className="size-4 text-white" />
                    {step === totalSteps - 1 ? 'Finishing…' : 'Saving…'}
                  </>
                ) : step === totalSteps - 1 ? (
                  <>
                    Finish
                    <CheckCircle2 className="size-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>

            <div
              id="tour-onb-progress"
              className="mt-5 flex items-center justify-between border-t border-border/50 pt-4"
            >
              <p className="text-xs text-muted-foreground">
                You can edit any of this later in{' '}
                <span className="font-medium text-foreground">Brand DNA</span>.
              </p>
              <button
                type="button"
                onClick={skipCurrentStep}
                disabled={loading || fetchingBusinessData}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary-blue disabled:cursor-not-allowed disabled:opacity-50"
              >
                Skip this step
              </button>
            </div>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Your answers power every AI post we generate for you.
          </p>
        </div>
      </div>
    </div>
  );
}
