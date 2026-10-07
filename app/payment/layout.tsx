import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { AppGradientBackground } from '@/components/shared/AppGradientBackground';

/** Signed-in app surface: nothing here should appear in search results. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface PaymentLayoutProps {
  children: ReactNode;
}

export default function PaymentLayout({ children }: PaymentLayoutProps) {
  return (
    <div className="app-shell relative min-h-screen">
      <AppGradientBackground variant="app" />
      {children}
    </div>
  );
}
