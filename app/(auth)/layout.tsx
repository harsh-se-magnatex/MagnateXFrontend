import React from 'react';
import NavBar from '../(main)/_components/NavBar';
import { AppGradientBackground } from '@/components/shared/AppGradientBackground';
import { RedirectIfAuthenticated } from '@/components/auth/RedirectIfAuthenticated';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppGradientBackground variant="subtle" />
      <NavBar isAuthRender />
      <div className="relative min-h-svh pb-8 text-default sm:pt-22">
        <RedirectIfAuthenticated>{children}</RedirectIfAuthenticated>
      </div>
    </>
  );
}
