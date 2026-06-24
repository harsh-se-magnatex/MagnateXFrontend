import React from 'react';
import { TourLauncher } from '@/components/tour/TourLauncher';
import { AppGradientBackground } from '@/components/shared/AppGradientBackground';

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
