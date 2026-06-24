import type { Metadata } from 'next';
import { AppGradientBackground } from '@/components/shared/AppGradientBackground';

export const metadata: Metadata = {
  title: 'Reset password',
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen selection:bg-primary-blue/20 overflow-hidden">
      <AppGradientBackground variant="subtle" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        {children}
      </div>
    </div>
  );
}
