import React from 'react';
import { TourLauncher } from '@/components/tour/TourLauncher';
import { AppGradientBackground } from '@/components/shared/AppGradientBackground';

export default function BrandMemoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell relative flex min-h-screen items-center justify-center font-sans">
      <AppGradientBackground variant="app" />
      <TourLauncher />
      <main className="relative z-10 flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 glass-card sm:items-start">
        {children}
      </main>
    </div>
  );
}
