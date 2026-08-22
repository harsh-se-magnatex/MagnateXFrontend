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
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-card/75 backdrop-blur-xl">
      <div className="grid h-14 w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarInset className="bg-transparent">
            <div className="flex h-14 shrink-0 items-center">
              <SidebarTrigger className="text-muted-foreground transition-colors hover:text-foreground" />
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
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-primary text-white shadow-sm shadow-primary/20'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
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
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
              pathname === '/settings/support-legal'
                ? 'bg-gradient-primary text-white shadow-sm shadow-primary/20'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-2.5 py-1.5 text-xs font-bold text-white shadow-sm shadow-primary/30 transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 sm:px-3"
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
              className={`relative flex shrink-0 items-center justify-center rounded-lg p-2 text-sm font-medium transition-colors ${
                pathname?.startsWith('/settings/notifications') ||
                pathname?.startsWith('/alerts')
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <Bell className="h-4 w-4 shrink-0" aria-hidden />
              {notificationBadge && (
                <span
                  className="pointer-events-none absolute -right-0.5 -top-0.5 inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-background"
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
            className="flex cursor-pointer shrink-0 items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:px-2.5"
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
            Are you sure you want to sign out? You will need to log in again to
            access your account.
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
