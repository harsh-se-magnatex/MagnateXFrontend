import { create } from 'zustand';
import type { StudioRenderedImage } from '@/src/service/api/aiContentStudio';
import '@/src/stores/clearLegacyPersistedState';

const PLATFORM_ORDER = ['instagram', 'facebook', 'linkedin'] as const;
export type SocialPlatform = (typeof PLATFORM_ORDER)[number];
/** @deprecated Use SocialPlatform[] instead */
export type GenPlatform = SocialPlatform | 'all_platforms';

export type CreatedContent = {
  id: string;
  promptSummary: string;
  inferredImageContext?: string | null;
  renderedImages: StudioRenderedImage[];
  createdAt: string;
};

export type ScheduledItem = {
  id: string;
  contentId: string;
  scheduledPostId?: string;
  summary: string;
  scheduledAt: string;
  platform: string;
};

export type PlatformSchedule = Partial<
  Record<SocialPlatform, { date: string; time: string }>
>;

const MAX_HISTORY = 20;
const MAX_SCHEDULED = 50;

type InstantGeneratedState = {
  prompt: string;
  setPrompt: (prompt: string) => void;

  genPlatforms: SocialPlatform[];
  setGenPlatforms: (genPlatforms: SocialPlatform[]) => void;
  toggleGenPlatform: (platform: SocialPlatform) => void;

  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;

  createdContent: CreatedContent | null;
  setCreatedContent: (createdContent: CreatedContent | null) => void;

  selectedRenderedImage: StudioRenderedImage | null;
  setSelectedRenderedImage: (
    selectedRenderedImage: StudioRenderedImage | null
  ) => void;
  updateRenderedImageCaption: (platform: string, caption: string) => void;

  history: CreatedContent[];
  pushHistory: (item: CreatedContent) => void;

  scheduleDate: string;
  setScheduleDate: (scheduleDate: string) => void;
  scheduleTime: string;
  setScheduleTime: (scheduleTime: string) => void;
  platformSchedule: PlatformSchedule;
  setPlatformScheduleValue: (
    platform: SocialPlatform,
    patch: Partial<{ date: string; time: string }>
  ) => void;
  clearPlatformScheduleSlot: (platform: SocialPlatform) => void;
  schedulePlatform: string;
  setSchedulePlatform: (schedulePlatform: string) => void;
  cropForPlatform: boolean;
  setCropForPlatform: (cropForPlatform: boolean) => void;

  scheduled: ScheduledItem[];
  pushScheduled: (item: ScheduledItem) => void;

  generatedAt: number | null;

  resetScheduleInputs: () => void;
  clearCreatedContent: () => void;
  clearOutput: () => void;
  removeRenderedPlatform: (platform: string) => void;
};

export const useInstantGeneratedState = create<InstantGeneratedState>()(
  (set) => ({
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

    isGenerating: false,
    setIsGenerating: (isGenerating) => set({ isGenerating }),

    createdContent: null,
    setCreatedContent: (createdContent) =>
      set({
        createdContent,
        ...(createdContent?.id ? { generatedAt: Date.now() } : {}),
      }),

    selectedRenderedImage: null,
    setSelectedRenderedImage: (selectedRenderedImage) =>
      set({ selectedRenderedImage }),
    updateRenderedImageCaption: (platform, caption) =>
      set((state) => {
        if (!state.createdContent) return state;
        const renderedImages = state.createdContent.renderedImages.map((image) =>
          image.platform === platform ? { ...image, caption } : image
        );
        const selectedRenderedImage =
          state.selectedRenderedImage?.platform === platform
            ? { ...state.selectedRenderedImage, caption }
            : state.selectedRenderedImage;
        return {
          createdContent: { ...state.createdContent, renderedImages },
          selectedRenderedImage,
        };
      }),

    history: [],
    pushHistory: (item) =>
      set((state) => ({
        history: [item, ...state.history].slice(0, MAX_HISTORY),
      })),

    scheduleDate: '',
    setScheduleDate: (scheduleDate) => set({ scheduleDate }),
    scheduleTime: '',
    setScheduleTime: (scheduleTime) => set({ scheduleTime }),
    platformSchedule: {},
    setPlatformScheduleValue: (platform, patch) =>
      set((state) => ({
        platformSchedule: {
          ...state.platformSchedule,
          [platform]: {
            date: state.platformSchedule[platform]?.date ?? '',
            time: state.platformSchedule[platform]?.time ?? '',
            ...patch,
          },
        },
      })),
    clearPlatformScheduleSlot: (platform) =>
      set((state) => {
        const next = { ...state.platformSchedule };
        delete next[platform];
        return { platformSchedule: next };
      }),
    schedulePlatform: '',
    setSchedulePlatform: (schedulePlatform) => set({ schedulePlatform }),
    cropForPlatform: true,
    setCropForPlatform: (cropForPlatform) => set({ cropForPlatform }),

    scheduled: [],
    pushScheduled: (item) =>
      set((state) => ({
        scheduled: [item, ...state.scheduled].slice(0, MAX_SCHEDULED),
      })),

    generatedAt: null,

    resetScheduleInputs: () =>
      set({
        scheduleDate: '',
        scheduleTime: '',
        platformSchedule: {},
        schedulePlatform: '',
        selectedRenderedImage: null,
      }),

    clearCreatedContent: () =>
      set({
        createdContent: null,
        isGenerating: false,
        selectedRenderedImage: null,
        genPlatforms: [],
        generatedAt: null,
      }),

    // Wipes all session state tied to the current generate -> schedule
     // cycle: the generated content + prompt, the platforms picked for
     // generation, and the schedule inputs (date, time, per-platform
     // schedule slots, selected schedule platform). Without this, the
     // previous run's prompt, generation platforms, and date/time would
     // carry over into the next attempt until a hard refresh.
    clearOutput: () =>
      set({
        createdContent: null,
        selectedRenderedImage: null,
        isGenerating: false,
        generatedAt: null,
        prompt: '',
        genPlatforms: [],
        scheduleDate: '',
        scheduleTime: '',
        platformSchedule: {},
        schedulePlatform: '',
      }),

    removeRenderedPlatform: (platform) =>
      set((state) => {
        const content = state.createdContent;
        if (!content) return state;
        const remaining = content.renderedImages.filter(
          (image) => image.platform !== platform
        );
        if (remaining.length === 0) {
          return {
            createdContent: null,
            selectedRenderedImage: null,
            generatedAt: null,
          };
        }
        const nextSelected =
          state.selectedRenderedImage?.platform === platform
            ? remaining[0] ?? null
            : state.selectedRenderedImage;
        return {
          createdContent: { ...content, renderedImages: remaining },
          selectedRenderedImage: nextSelected,
          schedulePlatform:
            remaining.length === 1 ? remaining[0].platform : state.schedulePlatform,
        };
      }),
  })
);
