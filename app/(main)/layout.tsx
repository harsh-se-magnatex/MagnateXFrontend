import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TopNav } from './_components/TopNav';
import AuthGuard from './_components/AuthGuard';
import { FrozenAccountGuard } from './_components/FrozenAccountGuard';
import { AppSidebarWrapper } from './_components/AppSideBarWrapper';
import { UserPlanCreditsProvider } from './_components/UserPlanCreditsProvider';
import { NotificationCountsProvider } from './_components/NotificationCountsProvider';
import { UserProvider } from './_components/useUser';
import { AssistantWidget } from '@/components/chat/AssistantWidget';
import { TourLauncher } from '@/components/tour/TourLauncher';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <SidebarProvider>
      <UserProvider>
          <UserPlanCreditsProvider>
            <NotificationCountsProvider>
              <TooltipProvider delayDuration={150}>
        <TourLauncher />
        <AppSidebarWrapper />
      <div className="w-full flex flex-col min-h-screen">
        <TopNav />
        <AuthGuard>
            <FrozenAccountGuard>
              <main className="flex-1 px-4 py-6">{children}</main>
              <AssistantWidget />
            </FrozenAccountGuard>
        </AuthGuard>
      </div>
              </TooltipProvider>
            </NotificationCountsProvider>
          </UserPlanCreditsProvider>
      </UserProvider>
    </SidebarProvider>
  );
}
