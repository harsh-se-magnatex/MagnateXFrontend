/**
 * driver.js orchestrator for cross-page product tours.
 *
 * Each tour is described by a flat list of `TourStep`s. Steps belonging to a
 * different `path` than the current one trigger an SPA `router.push()` and
 * persist the next step index to the tour store so the launcher can resume
 * on the new page.
 */
import 'driver.js/dist/driver.css';
import { driver, type Driver } from 'driver.js';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useTourState, type TourId } from '@/src/stores/tourState';
import { TOUR_STEPS, type TourStep } from './tour-steps';

type AppRouter = Pick<AppRouterInstance, 'push'>;

type StartTourOptions = {
  tour: TourId;
  initialIndex: number;
  endIndex?: number;
  router: AppRouter;
  /** Called after `onComplete` runs (after the last step or close). */
  onFinish?: () => void;
};

/**
 * Module-level singleton of the currently driving instance. Exposed so the
 * launcher can ask "is a tour already running?" before kicking another one
 * (e.g. React Strict Mode dev double-invokes the launcher effect).
 *
 * Route hops null this out before `router.push()` so the next page can
 * start a fresh driver for the resumed step.
 */
let currentDriver: Driver | null = null;

export function isTourActive(): boolean {
  try {
    return currentDriver?.isActive() === true;
  } catch {
    return false;
  }
}

/** Tear down the driver without marking the tour done (layout/route change). */
export function abortTour(): void {
  try {
    currentDriver?.destroy();
  } catch {
    /* ignore */
  }
  currentDriver = null;
  useTourState.getState().setActiveTour(null);
}

/** Get the path the current step expects to run on. */
function stepPath(step: TourStep | undefined): string | undefined {
  return step?.path;
}

function currentPath(): string {
  if (typeof window === 'undefined') return '';
  return window.location.pathname;
}

/** Returns true when the next step needs an SPA route hop. */
function needsRoute(next: TourStep | undefined): boolean {
  const nextPath = stepPath(next);
  if (!nextPath) return false;
  return nextPath !== currentPath();
}

/**
 * Poll for an element to appear in the DOM. Pages that gate behind a
 * loading state (e.g. `/instant-generation` shows `<PageLoadingState />`
 * while billing fetches) won't have the anchor mounted at route-hop time;
 * we wait up to ~4s for it to render before kicking driver.js. */
function waitForElement(
  selector: string,
  timeoutMs = 4000
): Promise<Element | null> {
  if (typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const immediate = document.querySelector(selector);
    if (immediate) {
      resolve(immediate);
      return;
    }
    const start = Date.now();
    const iv = window.setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        window.clearInterval(iv);
        resolve(el);
      } else if (Date.now() - start >= timeoutMs) {
        window.clearInterval(iv);
        resolve(null);
      }
    }, 80);
  });
}

/**
 * Build a driver.js config from a `TourStep` list. We use the global
 * `onNextClick` / `onPrevClick` hooks so that we can intercept Next/Back
 * and call `router.push()` when the next step lives on another route.
 */
export function startTour(opts: StartTourOptions): void {
  const { tour, initialIndex, endIndex, router, onFinish } = opts;
  const steps = TOUR_STEPS[tour];
  if (!steps || steps.length === 0) return;
  const windowStart = Math.max(0, initialIndex);
  const windowEnd = Math.min(endIndex ?? steps.length - 1, steps.length - 1);
  if (windowStart > windowEnd) return;

  // Singleton guard — avoids React Strict Mode double-firing two drivers.
  if (isTourActive()) return;

  const finish = (): void => {
    currentDriver = null;
    const store = useTourState.getState();
    store.markDone(tour);
    store.setActiveTour(null);
    if (tour === 'platform') {
      store.setDemoActive(false);
    }
    onFinish?.();
  };

  const driveSteps = steps.slice(windowStart, windowEnd + 1).map((s, idx) => {
    const isLast = idx === windowEnd - windowStart;
    const final = s.finalCta;
    return {
      element: s.element,
      popover: {
        title: s.title,
        description: buildDescriptionHtml(s),
        side: s.side,
        align: s.align,
        nextBtnText: final
          ? final.label
          : isLast
            ? 'Got it'
            : 'Next',
        prevBtnText: 'Back',
        doneBtnText: final?.label ?? 'Got it',
      },
    };
  });

  let driverObj: Driver | null = null;

  driverObj = driver({
    showProgress: true,
    showButtons: ['next', 'previous', 'close'],
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 10,
    popoverClass: 'sociogenie-tour',
    smoothScroll: true,
    disableActiveInteraction: true,
    allowClose: true,
    // Only the X button (and ESC) close the tour; ignore overlay clicks so
    // users don't accidentally dismiss it by clicking anywhere on the page.
    overlayClickBehavior: () => {
      /* no-op */
    },
    allowKeyboardControl: true,
    steps: driveSteps,
    onNextClick: (_el, _step, ctx) => {
      const localIndex = ctx.state.activeIndex ?? 0;
      const globalIndex = windowStart + localIndex;
      const here = steps[globalIndex];
      const next =
        globalIndex < windowEnd ? steps[globalIndex + 1] : undefined;

      // Final CTA — route to /pricing and finish the tour.
      if (here?.finalCta) {
        currentDriver = null;
        driverObj?.destroy();
        finish();
        router.push(here.finalCta.route);
        return;
      }

      if (!next) {
        currentDriver = null;
        driverObj?.destroy();
        finish();
        return;
      }

      if (needsRoute(next)) {
        // Persist where to resume, then hand off to Next.js routing.
        useTourState.getState().setActiveTour({
          tour,
          stepIndex: globalIndex + 1,
          endIndex: windowEnd,
        });
        currentDriver = null;
        driverObj?.destroy();
        router.push(next.path);
        return;
      }

      ctx.driver.moveNext();
    },
    onPrevClick: (_el, _step, ctx) => {
      const localIndex = ctx.state.activeIndex ?? 0;
      const globalIndex = windowStart + localIndex;
      const prev =
        globalIndex > windowStart ? steps[globalIndex - 1] : undefined;
      if (!prev) return;
      if (needsRoute(prev)) {
        useTourState.getState().setActiveTour({
          tour,
          stepIndex: globalIndex - 1,
          endIndex: windowEnd,
        });
        currentDriver = null;
        driverObj?.destroy();
        router.push(prev.path);
        return;
      }
      ctx.driver.movePrevious();
    },
    onCloseClick: () => {
      currentDriver = null;
      driverObj?.destroy();
      finish();
    },
  });

  currentDriver = driverObj;

  // Wait for the first step's anchor to land in the DOM before driving.
  // Some pages render a loading skeleton until billing/auth resolves, so a
  // raw rAF isn't enough — poll the element up to ~4s.
  const firstSelector = steps[windowStart]?.element;
  if (!firstSelector) {
    finish();
    return;
  }
  void waitForElement(firstSelector).then((el) => {
    if (currentDriver !== driverObj) return; // another tour took over
    if (!el) {
      console.warn(
        `[tour] anchor "${firstSelector}" never appeared; skipping tour`
      );
      currentDriver = null;
      finish();
      return;
    }
    try {
      driverObj?.drive(0);
    } catch (err) {
      console.warn('[tour] driver failed to start', err);
      currentDriver = null;
      finish();
    }
  });
}

/**
 * Plain-string description with an optional "Paid plan" pill appended. We
 * inject HTML because driver.js renders the description with innerHTML.
 */
function buildDescriptionHtml(step: TourStep): string {
  const text = escapeHtml(step.description);
  if (!step.paid) return text;
  return `${text}<span class="sociogenie-tour-paid-pill">Paid plan</span>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
