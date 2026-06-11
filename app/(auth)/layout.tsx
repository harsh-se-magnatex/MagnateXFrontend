import React from 'react';
import NavBar from '../(main)/_components/NavBar';



export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavBar isAuthRender />
    <div className="min-h-svh bg-background pb-8 text-foreground sm:pt-22">
      {children}
    </div>
    </>
  );
}
