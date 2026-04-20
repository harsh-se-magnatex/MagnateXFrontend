import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TopNav } from './_components/TopNav';
import AuthGuard from './_components/AuthGuard';
import { AppSidebarWrapper } from './_components/AppSideBarWrapper';
import { UserPlanCreditsProvider } from './_components/UserPlanCreditsProvider';
import { Toaster } from 'sonner';
import { UserProvider } from './_components/useUser';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <SidebarProvider>
      <UserProvider>
        <AppSidebarWrapper />
      <div className="w-full flex flex-col min-h-screen">
        <TopNav />
        <AuthGuard>
          <UserPlanCreditsProvider>
            <main className="flex-1 px-4 py-6">{children}</main>
            <Toaster/>
          </UserPlanCreditsProvider>
        </AuthGuard>
      </div>
      </UserProvider>
    </SidebarProvider>
  );
}
