import React from 'react';
import { Toaster } from 'sonner';

export default function BrandMemoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center font-sans ">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 glass-card sm:items-start">
        {children}
      </main>
      <Toaster/>
    </div>
  );
}
