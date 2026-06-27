import { create } from 'zustand';

export type TourId = 'onboarding' | 'brand-memory' | 'platform';

/** Snapshot used to resume a multi-page tour after `router.push()`. */
export type ActiveTourSnapshot = {
  tour: TourId;
  stepIndex: number;
  endIndex?: number;
};

export type TourRequest = {
  tour: TourId;
  startIndex: number;
  endIndex?: number;
};

type TourStore = {
  /**
   * When true, the gated pages (instant-generation, batch-generation,
   * product-advert, festive-post) bypass their paywall early-return and
   * pretend all three platforms are connected, with click handlers no-op'd.
   * Toggled around the `platform` tour so brand-new users without any
   * connected accounts or a paid plan still see the real UI.
   */
  isDemoActive: boolean;
  setDemoActive: (v: boolean) => void;

  /**
   * Currently-running tour and the global step index. Set whenever the
   * runner needs to navigate to a different route mid-tour so the next
   * page's launcher can resume from the right step.
   */
  activeTour: ActiveTourSnapshot | null;
  setActiveTour: (snap: ActiveTourSnapshot | null) => void;

  /**
   * External request to start a specific tour (used by the
   * "Take the tour" link in the sidebar). `TourLauncher` watches this
   * and clears it after kicking off the tour.
   */
  requestedTour: TourRequest | null;
  requestTour: (tour: TourRequest | null) => void;

  /**
   * Per-tour "already finished this session" flag. In-memory only — wiped
   * on hard refresh by design, so users who refresh the page won't be
   * harassed by the tour again (they just won't see auto-fire conditions
   * re-trigger; they can still kick a replay from the sidebar).
   */
  doneTours: Record<TourId, boolean>;
  markDone: (tour: TourId) => void;

  /** User finished onboarding — suppress the onboarding tour if they return. */
  markOnboardingComplete: () => void;

  /**
   * User exited the setup funnel to /home (skip or finish). Marks prior
   * page tours done and queues the platform walkthrough.
   */
  queuePlatformTour: () => void;
};

export const useTourState = create<TourStore>((set) => ({
  isDemoActive: false,
  setDemoActive: (v) => set({ isDemoActive: v }),
  activeTour: null,
  setActiveTour: (snap) => set({ activeTour: snap }),
  requestedTour: null,
  requestTour: (tour) => set({ requestedTour: tour }),
  doneTours: { onboarding: false, 'brand-memory': false, platform: false },
  markDone: (tour) =>
    set((s) => ({ doneTours: { ...s.doneTours, [tour]: true } })),
  markOnboardingComplete: () =>
    set((s) => ({
      doneTours: { ...s.doneTours, onboarding: true },
    })),
  queuePlatformTour: () =>
    set((s) => ({
      doneTours: {
        ...s.doneTours,
        onboarding: true,
        'brand-memory': true,
      },
    })),
}));

/** Convenience hook for gated pages — returns just the demo flag. */
export const useTourDemo = (): boolean =>
  useTourState((s) => s.isDemoActive);
