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
import { scrapeUrl, extractCatalogPdf } from '@/src/service/api/scrape';
import {
  onBoardUser,
  suggestOnboardingBrandCopy,
  uploadLogo,
} from '@/src/service/api/userService';
import { showErrorToast } from '@/lib/show-error-toast';
import { useTourState } from '@/src/stores/tourState';
import {
  OnboardingSuggestionsPanel,
  type OnboardingFieldSuggestions,
  type OnboardingColorSuggestions,
} from '@/components/onboarding/OnboardingSuggestionsPanel';

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
    label: 'Get started',
    description:
      "Paste your website URL or upload a catalog PDF — we'll try to fill in the rest of the form for you.",
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
    description: 'Upload manually — website logos appear as suggestions on the right.',
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
    description: 'Pick from suggestions or type your own, comma-separated.',
    placeholder: 'e.g. coffee, mornings, yourbrand',
    type: 'hashtags',
    icon: Hash,
  },
  {
    name: 'brandSlogan',
    label: 'Brand slogan',
    description: 'Choose a suggested tagline or write your own.',
    placeholder: 'Your brand slogan or tagline',
    type: 'brandSlogan',
    icon: Sparkles,
  },
  {
    name: 'primaryColor',
    label: 'Primary Brand Color',
    description: 'Dominant brand color — check suggestions for extracted hex values.',
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

type SourceMode = 'website' | 'catalog';

type ExtractSource = SourceMode | null;

const EMPTY_SUGGESTIONS: OnboardingFieldSuggestions = {
  logos: [],
  hashtags: [],
  slogans: [],
  colors: { primary: [], secondary: [], accent: [] },
};

function uniqueHexColors(hexes: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of hexes) {
    const t = String(raw).trim();
    if (!t) continue;
    const withHash = t.startsWith('#') ? t : `#${t}`;
    const n = withHash.toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(n) || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function parseColorSuggestions(
  flat: Record<string, unknown>
): OnboardingColorSuggestions {
  const empty: OnboardingColorSuggestions = {
    primary: [],
    secondary: [],
    accent: [],
  };
  const raw = flat.suggestedColors;
  if (raw && typeof raw === 'object') {
    const sc = raw as Record<string, unknown>;
    return {
      primary: Array.isArray(sc.primary)
        ? uniqueHexColors(sc.primary as string[])
        : [],
      secondary: Array.isArray(sc.secondary)
        ? uniqueHexColors(sc.secondary as string[])
        : [],
      accent: Array.isArray(sc.accent)
        ? uniqueHexColors(sc.accent as string[])
        : [],
    };
  }
  const pick = (v: unknown) =>
    typeof v === 'string' && v.trim() ? uniqueHexColors([v.trim()]) : [];
  return {
    primary: pick(flat.primaryColor),
    secondary: pick(flat.secondaryColor),
    accent: pick(flat.accentColor),
  };
}

function uniqueHashtags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const clean = String(raw).replace(/^#+/, '').trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const t = String(item).trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function parseExtractPayload(
  dnaFields: Record<string, unknown>,
  source: SourceMode
): {
  formFields: Record<string, unknown>;
  suggestions: OnboardingFieldSuggestions;
  source: ExtractSource;
} {
  const flat = { ...dnaFields };

  const logos =
    source === 'website'
      ? uniqueStrings(
          [
            ...(Array.isArray(flat.suggestedLogos)
              ? (flat.suggestedLogos as string[])
              : []),
            ...(typeof flat.logo === 'string' && flat.logo.trim()
              ? [flat.logo.trim()]
              : []),
          ].filter(Boolean)
        )
      : [];

  const hashtags = uniqueHashtags([
    ...parseHashtagTokens(flat.hashtags),
    ...(Array.isArray(flat.recommendedHashtags)
      ? (flat.recommendedHashtags as string[])
      : []),
  ]);

  const slogans = uniqueStrings([
    ...(typeof flat.brandSlogan === 'string' && flat.brandSlogan.trim()
      ? [flat.brandSlogan.trim()]
      : []),
    ...(Array.isArray(flat.recommendedSlogans)
      ? (flat.recommendedSlogans as string[])
      : []),
  ]);

  const suggestions: OnboardingFieldSuggestions = {
    logos,
    hashtags,
    slogans,
    colors: parseColorSuggestions(flat),
  };

  delete flat.suggestedLogos;
  delete flat.suggestedColors;
  delete flat.logo;
  delete flat.hashtags;
  delete flat.brandSlogan;
  delete flat.recommendedHashtags;
  delete flat.recommendedSlogans;
  delete flat.primaryColor;
  delete flat.secondaryColor;
  delete flat.accentColor;

  if (typeof flat.businesscontact === 'number') {
    flat.businesscontact = String(flat.businesscontact);
  }

  return { formFields: flat, suggestions, source };
}

function mergeAiCopySuggestions(
  prev: OnboardingFieldSuggestions,
  hashtags: string[],
  slogans: string[]
): OnboardingFieldSuggestions {
  return {
    ...prev,
    hashtags: uniqueHashtags([...prev.hashtags, ...hashtags]),
    slogans: uniqueStrings([...prev.slogans, ...slogans]),
  };
}

function normalizeHashtagKey(t: string): string {
  return t.replace(/^#+/, '').trim().toLowerCase();
}

export default function OnboardingMenu() {
  const [step, setStep] = useState<number>(0);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [sourceMode, setSourceMode] = useState<SourceMode>('website');
  const [catalogFile, setCatalogFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fetchingBusinessData, setFetchingBusinessData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [fieldSuggestions, setFieldSuggestions] =
    useState<OnboardingFieldSuggestions>(EMPTY_SUGGESTIONS);
  const [suggestionSource, setSuggestionSource] = useState<ExtractSource>(null);
  const [selectedSuggestionKey, setSelectedSuggestionKey] = useState<
    string | null
  >(null);
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
    const needsAiCopy =
      (q?.name === 'hashtags' || q?.name === 'brandSlogan') &&
      !hashtagSuggestStartedRef.current;
    if (!needsAiCopy) return;
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
            setFieldSuggestions((prev) =>
              mergeAiCopySuggestions(
                prev,
                hashtags.map((t) => String(t)),
                slogans.map((s) => String(s))
              )
            );
            if (!suggestionSource) setSuggestionSource('website');
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
  }, [step, suggestionSource]);

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
      if (response.success) {
        useTourState.getState().markOnboardingComplete();
        router.push('/brand-memory');
      }
    } catch (error) {
      showErrorToast(
        error instanceof Error ? error.message : 'Failed to onboard user'
      );
    } finally {
      setLoading(false);
    }
  };

  const skipEntirely = () => {
    useTourState.getState().queuePlatformTour();
    router.push('/home');
  };

  const skipCurrentStep = () => {
    if (step < questions.length - 1) setStep(step + 1);
    else void handleNext();
  };

  const fetchOnboarding = async (mode: SourceMode) => {
    if (mode === 'website') {
      const url = String(formData.website ?? '').trim();
      if (!url) return;
      setFetchingBusinessData(true);
      try {
        const response = await scrapeUrl(url) as {
          data?: { dna?: Record<string, unknown> };
          dna?: Record<string, unknown>;
        };
        const payload = response.data ?? response;
        const dnaFields =
          (payload as { dna?: Record<string, unknown> }).dna ?? payload;
        const { formFields, suggestions, source } = parseExtractPayload(
          dnaFields as Record<string, unknown>,
          'website'
        );
        setFieldSuggestions(suggestions);
        setSuggestionSource(source);
        setSelectedSuggestionKey(null);
        setFormData((prev) => ({ ...prev, ...formFields }));
      } catch (error) {
        showErrorToast(
          error instanceof Error
            ? error.message
            : 'Failed to extract business data'
        );
      } finally {
        setFetchingBusinessData(false);
      }
      return;
    }

    if (!catalogFile) return;
    setFetchingBusinessData(true);
    try {
      const response = await extractCatalogPdf(catalogFile);
      const envelope = response as {
        data?: { dna?: Record<string, unknown>; warnings?: string[] };
        dna?: Record<string, unknown>;
      };
      const payload = envelope.data ?? envelope;
      const dnaFields =
        (payload as { dna?: Record<string, unknown> }).dna ?? payload;
      const { formFields, suggestions, source } = parseExtractPayload(
        dnaFields as Record<string, unknown>,
        'catalog'
      );
      setFieldSuggestions(suggestions);
      setSuggestionSource(source);
      setSelectedSuggestionKey(null);
      setFormData((prev) => ({ ...prev, ...formFields }));
      if (
        suggestions.hashtags.length > 0 ||
        suggestions.slogans.length > 0
      ) {
        hashtagSuggestStartedRef.current = true;
      }
      const apiWarnings = (payload as { warnings?: string[] }).warnings;
      if (apiWarnings?.length) {
        console.warn('[onboarding] catalog extract warnings:', apiWarnings);
      }
    } catch (error) {
      showErrorToast(
        error instanceof Error
          ? error.message
          : 'Failed to extract business data from catalog'
      );
      throw error;
    } finally {
      setFetchingBusinessData(false);
    }
  };

  const current = questions[step];

  const handleStepNext = async () => {
    if (current.name === 'website') {
      if (sourceMode === 'catalog') {
        if (!catalogFile) return;
        try {
          await fetchOnboarding('catalog');
        } catch {
          return;
        }
      } else {
        const url = String(formData.website ?? '').trim();
        if (url) void fetchOnboarding('website');
      }
    }
    if (step < questions.length - 1) setStep(step + 1);
    else void handleNext();
  };

  const stepNextDisabled =
    loading ||
    fetchingBusinessData ||
    (current.name === 'website' &&
      sourceMode === 'catalog' &&
      !catalogFile);

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

  useEffect(() => {
    setSelectedSuggestionKey(null);
  }, [step]);

  const showSuggestionsPanel = useMemo(() => {
    const s = fieldSuggestions;
    switch (current.name) {
      case 'logo':
        return suggestionSource === 'website' && s.logos.length > 0;
      case 'hashtags':
        return s.hashtags.length > 0 || suggestLoading;
      case 'brandSlogan':
        return s.slogans.length > 0 || suggestLoading;
      case 'primaryColor':
        return fieldSuggestions.colors.primary.length > 0;
      case 'secondaryColor':
        return fieldSuggestions.colors.secondary.length > 0;
      case 'accentColor':
        return fieldSuggestions.colors.accent.length > 0;
      default:
        return false;
    }
  }, [current.name, fieldSuggestions, suggestionSource, suggestLoading]);

  const applyLogoSuggestion = (url: string) => {
    setFormData((prev) => ({ ...prev, logo: url }));
    setPreview(url);
    setSelectedSuggestionKey(`logo:${url}`);
  };

  const applyHashtagSuggestion = (tag: string) => {
    toggleHashtagChip(tag);
    setSelectedSuggestionKey(`hashtag:${tag.replace(/^#+/, '').trim()}`);
  };

  const applySloganSuggestion = (line: string) => {
    setFormData((prev) => ({ ...prev, brandSlogan: line }));
    setSelectedSuggestionKey(`brandSlogan:${line}`);
  };

  const applyColorSuggestion = (field: string, hex: string) => {
    setFormData((prev) => ({ ...prev, [field]: hex }));
    setSelectedSuggestionKey(`${field}:${hex}`);
  };

  const renderHashtagsStep = () => (
    <div className="space-y-2">
      <Label
        htmlFor="hashtags"
        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        Your hashtags
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
      {parseHashtagTokens(formData.hashtags).length > 0 && (
        <p className="text-xs text-muted-foreground">
          {parseHashtagTokens(formData.hashtags).length} hashtag
          {parseHashtagTokens(formData.hashtags).length === 1 ? '' : 's'}{' '}
          selected
        </p>
      )}
    </div>
  );

  const renderBrandSloganStep = () => (
    <div className="space-y-2">
      <Label
        htmlFor="brandSlogan"
        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        Your slogan
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
  );

  const renderField = () => {
    if (current.type === 'hashtags') return renderHashtagsStep();
    if (current.type === 'brandSlogan') return renderBrandSloganStep();

    if (current.name === 'website') {
      return (
        <div className="space-y-4">
          <div className="flex rounded-xl border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setSourceMode('website')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                sourceMode === 'website'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Globe className="size-4" />
              Website
            </button>
            <button
              type="button"
              onClick={() => setSourceMode('catalog')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                sourceMode === 'catalog'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <FileText className="size-4" />
              Catalog PDF
            </button>
          </div>

          {sourceMode === 'website' ? (
            <Input
              id={current.name}
              type="text"
              name={current.name}
              value={String(formData[current.name] ?? '')}
              onChange={handleChange}
              placeholder={current.placeholder}
              className="h-11 rounded-xl bg-card px-3 text-base shadow-sm"
            />
          ) : (
            <div className="space-y-3">
              <label
                htmlFor="catalog-upload"
                className={cn(
                  'group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/60 px-6 py-10 text-center transition-all',
                  'hover:border-primary-blue/50 hover:bg-primary-blue/5'
                )}
              >
                {catalogFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="size-10 text-primary-blue" />
                    <p className="text-sm font-medium text-foreground">
                      {catalogFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(catalogFile.size / (1024 * 1024)).toFixed(1)} MB · Click
                      to replace
                    </p>
                  </div>
                ) : (
                  <>
                    <span className="flex size-12 items-center justify-center rounded-full bg-gradient-primary text-white shadow-sm transition-transform group-hover:scale-105">
                      <Upload className="size-5" />
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        Upload your catalog or brochure PDF
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF only · up to 50 MB
                      </p>
                    </div>
                  </>
                )}
                <input
                  id="catalog-upload"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.type !== 'application/pdf') {
                      showErrorToast('Please upload a PDF file');
                      return;
                    }
                    if (file.size > 50 * 1024 * 1024) {
                      showErrorToast('PDF must be 50 MB or smaller');
                      return;
                    }
                    setCatalogFile(file);
                  }}
                  className="sr-only"
                />
              </label>
              {catalogFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setCatalogFile(null)}
                >
                  Remove file
                </Button>
              )}
            </div>
          )}
        </div>
      );
    }

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
      const raw = formData[current.name];
      const colorValue = typeof raw === 'string' ? raw.trim() : '';
      const hasColor = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(colorValue);
      const pickerValue = hasColor
        ? colorValue.length === 4
          ? `#${colorValue[1]}${colorValue[1]}${colorValue[2]}${colorValue[2]}${colorValue[3]}${colorValue[3]}`
          : colorValue
        : '#6366F1';

      return (
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-3 shadow-sm">
          <label
            htmlFor={current.name}
            className={cn(
              'relative size-14 shrink-0 cursor-pointer overflow-hidden rounded-lg border shadow-inner',
              hasColor
                ? 'border-border'
                : 'border-dashed border-muted-foreground/35 bg-muted/40'
            )}
            style={hasColor ? { backgroundColor: colorValue } : undefined}
          >
            {!hasColor && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                Pick
              </span>
            )}
            <input
              id={current.name}
              type="color"
              name={current.name}
              value={pickerValue}
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
              placeholder="Select a color or use a suggestion"
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
              {sourceMode === 'catalog' && step === 0
                ? 'Reading your catalog…'
                : 'Reading your website…'}
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
        <div
          className={cn(
            'mx-auto flex w-full flex-col gap-6',
            showSuggestionsPanel ? 'max-w-5xl' : 'max-w-xl'
          )}
        >
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

          <div
            className={cn(
              'flex flex-col gap-6',
              showSuggestionsPanel && 'lg:flex-row lg:items-start lg:gap-5'
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-6">
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
                onClick={() => void handleStepNext()}
                disabled={stepNextDisabled}
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
            </div>

            {showSuggestionsPanel && (
              <OnboardingSuggestionsPanel
                stepName={current.name}
                sourceLabel={suggestionSource}
                suggestions={fieldSuggestions}
                loading={
                  suggestLoading &&
                  (current.name === 'hashtags' ||
                    current.name === 'brandSlogan')
                }
                selectedKey={selectedSuggestionKey}
                onSelectLogo={applyLogoSuggestion}
                onSelectHashtag={applyHashtagSuggestion}
                onSelectSlogan={applySloganSuggestion}
                onSelectColor={applyColorSuggestion}
                selectedHashtagKeys={selectedHashtagKeys}
                activeFieldValue={String(formData[current.name] ?? '')}
              />
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Your answers power every AI post we generate for you.
          </p>
        </div>
      </div>
    </div>
  );
}
