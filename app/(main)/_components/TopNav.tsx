'use client';

import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Fingerprint,
  Home,
  Loader2,
  LogOut,
  MessageSquare,
  Rocket,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPlanCredits } from './UserPlanCreditsProvider';
import {
  formatNotificationCount,
  useNotificationCounts,
} from './NotificationCountsProvider';
import { logoutUser } from '@/features/user/api';
import { useState } from 'react';
import { useTourDemo } from '@/src/stores/tourState';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const topNav = [
  { name: 'Home', href: '/home', icon: Home },
  { name: 'Contact Us', href: '/settings/support-legal', icon: MessageSquare },
  {
    name: 'AutoPilot Preferences',
    href: '/settings/autopilot-preference',
    icon: Rocket,
  },
  { name: 'Brand DNA', href: '/brand-dna', icon: Fingerprint },
] as const;

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { billing } = useUserPlanCredits();
  const { total: notificationTotal, cap: notificationCap } =
    useNotificationCounts();
  const notificationBadge = formatNotificationCount(
    notificationTotal,
    notificationCap
  );
  const accountFrozen = billing?.isAccountFrozen === true;
  const isTourDemo = useTourDemo();
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  // The Upgrade pill is a tour-only anchor — once the platform tour
  // finishes or is closed, `isTourDemo` flips off and the pill disappears.
  const showUpgradeCta = isTourDemo;

  const handleSignOut = async () => {
    setSignOutLoading(true);
    try {
      await logoutUser();
      router.replace('/sign-in');
    } finally {
      setSignOutLoading(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-default bg-[color-mix(in_srgb,var(--bg-screen)_88%,transparent)] backdrop-blur-xl">
        <div className="grid h-14 w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarInset className="bg-transparent">
              <div className="flex h-14 shrink-0 items-center">
                <SidebarTrigger className="icon-secondary transition-expo hover:text-default" />
              </div>
            </SidebarInset>
          </div>

          {!accountFrozen && (
            <nav id="tour-topnav-wrapper" className="flex items-center gap-1">
              {topNav.map((item) => {
                const isActive =
                  item.href === '/brand-dna'
                    ? pathname?.startsWith('/brand-dna')
                    : pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium transition-expo ${
                      isActive
                        ? 'nav-active'
                        : 'text-secondary hover:bg-element hover:text-default'
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}
          {accountFrozen && (
            <nav className="flex items-center gap-1">
              <Link
                href="/settings/support-legal"
                className={`flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium transition-expo ${
                  pathname === '/settings/support-legal'
                    ? 'nav-active'
                    : 'text-secondary hover:bg-element hover:text-default'
                }`}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Contact Us</span>
              </Link>
            </nav>
          )}

          <div className="flex min-w-0 items-center gap-2 justify-end justify-self-end">
            {showUpgradeCta && !accountFrozen && (
              <Link
                id="tour-upgrade-cta"
                href="/settings/billings?upgrade=1"
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-btn-primary px-3 text-xs font-medium text-btn-primary-fg transition-expo"
              >
                <Rocket className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>Upgrade</span>
              </Link>
            )}
            {!accountFrozen && (
              <Link
                href="/settings/notifications"
                aria-label={
                  notificationBadge
                    ? `Notifications (${notificationBadge})`
                    : 'Notifications'
                }
                className={`relative flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-expo ${
                  pathname?.startsWith('/settings/notifications') ||
                  pathname?.startsWith('/alerts')
                    ? 'nav-active'
                    : 'text-secondary hover:bg-element hover:text-default'
                }`}
              >
                <Bell className="h-4 w-4 shrink-0" aria-hidden />
                {notificationBadge && (
                  <span
                    className="pointer-events-none absolute -right-0.5 -top-0.5 inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-danger-solid px-1 font-mono text-[10px] font-medium leading-none text-white ring-2 ring-[var(--bg-screen)]"
                    aria-hidden
                  >
                    {notificationBadge}
                  </span>
                )}
              </Link>
            )}
            <button
              type="button"
              aria-label="Sign out"
              className="flex h-9 cursor-pointer shrink-0 items-center gap-2 rounded-full px-3 text-sm font-medium text-secondary transition-expo hover:bg-element hover:text-default"
              onClick={() => setSignOutConfirmOpen(true)}
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <AlertDialog
        open={signOutConfirmOpen}
        onOpenChange={(open) => {
          if (signOutLoading) return;
          setSignOutConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You will need to log in again
              to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signOutLoading}>
              Stay signed in
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={signOutLoading}
              onClick={(event) => {
                event.preventDefault();
                void handleSignOut();
              }}
            >
              {signOutLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
