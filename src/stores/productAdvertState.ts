import { create } from 'zustand';
import type { ProductGenerationMode } from '@/src/service/api/product-advert.service';
import '@/src/stores/clearLegacyPersistedState';

const PLATFORM_ORDER = ['instagram', 'facebook', 'linkedin'] as const;
export type SocialPlatform = (typeof PLATFORM_ORDER)[number];
/** @deprecated Use SocialPlatform[] instead */
export type AdvertPlatform = SocialPlatform | 'all_platforms';

export type AdvertCopy = {
  headline?: string;
  primary_text?: string;
  cta?: string;
  hashtags?: string[];
};

export type AdvertResult = {
  platform: string;
  chosenContentType?: string;
  contentFormatLabel?: string;
  analysis?: Record<string, unknown> | null;
  copy?: AdvertCopy | null;
  imageUrl: string;
  imageFilePath?: string;
  logoPosition?: string;
  selectedLogoVariantIndex?: number;
  logoVariantSource?: string;
  logoVariantCount?: number;
  marketingTagline?: string;
  productAdvertDocId?: string | null;
};

export type AdvertFinalResult = {
  generationMode: ProductGenerationMode;
  platformResults: AdvertResult[];
};

type ProductAdvertState = {
  generationMode: ProductGenerationMode;
  setGenerationMode: (mode: ProductGenerationMode) => void;

  campaignContext: string;
  setCampaignContext: (campaignContext: string) => void;

  useIndustryResearch: boolean;
  setUseIndustryResearch: (value: boolean) => void;

  prompt: string;
  setPrompt: (prompt: string) => void;

  genPlatforms: SocialPlatform[];
  setGenPlatforms: (genPlatforms: SocialPlatform[]) => void;
  toggleGenPlatform: (platform: SocialPlatform) => void;

  background: string;
  setBackground: (background: string) => void;

  customBackground: string;
  setCustomBackground: (customBackground: string) => void;

  finalResult: AdvertFinalResult | null;
  setFinalResult: (result: AdvertFinalResult | null) => void;

  loading: boolean;
  setLoading: (loading: boolean) => void;

  lastGenerationMode: ProductGenerationMode;
  setLastGenerationMode: (mode: ProductGenerationMode) => void;

  generatedAt: number | null;

  clearOutput: () => void;
};

export const useProductAdvertState = create<ProductAdvertState>()((set) => ({
  generationMode: 'advert_asset',
  setGenerationMode: (generationMode) => set({ generationMode }),

  campaignContext: '',
  setCampaignContext: (campaignContext) => set({ campaignContext }),

  useIndustryResearch: true,
  setUseIndustryResearch: (useIndustryResearch) =>
    set({ useIndustryResearch }),

  prompt: '',
  setPrompt: (prompt) => set({ prompt }),

  genPlatforms: [],
  setGenPlatforms: (genPlatforms) => set({ genPlatforms }),
  toggleGenPlatform: (platform) =>
    set((state) => ({
      genPlatforms: state.genPlatforms.includes(platform)
        ? state.genPlatforms.filter((item) => item !== platform)
        : [...state.genPlatforms, platform],
    })),

  background: '',
  setBackground: (background) => set({ background }),

  customBackground: '',
  setCustomBackground: (customBackground) => set({ customBackground }),

  finalResult: null,
  setFinalResult: (finalResult) =>
    set({
      finalResult,
      ...(finalResult ? { generatedAt: Date.now() } : {}),
    }),

  loading: false,
  setLoading: (loading) => set({ loading }),

  lastGenerationMode: 'advert_asset',
  setLastGenerationMode: (lastGenerationMode) => set({ lastGenerationMode }),

  generatedAt: null,

  clearOutput: () =>
    set({ finalResult: null, loading: false, generatedAt: null }),
}));
