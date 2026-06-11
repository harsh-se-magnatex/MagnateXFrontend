import { create } from 'zustand';
import type { InstantGenerationPlatform } from '@/src/service/api/instant-generation.service';
import '@/src/stores/clearLegacyPersistedState';

/**
 * Per-date outcome for a batch run, reconstructed on the client from per-job
 * Firestore docs (`jobs/{jobId}.result.date`, `jobs/{jobId}.status`).
 */
export type BatchDayResult = {
  date: string;
  success: boolean;
  error?: string;
};

type PlatformRecord<T> = Partial<Record<InstantGenerationPlatform, T>>;

type BatchGenerationState = {
  selectedByPlatform: Record<InstantGenerationPlatform, string[]>;
  setSelectedDates: (
    platform: InstantGenerationPlatform,
    dates: string[]
  ) => void;
  toggleDate: (
    platform: InstantGenerationPlatform,
    dateKey: string,
    isBlocked: boolean
  ) => void;

  batchResultsByPlatform: PlatformRecord<BatchDayResult[]>;
  setResults: (
    platform: InstantGenerationPlatform,
    results: BatchDayResult[]
  ) => void;

  activePreviewDateByPlatform: PlatformRecord<string | null>;
  setActivePreviewDate: (
    platform: InstantGenerationPlatform,
    date: string | null
  ) => void;

  generatingByPlatform: PlatformRecord<boolean>;
  setGenerating: (platform: InstantGenerationPlatform, value: boolean) => void;

  generatedAt: number | null;

  clearOutput: () => void;
};

const MAX_DATES = 5;

export const useBatchGenerationState = create<BatchGenerationState>()(
  (set) => ({
    selectedByPlatform: {
      instagram: [],
      facebook: [],
      linkedin: [],
    },
    setSelectedDates: (platform, dates) =>
      set((s) => ({
        selectedByPlatform: { ...s.selectedByPlatform, [platform]: dates },
      })),
    toggleDate: (platform, dateKey, isBlocked) => {
      if (isBlocked) return;
      set((s) => {
        const current = s.selectedByPlatform[platform] ?? [];
        const next = current.includes(dateKey)
          ? current.filter((d) => d !== dateKey)
          : current.length >= MAX_DATES
            ? current
            : [...current, dateKey].sort();
        return {
          selectedByPlatform: { ...s.selectedByPlatform, [platform]: next },
        };
      });
    },

    batchResultsByPlatform: {},
    setResults: (platform, results) =>
      set((s) => ({
        batchResultsByPlatform: {
          ...s.batchResultsByPlatform,
          [platform]: results,
        },
        ...(results.length > 0 ? { generatedAt: Date.now() } : {}),
      })),

    activePreviewDateByPlatform: {
      instagram: null,
      facebook: null,
      linkedin: null,
    },
    setActivePreviewDate: (platform, date) =>
      set((s) => ({
        activePreviewDateByPlatform: {
          ...s.activePreviewDateByPlatform,
          [platform]: date,
        },
      })),

    generatingByPlatform: {},
    setGenerating: (platform, value) =>
      set((s) => ({
        generatingByPlatform: {
          ...s.generatingByPlatform,
          [platform]: value,
        },
      })),

    generatedAt: null,

    clearOutput: () =>
      set({
        batchResultsByPlatform: {},
        generatingByPlatform: {},
        generatedAt: null,
      }),
  })
);
