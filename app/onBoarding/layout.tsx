import React from 'react';
import { TourLauncher } from '@/components/tour/TourLauncher';

export default function OnBoardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="font-sans">
      <TourLauncher />
      {children}
    </div>
  );
}
