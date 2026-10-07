import type { Metadata } from 'next';
import React from 'react';
import { TourLauncher } from '@/components/tour/TourLauncher';
import { AppGradientBackground } from '@/components/shared/AppGradientBackground';

/** Signed-in app surface: nothing here should appear in search results. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function OnBoardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell relative min-h-screen font-sans">
      <AppGradientBackground variant="app" />
      <TourLauncher />
      {children}
    </div>
  );
}
