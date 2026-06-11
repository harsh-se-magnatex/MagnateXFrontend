import React from 'react';
import { TourLauncher } from '@/components/tour/TourLauncher';

export default function BrandMemoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center font-sans ">
      <TourLauncher />
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 glass-card sm:items-start">
        {children}
      </main>
    </div>
  );
}
