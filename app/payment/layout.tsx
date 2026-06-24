import { ReactNode } from 'react';
import { AppGradientBackground } from '@/components/shared/AppGradientBackground';

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
