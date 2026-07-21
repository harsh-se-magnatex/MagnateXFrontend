'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
import {
  getProfile,
  setLogoVariantsForImagesPreference,
  updateProfile,
  uploadLogo,
} from '@/src/service/api/userService';
import { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FieldSeparator } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { scrapeUrl } from '@/src/service/api/scrape';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/show-error-toast';
import { normalizeWebsiteUrl } from '@/utils/normalizeWebsiteUrl';

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
  'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm';

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function splitStoredPhone(stored: unknown): {
  countryCode: string;
  nationalNumber: string;
} {
  const digits = digitsOnly(String(stored ?? '').replace(/^\+/, ''));
  if (!digits) return { countryCode: '', nationalNumber: '' };

  if (digits.startsWith('1') && digits.length >= 11) {
    return { countryCode: '1', nationalNumber: digits.slice(1) };
  }
  if (digits.startsWith('91') && digits.length >= 12) {
    return { countryCode: '91', nationalNumber: digits.slice(2) };
  }
  if (digits.startsWith('44') && digits.length >= 12) {
    return { countryCode: '44', nationalNumber: digits.slice(2) };
  }
  if (digits.length <= 10) {
    return { countryCode: '', nationalNumber: digits };
  }
  return { countryCode: digits.slice(0, 2), nationalNumber: digits.slice(2) };
}

function joinPhone(countryCode: string, nationalNumber: string): string {
  const combined = `${digitsOnly(countryCode)}${digitsOnly(nationalNumber)}`;
  return combined ? `+${combined}` : '';
}

function parseHashtagTokens(raw: unknown): string[] {
  if (raw == null || raw === '') return [];
  if (Array.isArray(raw)) {
    return raw
      .map((t) => String(t ?? '').replace(/^#+/, '').trim())
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
  /** Mirrors last-loaded / last-saved profile: hide AI blocks once user has committed values. */
  const [committedHashtagsSaved, setCommittedHashtagsSaved] = useState(false);
  const [committedSloganSaved, setCommittedSloganSaved] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState('');
  const [phoneNationalNumber, setPhoneNationalNumber] = useState('');

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

  const handleWebsiteFieldBlur = (
    e: React.FocusEvent<HTMLInputElement>
  ) => {
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
    const cc = digitsOnly(countryCode);
    const nat = digitsOnly(nationalNumber);
    setPhoneCountryCode(cc);
    setPhoneNationalNumber(nat);
    setFormData((prev) => ({
      ...prev,
      businesscontact: joinPhone(cc, nat),
    }));
  };

  const applyStoredPhone = (stored: unknown) => {
    const { countryCode, nationalNumber } = splitStoredPhone(stored);
    setPhoneCountryCode(countryCode);
    setPhoneNationalNumber(nationalNumber);
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
          const recommendedHashtags = toStringArray(p.recommendedHashtags);
          const recommendedSlogans = toStringArray(p.recommendedSlogans);
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
          applyStoredPhone(p.businesscontact);
        }
      } finally {
        setProfileLoading(false);
      }
    };
    if (user) fetchProfile();
  }, [user]);

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
      }
      if (formData.logo && typeof formData.logo === 'string') {
        const response = await uploadLogo(formData.logo);
        finalLogoForVariants = String(
          response?.data?.url || finalLogoForVariants || ''
        );
        colorTemplatesGenerationStarted =
          colorTemplatesGenerationStarted ||
          response?.data?.colorTemplatesGenerationStarted === true;
        setFormData((prev: any) => ({ ...prev, logo: finalLogoForVariants }));
      }
      await updateProfile({
        ...formData,
        logo: finalLogoForVariants,
        website:
          typeof formData.website === 'string' && formData.website.trim()
            ? normalizeWebsiteUrl(formData.website)
            : formData.website,
      });
      setCommittedHashtagsSaved(
        parseHashtagTokens(formData.hashtags).length > 0
      );
      setCommittedSloganSaved(
        !!String(formData.brandSlogan ?? '').trim()
      );
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
      if (colorTemplatesGenerationStarted) {
        toast.message('Analyzing logo colors for image generation…');
      }
    } catch (error: any) {
      showErrorToast('Failed to update profile');
    } finally {
      setSaving(false);
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
      const flat: Record<string, unknown> = { ...dnaFields };
      setFormData((prev) => ({
        ...prev,
        ...flat,
        recommendedHashtags: prev.recommendedHashtags,
        recommendedSlogans: prev.recommendedSlogans,
      }));
      if (flat.businesscontact != null) {
        applyStoredPhone(flat.businesscontact);
      }
    } catch (error: unknown) {
      showErrorToast('Failed to extract business data');
    } finally {
      setFetchingBusinessData(false);
    }
  };

  const handleGenerateVariants = () => {
    if (!formData.logo) return;
    try {
      sessionStorage.setItem('template_dna_logo_for_variants', formData.logo);
      sessionStorage.setItem('template_dna_force_fresh_variants', '1');
    } catch {}
    router.push('/template-dna/variants');
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
          sessionStorage.setItem('template_dna_logo_for_variants', formData.logo);
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
      showErrorToast('Could not update variant preference');
    } finally {
      setVariantsPreferenceLoading(false);
    }
  };


  if (loading) return <PageLoadingState />;
  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-500">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          Brand Identity & DNA
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100/50">
            <Fingerprint className="w-4 h-4 text-indigo-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              Core Setup
            </span>
          </div>
        </h1>
        <p className="mt-2 text-base text-slate-500 max-w-2xl">
          Manage your business details here.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          {/* Business Profile */}
          <section className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -z-10 translate-x-1/2 -translate-y-1/2"></div>

            <div className="flex items-center gap-3 mb-8 border-b border-slate-100 ">
              <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Business Profile
                </h2>
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
                  Enter your website URL to fetch business DNA
                </h3>
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
                    className="bg-gradient-primary text-white px-4 py-2 rounded-xl text-sm cursor-pointer"
                    onClick={() => fetchOnboarding(websiteUrl)}
                    disabled={!websiteUrl || fetchingBusinessData}
                  >
                    {fetchingBusinessData
                      ? 'Fetching...'
                      : 'Fetch Business DNA'}
                  </button>
                </div>
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
                        className="mb-1.5 block text-sm font-semibold text-slate-700"
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
                        className="mb-1.5 block text-sm font-semibold text-slate-700"
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
                        className="mb-1.5 block text-sm font-semibold text-slate-700"
                      >
                        Business Contact
                      </label>
                      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                        <div className="relative w-full shrink-0 sm:w-[6.5rem]">
                          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-slate-500">
                            +
                          </span>
                          <input
                            id="businesscontact-country"
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel-country-code"
                            maxLength={4}
                            value={phoneCountryCode}
                            onChange={(e) =>
                              updatePhone(e.target.value, phoneNationalNumber)
                            }
                            placeholder="91"
                            aria-label="Country code"
                            className={cn(inputBase, 'pl-7')}
                          />
                        </div>
                        <div className="relative min-w-0 flex-1">
                          <Smartphone className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-400" />
                          <input
                            id="businesscontact"
                            name="businesscontact"
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel-national"
                            maxLength={12}
                            value={phoneNationalNumber}
                            onChange={(e) =>
                              updatePhone(phoneCountryCode, e.target.value)
                            }
                            placeholder="98765 43210"
                            className={cn(inputBase, 'pl-10')}
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="industry"
                        className="mb-1.5 block text-sm font-semibold text-slate-700"
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
                        className="mb-1.5 block text-sm font-semibold text-slate-700"
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
                        className="mb-1.5 block text-sm font-semibold text-slate-700"
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
                        className="mb-1.5 block text-sm font-semibold text-slate-700"
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
                      <div className="sm:col-span-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                        <p className="text-sm font-semibold text-indigo-950 mb-1">
                          Suggested hashtags
                        </p>
                        <p className="text-xs text-slate-600 mb-3">
                          Tap chips to add or remove hashtags in the field above.
                          After you save with at least one hashtag, these
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
                                  'rounded-full px-3 py-1 text-sm border transition-all',
                                  on
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'bg-white border-slate-200 text-slate-800 hover:border-indigo-400'
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
                        className="mb-1.5 block text-sm font-semibold text-slate-700"
                      >
                        Brand slogan
                      </label>
                      {showRecommendedSlogans ? (
                        <div className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                          <p className="text-sm font-semibold text-indigo-950 mb-1">
                            Suggested slogans
                          </p>
                          <p className="text-xs text-slate-600 mb-3">
                            Pick one line — choosing another replaces it. After
                            you save with a slogan, these suggestions stay hidden.
                            You can still edit or type your own below.
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
                                    'text-left rounded-lg px-3 py-2 text-sm border transition-all',
                                    picked
                                      ? 'bg-indigo-600/15 border-indigo-500 text-indigo-950'
                                      : 'bg-white border-slate-200 text-slate-800 hover:border-indigo-400'
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
                      className="mb-1.5 block text-sm font-semibold text-slate-700"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
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
                            <div className="absolute inset-0 rounded-xl shadow-sm border border-slate-200 overflow-hidden bg-white">
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

                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Logo
                    </label>
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                      <div className="shrink-0 w-28 h-28 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center overflow-hidden">
                        {formData.logo ? (
                          <img
                            src={formData.logo}
                            alt="Logo"
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <div className="text-slate-400 flex flex-col items-center gap-1">
                            <ImagePlus className="w-8 h-8" />
                            <span className="text-[10px] font-medium">
                              No logo
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-3 min-w-0">
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
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
                              className="inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Variants
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                router.push('/template-dna/ai-logo')
                              }
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                            >
                              <WandSparkles className="h-4 w-4" />
                              AI Generated Logo
                            </button>
                        </div>
                          <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 space-y-0.5">
                              <p className="text-sm font-semibold text-slate-800">
                                Use logo variants in AI-generated images
                              </p>
                              <p className="text-xs text-slate-500 leading-relaxed">
                                Off by default. Turning on generates logo
                                variants on the server and uses them in AI
                                images. Turning off uses only your main logo;
                                saved variants are kept.
                              </p>
                            </div>
                            <Switch
                              checked={
                                formData.useLogoVariantsForImages === true
                              }
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

                  <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700 hover:-translate-y-0.5 active:scale-[0.98] disabled:transform-none disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none min-w-[160px]"
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
          <section className="glass-card rounded-3xl p-6 border border-slate-200 shadow-sm bg-linear-to-b from-white to-slate-50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-1 bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-purple-50 rounded-lg bg-purple-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Business Data
              </h2>
            </div>

            <p className="text-sm text-slate-500 leading-relaxed mb-6">
                Manage your business data with questionnaire answers and brand reference images for auto generated content.
            </p>

            <nav className="flex flex-col gap-3">
              <Link
                href="/template-dna/business-data"
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-violet-500/15"
              >
                <div className="flex items-center justify-between relative z-10">
                  <span className="font-semibold text-slate-800 transition-colors group-hover:text-slate-900">
                    Business Data
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-tr from-violet-600 to-indigo-500 text-white shadow-sm transition-transform group-hover:scale-110">
                    <Brain className="w-4 h-4" />
                  </div>
                </div>
                <div className="absolute inset-0 bg-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </nav>
          </section>
        </div>
      </div>
    </div>
  );
}
