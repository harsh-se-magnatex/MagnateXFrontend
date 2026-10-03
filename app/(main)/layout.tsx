import React from 'react';
import { BusinessProvider } from '@/features/business/BusinessProvider';
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
import { ClearPendingOnNavigation } from './_components/ClearPendingOnNavigation';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <UserProvider>
        <AuthGuard>
          <BusinessProvider>
            <UserPlanCreditsProvider>
              <NotificationCountsProvider>
                <TooltipProvider delayDuration={150}>
                  <TourLauncher />
                  <AppSidebarWrapper />
                  <div className="app-shell relative z-0 w-full min-w-0 flex flex-col min-h-screen">
                    <AppGradientBackground variant="app" scoped />
                    <div className="relative z-10 min-w-0 flex flex-col min-h-screen">
                      <TopNav />
                      <FrozenAccountGuard>
                        <ExpiredPlanGuard>
                          {/* `app-main` drives the page entrance stagger in
                            globals.css — it targets this element's
                            grandchildren, i.e. each page's top-level
                            sections, so no page needs its own wiring. */}
                          <main className="app-main flex-1 min-w-0 px-4 py-6">
                            {children}
                          </main>
                          <AssistantWidget />
                        </ExpiredPlanGuard>
                      </FrozenAccountGuard>
                    </div>
                  </div>
                </TooltipProvider>
              </NotificationCountsProvider>
            </UserPlanCreditsProvider>
          </BusinessProvider>
        </AuthGuard>
      </UserProvider>
      <ClearPendingOnNavigation />
    </SidebarProvider>
  );
}
