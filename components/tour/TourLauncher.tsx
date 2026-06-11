'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTourState, type TourId } from '@/src/stores/tourState';
import { TOUR_STEPS } from './tour-steps';
import { isTourActive, startTour } from './tour-runner';

/**
 * Mounts once in the root layout. Decides which (if any) tour to auto-fire
 * based on the current path + in-memory done flags, and resumes mid-flight
 * tours after `router.push()` navigations.
 *
 * State is intentionally in-memory only — a hard refresh wipes the done
 * flags, the active snapshot, and the demo flag.
 */
export function TourLauncher(): null {
  const pathname = usePathname();
  const router = useRouter();

  const activeTour = useTourState((s) => s.activeTour);
  const requestedTour = useTourState((s) => s.requestedTour);
  const requestTour = useTourState((s) => s.requestTour);
  const setActiveTour = useTourState((s) => s.setActiveTour);
  const setDemoActive = useTourState((s) => s.setDemoActive);
  const doneTours = useTourState((s) => s.doneTours);

  useEffect(() => {
    if (!pathname) return;
    // A driver is already running — let it finish/destroy itself before we
    // try anything new. Route hops null this out before `router.push()`,
    // so the resume path below will fire on the next pathname change.
    if (isTourActive()) return;

    // 1) Manual replay request — wins over auto-fire logic. If the first
    // step lives on a different page, snapshot the tour and route there
    // first; the activeTour resume branch below handles the actual kick
    // once the new pathname mounts.
    if (requestedTour) {
      const firstPath = TOUR_STEPS[requestedTour][0]?.path;
      if (firstPath && firstPath !== pathname) {
        setActiveTour({ tour: requestedTour, stepIndex: 0 });
        requestTour(null);
        router.push(firstPath);
        return;
      }
      kick(requestedTour, 0);
      requestTour(null);
      return;
    }

    // 2) Mid-tour resume after route push.
    if (activeTour) {
      const expectedPath =
        TOUR_STEPS[activeTour.tour][activeTour.stepIndex]?.path;
      if (expectedPath === pathname) {
        kick(activeTour.tour, activeTour.stepIndex);
        setActiveTour(null);
        return;
      }
      // We're not on the expected page yet — keep waiting.
      return;
    }

    // 3) Auto-fire by route.
    if (pathname === '/onBoarding' && !doneTours.onboarding) {
      kick('onboarding', 0);
      return;
    }
    if (pathname === '/brand-memory' && !doneTours['brand-memory']) {
      kick('brand-memory', 0);
      return;
    }
    if (
      pathname === '/home' &&
      doneTours['brand-memory'] &&
      !doneTours.platform
    ) {
      kick('platform', 0);
      return;
    }

    function kick(tour: TourId, startIndex: number): void {
      if (tour === 'platform') {
        setDemoActive(true);
      }
      startTour({
        tour,
        initialIndex: startIndex,
        router,
      });
    }
  }, [
    pathname,
    activeTour,
    requestedTour,
    requestTour,
    setActiveTour,
    setDemoActive,
    doneTours,
    router,
  ]);

  return null;
}
