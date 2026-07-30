import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppGradientBackground } from '@/components/shared/AppGradientBackground';
import { TopNav } from './_components/TopNav';
import AuthGuard from './_components/AuthGuard';
import { FrozenAccountGuard } from './_components/FrozenAccountGuard';
import { ExpiredPlanGuard } from './_components/ExpiredPlanGuard';
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
      <div className="app-shell relative z-0 w-full flex flex-col min-h-screen">
        <AppGradientBackground variant="app" scoped />
        <div className="relative z-10 flex flex-col min-h-screen">
        <TopNav />
        <AuthGuard>
            <FrozenAccountGuard>
              <ExpiredPlanGuard>
                <main className="flex-1 px-4 py-6">{children}</main>
                <AssistantWidget />
              </ExpiredPlanGuard>
            </FrozenAccountGuard>
        </AuthGuard>
        </div>
      </div>
              </TooltipProvider>
            </NotificationCountsProvider>
          </UserPlanCreditsProvider>
      </UserProvider>
    </SidebarProvider>
  );
}
