import { create } from 'zustand';
import '@/src/stores/clearLegacyPersistedState';

const PLATFORM_ORDER = ['instagram', 'facebook', 'linkedin'] as const;
export type SocialPlatform = (typeof PLATFORM_ORDER)[number];
/** @deprecated Use SocialPlatform[] instead */
export type FestivePlatform = SocialPlatform | 'all_platforms';

export type FestiveEventItem = {
  id: string;
  name: string;
  date: string;
  description: string;
  reason: string;
};

type FestivePostState = {
  selected: string[];
  toggleSelected: (eventId: string) => void;
  clearSelected: () => void;

  customEvents: FestiveEventItem[];
  addCustomEvent: (event: FestiveEventItem) => void;
  updateCustomEvent: (id: string, patch: Partial<FestiveEventItem>) => void;
  removeCustomEvent: (id: string) => void;

  search: string;
  setSearch: (search: string) => void;

  genPlatforms: SocialPlatform[];
  setGenPlatforms: (genPlatforms: SocialPlatform[]) => void;
  toggleGenPlatform: (platform: SocialPlatform) => void;

  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
};

export const useFestivePostState = create<FestivePostState>()((set) => ({
  selected: [],
  toggleSelected: (eventId) =>
    set((s) => ({
      selected: s.selected.includes(eventId)
        ? s.selected.filter((id) => id !== eventId)
        : [...s.selected, eventId],
    })),
  clearSelected: () => set({ selected: [] }),

  customEvents: [],
  addCustomEvent: (event) =>
    set((s) => ({ customEvents: [...s.customEvents, event] })),
  updateCustomEvent: (id, patch) =>
    set((s) => ({
      customEvents: s.customEvents.map((e) =>
        e.id === id ? { ...e, ...patch } : e
      ),
    })),
  removeCustomEvent: (id) =>
    set((s) => ({
      customEvents: s.customEvents.filter((e) => e.id !== id),
      selected: s.selected.filter((sid) => sid !== id),
    })),

  search: '',
  setSearch: (search) => set({ search }),

  genPlatforms: [],
  setGenPlatforms: (genPlatforms) => set({ genPlatforms }),
  toggleGenPlatform: (platform) =>
    set((state) => ({
      genPlatforms: state.genPlatforms.includes(platform)
        ? state.genPlatforms.filter((item) => item !== platform)
        : [...state.genPlatforms, platform],
    })),

  isSubmitting: false,
  setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
}));
