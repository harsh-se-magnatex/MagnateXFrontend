'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
import {
  getProfile,
  setLogoVariantsForImagesPreference,
  suggestOnboardingBrandCopy,
  updateProfile,
  uploadLogo,
  setVideoAvatarPreference,
  uploadVideoAvatar,
} from '@/src/service/api/userService';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Brain,
  Save,
  Sparkles,
  Fingerprint,
  ImagePlus,
  Smartphone,
  WandSparkles,
  Globe,
  FileText,
  Upload,
  UserRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FieldSeparator } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { scrapeUrl, extractCatalogPdf } from '@/src/service/api/scrape';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/show-error-toast';
import { workspacePageTitleClass } from '@/lib/workspace-ui';
import { normalizeWebsiteUrl } from '@/utils/normalizeWebsiteUrl';
import { PageLookSelector } from '@/components/onboarding/PageLookSelector';
import { CountryCodePhoneField } from '@/components/shared/CountryCodePhoneField';
import {
  ImagePreviewButton,
  ImagePreviewOverlay,
  useImagePreview,
} from '@/components/image-preview';
import {
  joinPhone,
  normalizeBusinessContactValue,
  splitStoredPhone,
} from '@/lib/country-codes';

type SourceMode = 'website' | 'catalog';

type BusinessProfileForm = {
  businessEmail: string;
  businesscontact: string;
  businessName: string;
  industry: string;
  website: string;
  location: string;
  hashtags: string;
  brandSlogan: string;
  brandDescription: string;
  imageStyle: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logo: string;
  /** Persisted AI suggestions; shown in UI only when hashtags / slogan empty. */
  recommendedHashtags: string[];
  recommendedSlogans: string[];
  /** Explicit true = use variants in AI images and keep saved variants; omitted/false = off. */
  useLogoVariantsForImages?: boolean;
};

const inputBase =
  'w-full rounded-xl border border-default bg-element px-4 py-2.5 text-default placeholder-muted-foreground focus:border-primary-purple focus:outline-none focus:ring-2 focus:ring-strong transition-expo';

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Already in our bucket — re-upload would rotate the download token and 403 old URLs. */
function isAppStoredLogoUrl(url: string): boolean {
  if (!url.includes('firebasestorage.googleapis.com')) return false;
  return (
    url.includes('/logos') ||
    url.includes('%2Flogos') ||
    url.includes('/ai-generated-logos') ||
    url.includes('%2Fai-generated-logos')
  );
}

function parseHashtagTokens(raw: unknown): string[] {
  if (raw == null || raw === '') return [];
  if (Array.isArray(raw)) {
    return raw
      .map((t) =>
        String(t ?? '')
          .replace(/^#+/, '')
          .trim()
      )
      .filter(Boolean);
  }
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

function toStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x ?? '').trim()).filter(Boolean);
}

function uniqueStringList(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const t = String(item ?? '').trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

function uniqueHashtagList(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const t = String(item ?? '')
      .replace(/^#+/, '')
      .trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export default function BusinessProfilePage() {
  const { user, loading } = useAuth();
  const { billing } = useUserPlanCredits();
  const router = useRouter();
  const [formData, setFormData] = useState<BusinessProfileForm>({
    businessEmail: '',
    businesscontact: '',
    businessName: '',
    industry: '',
    website: '',
    location: '',
    hashtags: '',
    brandSlogan: '',
    brandDescription: '',
    imageStyle: '',
    primaryColor: '',
    secondaryColor: '',
    accentColor: '',
    logo: '',
    recommendedHashtags: [],
    recommendedSlogans: [],
    useLogoVariantsForImages: false,
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [variantsPreferenceLoading, setVariantsPreferenceLoading] =
    useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [fetchingBusinessData, setFetchingBusinessData] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [sourceMode, setSourceMode] = useState<SourceMode>('website');
  const [catalogFile, setCatalogFile] = useState<File | null>(null);
  /** Mirrors last-loaded / last-saved profile: hide AI blocks once user has committed values. */
  const [committedHashtagsSaved, setCommittedHashtagsSaved] = useState(false);
  const [committedSloganSaved, setCommittedSloganSaved] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState('');
  const [phoneNationalNumber, setPhoneNationalNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [useVideoAvatar, setUseVideoAvatar] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const avatarPreview = useImagePreview();

  const activePlan = billing?.activePlan;

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleWebsiteFieldBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim();
    if (!raw) return;
    const normalized = normalizeWebsiteUrl(raw);
    if (normalized !== raw) {
      setFormData((prev) => ({ ...prev, website: normalized }));
    }
  };

  const handleWebsiteFetchBlur = () => {
    const raw = websiteUrl.trim();
    if (!raw) return;
    const normalized = normalizeWebsiteUrl(raw);
    if (normalized !== raw) setWebsiteUrl(normalized);
  };

  const updatePhone = (countryCode: string, nationalNumber: string) => {
    const nextNationalNumber = digitsOnly(nationalNumber);
    setPhoneCountryCode(countryCode);
    setPhoneNationalNumber(nextNationalNumber);
    setFormData((prev) => ({
      ...prev,
      businesscontact: joinPhone(countryCode, nextNationalNumber),
    }));
  };

  const applyStoredPhone = (stored: unknown) => {
    const { countryCode, nationalNumber } = splitStoredPhone(stored);
    setPhoneCountryCode(countryCode);
    setPhoneNationalNumber(nationalNumber);
    const e164 = joinPhone(countryCode, nationalNumber);
    setFormData((prev) => ({ ...prev, businesscontact: e164 }));
  };

  const showRecommendedHashtags =
    formData.recommendedHashtags.length > 0 && !committedHashtagsSaved;
  const showRecommendedSlogans =
    formData.recommendedSlogans.length > 0 && !committedSloganSaved;

  const selectedHashtagKeys = useMemo(
    () =>
      new Set(parseHashtagTokens(formData.hashtags).map(normalizeHashtagKey)),
    [formData.hashtags]
  );

  const toggleRecommendedHashtag = (tag: string) => {
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

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () =>
      setFormData((prev) => ({ ...prev, logo: reader.result as string }));
    reader.readAsDataURL(file);
    setSelectedImage(file);
    e.target.value = '';
  };

  const suggestPayloadFromFields = (fields: {
    businessName?: unknown;
    industry?: unknown;
    location?: unknown;
    website?: unknown;
    brandDescription?: unknown;
  }) => ({
    businessName:
      typeof fields.businessName === 'string' ? fields.businessName : undefined,
    industry: typeof fields.industry === 'string' ? fields.industry : undefined,
    location: typeof fields.location === 'string' ? fields.location : undefined,
    website: typeof fields.website === 'string' ? fields.website : undefined,
    brandDescription:
      typeof fields.brandDescription === 'string'
        ? fields.brandDescription
        : undefined,
  });

  const hasSuggestContext = (fields: {
    businessName?: unknown;
    industry?: unknown;
    location?: unknown;
    website?: unknown;
    brandDescription?: unknown;
  }) => {
    const p = suggestPayloadFromFields(fields);
    return Boolean(
      p.businessName?.trim() ||
      p.industry?.trim() ||
      p.location?.trim() ||
      p.website?.trim() ||
      p.brandDescription?.trim()
    );
  };

  /** Generates + persists recommended hashtags/slogans; returns them or null. */
  const fetchBrandCopySuggestions = async (fields: {
    businessName?: unknown;
    industry?: unknown;
    location?: unknown;
    website?: unknown;
    brandDescription?: unknown;
  }) => {
    if (!hasSuggestContext(fields)) return null;
    try {
      const res = await suggestOnboardingBrandCopy(
        suggestPayloadFromFields(fields)
      );
      if (
        res.success &&
        res.data &&
        Array.isArray(res.data.hashtags) &&
        Array.isArray(res.data.slogans)
      ) {
        return {
          hashtags: res.data.hashtags.map((t) => String(t)),
          slogans: res.data.slogans.map((s) => String(s)),
        };
      }
    } catch {
      // Soft-fail: DNA fields still usable without suggestions.
    }
    return null;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setProfileLoading(true);
        const response = await getProfile();
        if (response.success && response.data?.profile) {
          const p = response.data.profile as BusinessProfileForm &
            Record<string, unknown>;
          const brandSloganRaw = p.brandSlogan;
          const brandSlogan =
            typeof brandSloganRaw === 'string'
              ? brandSloganRaw
              : brandSloganRaw != null
                ? String(brandSloganRaw)
                : '';
          const hashtagsJoined = parseHashtagTokens(p.hashtags).join(', ');
          let recommendedHashtags = toStringArray(p.recommendedHashtags);
          let recommendedSlogans = toStringArray(p.recommendedSlogans);
          setCommittedHashtagsSaved(
            parseHashtagTokens(hashtagsJoined).length > 0
          );
          setCommittedSloganSaved(!!brandSlogan.trim());
          setFormData((prev) => ({
            ...prev,
            ...p,
            hashtags: hashtagsJoined,
            brandSlogan,
            recommendedHashtags,
            recommendedSlogans,
            useLogoVariantsForImages: p.useLogoVariantsForImages === true,
          }));
          setAvatarUrl(String(p.videoAvatarUrl ?? '').trim() || null);
          setUseVideoAvatar(p.useVideoAvatar === true);
          applyStoredPhone(p.businesscontact);

          // Skipped onboarding / raced past suggest → backfill recommendations.
          if (
            (recommendedHashtags.length === 0 ||
              recommendedSlogans.length === 0) &&
            hasSuggestContext(p)
          ) {
            const copy = await fetchBrandCopySuggestions(p);
            if (copy) {
              recommendedHashtags =
                copy.hashtags.length > 0 ? copy.hashtags : recommendedHashtags;
              recommendedSlogans =
                copy.slogans.length > 0 ? copy.slogans : recommendedSlogans;
              setFormData((prev) => ({
                ...prev,
                recommendedHashtags,
                recommendedSlogans,
              }));
            }
          }
        }
      } finally {
        setProfileLoading(false);
      }
    };
    if (user) fetchProfile();
  }, [user]);

  const handleAvatarUpload = useCallback(async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showErrorToast('Please upload a JPEG, PNG, or WebP avatar photo.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showErrorToast('Avatar photo must be smaller than 10 MB.');
      return;
    }
    setAvatarSaving(true);
    try {
      const response = await uploadVideoAvatar(file);
      setAvatarUrl(response.data?.avatarUrl ?? null);
      setUseVideoAvatar(response.data?.enabled === true);
      toast.success('AI avatar created');
    } catch {
      showErrorToast(
        'Could not create your AI avatar. Please try again later.'
      );
    } finally {
      setAvatarSaving(false);
    }
  }, []);

  const handleAvatarToggle = useCallback(async () => {
    if (!avatarUrl || avatarSaving) return;
    const next = !useVideoAvatar;
    setAvatarSaving(true);
    try {
      const response = await setVideoAvatarPreference(next);
      setUseVideoAvatar(response.data?.enabled === true);
      toast.success(
        next ? 'Avatar enabled for videos' : 'Avatar disabled for videos'
      );
    } catch {
      showErrorToast(
        'Could not update the avatar preference. Please try again later.'
      );
    } finally {
      setAvatarSaving(false);
    }
  }, [avatarSaving, avatarUrl, useVideoAvatar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      let finalLogoForVariants = formData.logo;
      let colorTemplatesGenerationStarted = false;
      if (selectedImage) {
        const uploaded = await uploadLogo(selectedImage);
        finalLogoForVariants = String(
          uploaded?.data?.url || finalLogoForVariants || ''
        );
        colorTemplatesGenerationStarted =
          uploaded?.data?.colorTemplatesGenerationStarted === true;
        setFormData((prev) => ({ ...prev, logo: finalLogoForVariants }));
        setSelectedImage(null);
      } else if (
        typeof formData.logo === 'string' &&
        formData.logo.trim() &&
        !isAppStoredLogoUrl(formData.logo)
      ) {
        const response = await uploadLogo(formData.logo);
        finalLogoForVariants = String(
          response?.data?.url || finalLogoForVariants || ''
        );
        colorTemplatesGenerationStarted =
          response?.data?.colorTemplatesGenerationStarted === true;
        setFormData((prev: any) => ({ ...prev, logo: finalLogoForVariants }));
      }

      let recommendedHashtags = formData.recommendedHashtags;
      let recommendedSlogans = formData.recommendedSlogans;
      if (
        (recommendedHashtags.length === 0 || recommendedSlogans.length === 0) &&
        hasSuggestContext(formData)
      ) {
        const copy = await fetchBrandCopySuggestions(formData);
        if (copy) {
          if (copy.hashtags.length > 0) recommendedHashtags = copy.hashtags;
          if (copy.slogans.length > 0) recommendedSlogans = copy.slogans;
          setFormData((prev) => ({
            ...prev,
            recommendedHashtags,
            recommendedSlogans,
          }));
        }
      }

      const normalizedBusinessContact = normalizeBusinessContactValue(
        joinPhone(phoneCountryCode, phoneNationalNumber)
      );

      await updateProfile({
        ...formData,
        businesscontact: normalizedBusinessContact,
        logo: finalLogoForVariants,
        recommendedHashtags,
        recommendedSlogans,
        website:
          typeof formData.website === 'string' && formData.website.trim()
            ? normalizeWebsiteUrl(formData.website)
            : formData.website,
      });
      applyStoredPhone(normalizedBusinessContact);
      setCommittedHashtagsSaved(
        parseHashtagTokens(formData.hashtags).length > 0
      );
      setCommittedSloganSaved(!!String(formData.brandSlogan ?? '').trim());
      if (finalLogoForVariants) {
        try {
          sessionStorage.setItem(
            'template_dna_logo_for_variants',
            finalLogoForVariants
          );
          sessionStorage.setItem('template_dna_force_fresh_variants', '1');
        } catch {}
      }
      setWebsiteUrl('');
      toast.success('Profile updated successfully');
    } catch (error: any) {
      showErrorToast('Failed to update profile. Please Try Again Later.');
    } finally {
      setSaving(false);
    }
  };

  const applyExtractedDna = async (
    dnaFields: Record<string, unknown>,
    fallbackWebsite?: string
  ) => {
    const flat: Record<string, unknown> = { ...dnaFields };
    // Don't auto-fill committed hashtags/slogan from scrape — AI suggestions below.
    delete flat.hashtags;
    delete flat.brandSlogan;
    delete flat.recommendedHashtags;
    delete flat.recommendedSlogans;
    delete flat.suggestedLogos;
    delete flat.suggestedColors;
    delete flat.warnings;
    delete flat.logo;

    if (typeof flat.businesscontact === 'number') {
      flat.businesscontact = String(flat.businesscontact);
    }

    const resolvedWebsite =
      typeof flat.website === 'string' && flat.website.trim()
        ? String(flat.website)
        : fallbackWebsite || undefined;

    setFormData((prev) => ({
      ...prev,
      ...flat,
      ...(resolvedWebsite ? { website: resolvedWebsite } : {}),
      // Clear stale suggestions until the new AI copy arrives.
      recommendedHashtags: [],
      recommendedSlogans: [],
    }));
    if (flat.businesscontact != null) {
      applyStoredPhone(flat.businesscontact);
    }

    const suggestFields = {
      businessName: flat.businessName,
      industry: flat.industry,
      location: flat.location,
      website: resolvedWebsite,
      brandDescription: flat.brandDescription,
    };
    const copy = await fetchBrandCopySuggestions(suggestFields);
    if (copy) {
      // Replace (do not merge with previous brand's recommendations).
      setFormData((prev) => ({
        ...prev,
        recommendedHashtags: uniqueHashtagList(copy.hashtags),
        recommendedSlogans: uniqueStringList(copy.slogans),
      }));
      // Show suggestion chips for the newly fetched brand even if the form
      // still has old committed hashtags/slogan values.
      setCommittedHashtagsSaved(false);
      setCommittedSloganSaved(false);
    }
  };

  const fetchOnboarding = async (rawWebsiteUrl: string) => {
    const websiteUrl = normalizeWebsiteUrl(rawWebsiteUrl.trim());
    if (!websiteUrl) return;
    if (websiteUrl !== rawWebsiteUrl.trim()) setWebsiteUrl(websiteUrl);
    setFetchingBusinessData(true);
    try {
      const response = await scrapeUrl(websiteUrl);
      const payload = (response as any).data ?? response;
      const dnaFields = payload.dna ?? payload;
      await applyExtractedDna(dnaFields as Record<string, unknown>, websiteUrl);
    } catch (error: unknown) {
      showErrorToast(
        'Failed to extract business data. Please Try Again Later.'
      );
    } finally {
      setFetchingBusinessData(false);
    }
  };

  const fetchFromCatalog = async () => {
    if (!catalogFile) return;
    setFetchingBusinessData(true);
    try {
      const response = await extractCatalogPdf(catalogFile);
      const envelope = response as {
        data?: { dna?: Record<string, unknown>; warnings?: string[] };
        dna?: Record<string, unknown>;
        warnings?: string[];
      };
      const payload = envelope.data ?? envelope;
      const dnaFields =
        (payload as { dna?: Record<string, unknown> }).dna ?? payload;
      await applyExtractedDna(dnaFields as Record<string, unknown>);
      const apiWarnings = (payload as { warnings?: string[] }).warnings;
      if (apiWarnings?.length) {
        console.warn('[template-dna] catalog extract warnings:', apiWarnings);
      }
      toast.success('Business data extracted from catalog');
    } catch (error: unknown) {
      showErrorToast(
        'Failed to extract business data from catalog. Please Try Again Later.'
      );
    } finally {
      setFetchingBusinessData(false);
    }
  };

  const handleCatalogFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
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
  };

  const handleGenerateVariants = () => {
    if (!formData.logo) return;
    try {
      sessionStorage.setItem('template_dna_logo_for_variants', formData.logo);
      sessionStorage.setItem('template_dna_force_fresh_variants', '1');
    } catch {}
    router.push('/brand-dna/variants');
  };

  const handleVariantsForImagesToggle = async (checked: boolean) => {
    try {
      setVariantsPreferenceLoading(true);
      const res = await setLogoVariantsForImagesPreference(checked);
      setFormData((prev) => ({
        ...prev,
        useLogoVariantsForImages: checked,
      }));
      if (checked && formData.logo) {
        try {
          sessionStorage.setItem(
            'template_dna_logo_for_variants',
            formData.logo
          );
          sessionStorage.setItem('template_dna_force_fresh_variants', '1');
        } catch {}
      }
      const started = res?.data?.backgroundGenerationStarted === true;
      toast.success(
        checked
          ? started
            ? 'Logo variants are on. We are generating them in the background—open the Variants page in a moment to see them.'
            : 'Logo variants are on. Add a logo to your profile so we can generate variants automatically.'
          : 'Logo variants are off. AI images will use only your main logo.'
      );
    } catch (error: unknown) {
      showErrorToast(
        'Could not update variant preference. Please Try Again Later.'
      );
    } finally {
      setVariantsPreferenceLoading(false);
    }
  };

  if (loading) return <PageLoadingState />;
  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-500">
      <header className="mb-10">
        <h1 className={cn(workspacePageTitleClass, 'flex items-center gap-3')}>
          Brand Identity & DNA
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-purple/10 border border-primary-purple/20">
            <Fingerprint className="w-4 h-4 text-preview" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-preview">
              Core Setup
            </span>
          </div>
        </h1>
        <p className="mt-2 text-base text-secondary max-w-2xl">
          Manage your business details here.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          {/* Business Profile */}
          <section className="glass-card rounded-3xl p-6 sm:p-8 border border-default relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-purple/10 rounded-full blur-3xl opacity-50 -z-10 translate-x-1/2/2"></div>

            <div className="flex items-center gap-3 mb-8 border-b border-default">
              <div className="p-2.5 bg-primary-purple/10 rounded-xl text-preview">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-section text-default">Business Profile</h2>
              </div>
            </div>

            {profileLoading ? (
              <PageLoadingState
                className="min-h-0 py-20"
                message="Loading profile..."
              />
            ) : (
              <div className="flex flex-col gap-y-4">
                <h3 className="text-center">
                  Fetch business DNA from your website or catalog PDF
                </h3>

                <div className="flex rounded-xl border border-white/15 bg-default p-1">
                  <button
                    type="button"
                    onClick={() => setSourceMode('website')}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium transition-expo',
                      sourceMode === 'website'
                        ? 'bg-primary text-white'
                        : 'text-secondary hover:text-default'
                    )}
                  >
                    <Globe className="h-4 w-4" />
                    Website
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceMode('catalog')}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium transition-expo',
                      sourceMode === 'catalog'
                        ? 'bg-primary text-link-foreground'
                        : 'text-secondary hover:text-default'
                    )}
                  >
                    <FileText className="h-4 w-4" />
                    Catalog PDF
                  </button>
                </div>

                {sourceMode === 'website' ? (
                  <div className="sm:flex-row sm:gap-2 space-y-2 sm:space-y-0 flex flex-col">
                    <input
                      type="text"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      onBlur={handleWebsiteFetchBlur}
                      placeholder="example.com or https://example.com"
                      className={inputBase}
                    />
                    <button
                      type="button"
                      className="btn-brand-fill px-4 py-2 rounded-full text-sm cursor-pointer disabled:cursor-not-allowed disabled:text-quaternary"
                      onClick={() => fetchOnboarding(websiteUrl)}
                      disabled={!websiteUrl || fetchingBusinessData}
                    >
                      {fetchingBusinessData
                        ? 'Fetching...'
                        : 'Fetch Business DNA'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label
                      htmlFor="template-dna-catalog-upload"
                      className={cn(
                        'group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-default bg-element px-6 py-8 text-center transition-expo',
                        'hover:border-strong hover:bg-element'
                      )}
                    >
                      {catalogFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-10 w-10 text-preview" />
                          <p className="text-sm font-medium text-default">
                            {catalogFile.name}
                          </p>
                          <p className="text-xs text-secondary">
                            {(catalogFile.size / (1024 * 1024)).toFixed(1)} MB ·
                            Click to replace
                          </p>
                        </div>
                      ) : (
                        <>
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary text-white transition-expo-transform">
                            <Upload className="h-5 w-5" />
                          </span>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-default">
                              Upload your catalog or brochure PDF
                            </p>
                            <p className="text-xs text-secondary">
                              PDF only · up to 50 MB
                            </p>
                          </div>
                        </>
                      )}
                      <input
                        id="template-dna-catalog-upload"
                        type="file"
                        accept="application/pdf"
                        onChange={handleCatalogFileChange}
                        className="sr-only"
                      />
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      {catalogFile ? (
                        <button
                          type="button"
                          onClick={() => setCatalogFile(null)}
                          className="text-sm text-secondary hover:text-default"
                        >
                          Remove file
                        </button>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        className="btn-brand-fill px-4 py-2 rounded-full text-sm cursor-pointer disabled:cursor-not-allowed disabled:text-quaternary"
                        onClick={() => void fetchFromCatalog()}
                        disabled={!catalogFile || fetchingBusinessData}
                      >
                        {fetchingBusinessData
                          ? 'Reading catalog…'
                          : 'Extract from PDF'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex"></div>
                <FieldSeparator className="px-0">
                  <p className="bg-transparent">OR</p>
                </FieldSeparator>
                <h3 className="text-center">Fill the details manually</h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label
                        htmlFor="businessName"
                        className="mb-1.5 block text-sm font-semibold text-default"
                      >
                        Business Name
                      </label>
                      <input
                        id="businessName"
                        name="businessName"
                        type="text"
                        value={formData.businessName}
                        onChange={handleChange}
                        className={inputBase}
                        placeholder="Acme Corp"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="businessEmail"
                        className="mb-1.5 block text-sm font-semibold text-default"
                      >
                        BusinessEmail Address
                      </label>
                      <input
                        id="businessEmail"
                        name="businessEmail"
                        type="email"
                        value={formData.businessEmail}
                        onChange={handleChange}
                        className={inputBase}
                        placeholder="acmecorp@gmail.com"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="businesscontact"
                        className="mb-1.5 block text-sm font-semibold text-default"
                      >
                        Business Contact
                      </label>
                      <CountryCodePhoneField
                        id="businesscontact"
                        countryCode={phoneCountryCode}
                        nationalNumber={phoneNationalNumber}
                        onChange={updatePhone}
                        selectClassName={inputBase}
                        customInputClassName={inputBase}
                        numberInputClassName={inputBase}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="industry"
                        className="mb-1.5 block text-sm font-semibold text-default"
                      >
                        Industry
                      </label>
                      <input
                        id="industry"
                        name="industry"
                        type="text"
                        value={formData.industry}
                        onChange={handleChange}
                        className={inputBase}
                        placeholder="e.g. Technology, Retail"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="website"
                        className="mb-1.5 block text-sm font-semibold text-default"
                      >
                        Website URL
                      </label>
                      <input
                        id="website"
                        name="website"
                        type="text"
                        value={formData.website}
                        onChange={handleChange}
                        onBlur={handleWebsiteFieldBlur}
                        className={inputBase}
                        placeholder="example.com or https://example.com"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="location"
                        className="mb-1.5 block text-sm font-semibold text-default"
                      >
                        Location
                      </label>
                      <input
                        id="location"
                        name="location"
                        type="text"
                        value={formData.location}
                        onChange={handleChange}
                        className={inputBase}
                        placeholder="City, Country"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="hashtags"
                        className="mb-1.5 block text-sm font-semibold text-default"
                      >
                        Default Hashtags
                      </label>
                      <input
                        id="hashtags"
                        name="hashtags"
                        type="text"
                        value={formData.hashtags}
                        onChange={handleChange}
                        className={inputBase}
                        placeholder="#growth #startup"
                      />
                    </div>
                    {showRecommendedHashtags ? (
                      <div className="sm:col-span-2 rounded-xl border border-white/15 bg-default p-4">
                        <p className="mb-1 text-sm font-semibold text-white">
                          Suggested hashtags
                        </p>
                        <p className="mb-3 text-xs text-white/65">
                          Tap chips to add or remove hashtags in the field
                          above. After you save with at least one hashtag, these
                          suggestions stay hidden.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {formData.recommendedHashtags.map((tag) => {
                            const key = normalizeHashtagKey(tag);
                            const on = selectedHashtagKeys.has(key);
                            return (
                              <button
                                type="button"
                                key={tag}
                                onClick={() => toggleRecommendedHashtag(tag)}
                                className={cn(
                                  'rounded-full border px-3 py-1 text-sm transition-expo',
                                  on
                                    ? 'border-primary-purple bg-primary-purple text-white'
                                    : 'border-white/20 bg-default text-white hover:border-preview'
                                )}
                              >
                                #{tag.replace(/^#+/, '')}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="brandSlogan"
                        className="mb-1.5 block text-sm font-semibold text-default"
                      >
                        Brand slogan
                      </label>
                      {showRecommendedSlogans ? (
                        <div className="mb-3 rounded-xl border border-white/15 bg-default p-4">
                          <p className="mb-1 text-sm font-semibold text-white">
                            Suggested slogans
                          </p>
                          <p className="mb-3 text-xs text-white/65">
                            Pick one line — choosing another replaces it. After
                            you save with a slogan, these suggestions stay
                            hidden. You can still edit or type your own below.
                          </p>
                          <div className="flex flex-col gap-2">
                            {formData.recommendedSlogans.map((line) => {
                              const picked =
                                String(formData.brandSlogan ?? '').trim() ===
                                line.trim();
                              return (
                                <button
                                  type="button"
                                  key={line}
                                  onClick={() =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      brandSlogan: line,
                                    }))
                                  }
                                  className={cn(
                                    'rounded-full border px-3 py-2 text-left text-sm transition-expo',
                                    picked
                                      ? 'border-primary-purple bg-primary-purple/30 text-white'
                                      : 'border-white/20 bg-default text-white/90 hover:border-preview'
                                  )}
                                >
                                  {line}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                      <input
                        id="brandSlogan"
                        name="brandSlogan"
                        type="text"
                        value={formData.brandSlogan}
                        onChange={handleChange}
                        className={inputBase}
                        placeholder="Short tagline or motto"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label
                      htmlFor="brandDescription"
                      className="mb-1.5 block text-sm font-semibold text-default"
                    >
                      Brand Description & Voice
                    </label>
                    <textarea
                      id="brandDescription"
                      name="brandDescription"
                      rows={4}
                      value={formData.brandDescription}
                      onChange={handleChange}
                      className={cn(inputBase, 'resize-y min-h-[100px]')}
                      placeholder="Describe your brand's mission, tone of voice, and target audience..."
                    />
                  </div>

                  <div className="pt-2">
                    <p className="mb-1.5 block text-sm font-semibold text-default">
                      Page look & visual style
                    </p>
                    <p className="mb-3 text-xs text-secondary">
                      Choose how your social page should feel — used for Content
                      Studio, carousels, Occasion Posts, and AI Manager
                      generations.
                    </p>
                    <PageLookSelector
                      value={formData.imageStyle}
                      onChange={(next) =>
                        setFormData((prev) => ({ ...prev, imageStyle: next }))
                      }
                      idPrefix="template-dna-page-look" // businessName={formData.businessName}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-default">
                        Brand Colors
                      </label>
                      <div className="flex gap-3">
                        {[
                          {
                            id: 'primaryColor',
                            name: 'primaryColor',
                            val: formData.primaryColor,
                            tooltip: 'Primary',
                          },
                          {
                            id: 'secondaryColor',
                            name: 'secondaryColor',
                            val: formData.secondaryColor,
                            tooltip: 'Secondary',
                          },
                          {
                            id: 'accentColor',
                            name: 'accentColor',
                            val: formData.accentColor,
                            tooltip: 'Accent',
                          },
                        ].map((colorField, idx) => (
                          <div
                            key={colorField.id}
                            className="relative group flex-1"
                          >
                            <div className="absolute inset-0 rounded-xl border border-default overflow-hidden bg-default">
                              <input
                                id={colorField.id}
                                name={colorField.name}
                                type="color"
                                value={colorField.val}
                                onChange={handleChange}
                                className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] cursor-pointer"
                              />
                            </div>
                            <div className="relative h-11 w-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-xl pointer-events-none text-white text-[10px] font-bold uppercase tracking-wider">
                              {colorField.tooltip}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-default space-y-4">
                    <label className="mb-1.5 block text-sm font-semibold text-default">
                      Logo
                    </label>
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                      <div className="shrink-0 w-28 h-28 rounded-xl border-2 border-dashed border-default bg-element flex items-center justify-center overflow-hidden">
                        {formData.logo ? (
                          <img
                            src={formData.logo}
                            alt="Logo"
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <div className="text-secondary flex flex-col items-center gap-1">
                            <ImagePlus className="w-8 h-8" />
                            <span className="text-[10px] font-medium">
                              No logo
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-3 min-w-0">
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center justify-center gap-2 rounded-lg border border-default bg-default px-4 py-2 text-sm font-medium text-default hover:bg-hover cursor-pointer transition-expo">
                            <ImagePlus className="w-4 h-4" />
                            Upload image
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={handleLogoFile}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={handleGenerateVariants}
                            disabled={!formData.logo}
                            className="inline-flex items-center justify-center rounded-full border border-primary-purple/25 bg-primary-purple/10 px-4 py-2 text-sm font-semibold text-preview transition-expo hover:bg-element disabled:cursor-not-allowed disabled:text-quaternary"
                          >
                            Variants
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push('/brand-dna/ai-logo')}
                            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-success bg-success px-4 py-2 text-sm font-semibold text-success transition-expo hover:bg-success"
                          >
                            <WandSparkles className="h-4 w-4" />
                            AI Generated Logo
                          </button>
                        </div>
                        <div className="flex flex-col gap-2 rounded-xl border border-default bg-element px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-sm font-semibold text-default">
                              Use logo variants in AI-generated images
                            </p>
                            <p className="text-xs text-secondary leading-relaxed">
                              Off by default. Turning on generates logo variants
                              on the server and uses them in AI images. Turning
                              off uses only your main logo; saved variants are
                              kept.
                            </p>
                          </div>
                          <Switch
                            checked={formData.useLogoVariantsForImages === true}
                            disabled={variantsPreferenceLoading}
                            onCheckedChange={(v) =>
                              void handleVariantsForImagesToggle(Boolean(v))
                            }
                            className="shrink-0 sm:ml-4"
                            aria-label="Use logo variants in AI-generated images"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-default">
                    <div className="rounded-2xl border border-default bg-default p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-preview bg-default">
                            {avatarUrl ? (
                              <>
                                <img
                                  src={avatarUrl}
                                  alt="Saved AI avatar"
                                  className="h-full w-full object-cover"
                                />
                                <ImagePreviewButton
                                  variant="overlay-icon"
                                  label="Preview AI avatar"
                                  ariaLabel="Preview AI avatar"
                                  className="absolute inset-0 h-full w-full rounded-full bg-black/0 opacity-0 ring-0 hover:bg-black/45 hover:opacity-100 focus-visible:bg-black/45 focus-visible:opacity-100"
                                  onClick={() =>
                                    avatarPreview.open(
                                      avatarUrl,
                                      'AI avatar preview'
                                    )
                                  }
                                />
                              </>
                            ) : (
                              <UserRound
                                className="h-7 w-7 text-tertiary"
                                aria-hidden
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-default">
                              Use my AI avatar in videos
                            </p>
                            <p className="text-xs leading-relaxed text-secondary">
                              Upload a photo and we’ll create an animated AI
                              avatar for your videos.
                            </p>
                            <button
                              type="button"
                              disabled={avatarSaving}
                              onClick={() => avatarInputRef.current?.click()}
                              className="mt-2 text-xs font-semibold text-preview hover:underline disabled:text-quaternary"
                            >
                              {avatarSaving
                                ? 'Creating AI avatar…'
                                : avatarUrl
                                  ? 'Replace avatar'
                                  : 'Create AI avatar'}
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={useVideoAvatar}
                          disabled={!avatarUrl || avatarSaving}
                          onClick={() => void handleAvatarToggle()}
                          className={cn(
                            'relative h-7 w-12 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:text-quaternary',
                            useVideoAvatar
                              ? 'bg-[var(--purple-9)]'
                              : 'bg-selected'
                          )}
                        >
                          <span
                            className={cn(
                              'absolute left-1 top-1 h-5 w-5 rounded-full bg-default transition-transform',
                              useVideoAvatar ? 'translate-x-5' : 'translate-x-0'
                            )}
                          />
                          <span className="sr-only">
                            Use avatar in generated videos
                          </span>
                        </button>
                      </div>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={avatarSaving}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void handleAvatarUpload(file);
                          event.target.value = '';
                        }}
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-default flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-full btn-brand-fill px-6 py-3 text-sm font-bold transition-expo disabled:transform-none disabled:cursor-not-allowed disabled:bg-element disabled:shadow-none min-w-[160px]"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : fetchingBusinessData ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Fetching business data...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" /> Save Profile
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>
        </div>
        <div className="space-y-6">
          <section className="glass-card rounded-3xl p-6 border border-default bg-linear-to-b from-card to-muted/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-1 bg-linear-to-r from-[var(--purple-9)] via-[var(--purple-9)] to-[var(--purple-9)]"></div>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-preview rounded-lg bg-[var(--purple-9)]">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-subsection text-default">Business Data</h2>
            </div>

            <p className="text-sm text-secondary leading-relaxed mb-6">
              Manage your business data with questionnaire answers and brand
              reference images for auto generated content.
            </p>

            <nav className="flex flex-col gap-3">
              <Link
                href="/brand-dna/business-data"
                className="group relative overflow-hidden rounded-xl border border-default bg-default p-4 transition-expo"
              >
                <div className="flex items-center justify-between relative z-10">
                  <span className="font-semibold text-default transition-expo group-hover:text-default">
                    Business Data
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-tr from-[var(--purple-9)] to-[var(--purple-9)] text-white transition-transform">
                    <Brain className="w-4 h-4" />
                  </div>
                </div>
                <div className="absolute inset-0 bg-primary-purple/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </nav>
          </section>
        </div>
      </div>
      <ImagePreviewOverlay
        src={avatarPreview.previewUrl}
        alt={avatarPreview.previewAlt}
        onClose={avatarPreview.close}
      />
    </div>
  );
}
