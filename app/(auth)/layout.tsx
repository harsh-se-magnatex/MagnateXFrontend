import React from 'react';
import { Toaster } from 'sonner';
import NavBar from '../(main)/_components/NavBar';



export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavBar isAuthRender />
    <div className="min-h-svh bg-background text-foreground">{children}</div>
    <Toaster/>
    </>
  );
}
