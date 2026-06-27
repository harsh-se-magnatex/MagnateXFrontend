'use client';
import * as React from 'react';
import Link from 'next/link';
import {
  Activity,
  BarChart3,
  Bell,
  Brain,
  CalendarCheck2,
  CalendarDays,
  CalendarSync,
  ClipboardClock,
  CloudLightning,
  CreditCard,
  Fingerprint,
  HelpCircle,
  Eye,
  ImagePlus,
  Images,
  Receipt,
  Send,
  Settings,
  Settings2,
  Share2,
  Sparkles,
  LayoutGrid,
  User,
  Wand2,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import { WORKSPACE_NAV, type WorkspaceNavHref } from '@/lib/workspace-nav';
import { useTourState } from '@/src/stores/tourState';
import { getPageTourRequest } from '@/components/tour/tour-steps';
import { useAuth } from '@/hooks/useAuth';
import { useUserPlanCredits } from '@/app/(main)/_components/UserPlanCreditsProvider';
import {
  PRICING_PLANS_BY_ID,
  type PlanId,
} from '@/lib/landing-pricing';
import {
  formatNotificationCount,
  useNotificationCounts,
} from '@/app/(main)/_components/NotificationCountsProvider';

/** Turn a route into a stable id slug for tour anchoring.
 *  `/instant-generation` → `tour-nav-instant-generation`
 *  `/settings/billings`  → `tour-nav-settings-billings` */
function tourNavId(href: string): string {
  const slug = href.replace(/^\//, '').replace(/\//g, '-') || 'home';
  return `tour-nav-${slug}`;
}

function getNameInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const first = parts[0][0] ?? '';
  const last = parts[parts.length - 1][0] ?? '';
  return `${first}${last}`.toUpperCase();
}

function formatActivePlanLabel(activePlan: string | null | undefined): string {
  if (!activePlan || activePlan === 'non-subscribed') {
    return 'No active plan';
  }
  const key = activePlan.trim().toLowerCase() as PlanId;
  return PRICING_PLANS_BY_ID[key]?.name ?? activePlan.replace(/[-_]+/g, ' ').charAt(0).toUpperCase() + activePlan.replace(/[-_]+/g, ' ').slice(1);
}

const workspaceNavIcons: Record<WorkspaceNavHref, typeof Brain> = {
  '/instant-generation': Brain,
  '/batch-generation': CloudLightning,
  '/product-advert': ImagePlus,
  '/festive-post': CalendarSync,
  '/create-campaign': Sparkles,
  '/post-scheduler': CalendarCheck2,
  '/scheduled-post': ClipboardClock,
  '/media-library': Images,
  '/social-media-integration': Share2,
  '/analytics': BarChart3,
};

const workspaceNav = WORKSPACE_NAV.map((item) => ({
  ...item,
  icon: workspaceNavIcons[item.href],
}));

const settingsNavItems = [
  { name: 'Account', href: '/settings/account', icon: User },
  { name: 'Billing & Credits', href: '/settings/billings', icon: CreditCard },
  { name: 'Transactions', href: '/settings/transactions', icon: Receipt },
  { name: 'Automation', href: '/settings/automation', icon: Settings2 },
  { name: 'Notifications', href: '/settings/notifications', icon: Bell },
  {
    name: 'Support & Legal',
    href: '/settings/support-legal',
    icon: HelpCircle,
  },
] as const;

export function AppSidebar({
  isAdmin,
  isNeedApproval,
  isAccountFrozen,
}: {
  isAdmin: boolean;
  isNeedApproval: boolean;
  isAccountFrozen: boolean;
}) {
  const pathname = usePathname();
  const { total: notificationTotal, cap: notificationCap } =
    useNotificationCounts();
  const notificationBadge = formatNotificationCount(
    notificationTotal,
    notificationCap
  );
  const workspaceItems = isAccountFrozen
    ? workspaceNav.filter((item) => item.href === '/social-media-integration')
    : workspaceNav;
  const settingsChildrenFrozen = settingsNavItems.filter(
    (child) => child.href === '/settings/billings'
  );
  const settingsChildItems = isAccountFrozen
    ? settingsChildrenFrozen
    : settingsNavItems;
  const { isMobile, setOpenMobile } = useSidebar();
  const { user, accountName, loading: authLoading } = useAuth();
  const { billing } = useUserPlanCredits();

  const displayName =
    (accountName ?? user?.displayName ?? user?.email ?? 'Account').trim();
  const nameInitials = getNameInitials(displayName);
  const planLabel = formatActivePlanLabel(billing?.activePlan);
  const pageTourRequest = pathname ? getPageTourRequest(pathname) : null;

  const startPageTour = () => {
    if (!pageTourRequest) return;
    if (isMobile) setOpenMobile(false);
    useTourState.getState().requestTour(pageTourRequest);
  };

  React.useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [pathname, isMobile, setOpenMobile]);

  return (
    <Sidebar className="h-screen border-r border-sidebar-border bg-sidebar shadow-[4px_0_24px_-12px_rgba(0,0,0,0.35)] [&_[data-slot=sidebar-inner]]:bg-sidebar">
      {/* Brand Header */}
      <SidebarHeader className="mt-1 flex border-b border-sidebar-border/80 pb-3">
        <Link
          href={isAccountFrozen ? '/settings/billings' : '/home'}
          className="flex items-center gap-3 group flex-col"
        >
          <div className="relative">
            <img
              src="/logo.png"
              alt="SocioGenie"
              className="w-full h-30 rounded-xl transition-transform group-hover:scale-105"
            />
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="custom-scrollbar">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="mb-1 px-4 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/45">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceItems.map((item) => {
                const isActive = item.match(pathname);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link
                        id={tourNavId(item.href)}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                          }`}
                      >
                        <item.icon
                          className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-sidebar-foreground/80'}`}
                        />
                        <span
                          className={
                            isActive ? 'text-primary-foreground' : 'text-sidebar-foreground'
                          }
                        >
                          {item.name}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
            {isNeedApproval && !isAccountFrozen && (
              <SidebarMenu>
                <SidebarMenuItem key={'need_approval'}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/approval'}
                  >
                    <Link
                      href={'/approval'}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${pathname === '/approval'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        }`}
                    >
                      <Eye
                        className={`h-4 w-4 shrink-0 ${pathname === '/approval' ? 'text-primary-foreground' : 'text-sidebar-foreground/80'}`}
                      />
                      <span
                        className={`${pathname === '/approval' ? 'text-primary-foreground' : 'text-sidebar-foreground'}`}
                      >
                        Approval
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings — always expanded (no collapsible); heading mirrors former dropdown row */}
        <SidebarGroup>
          <SidebarGroupLabel className="mb-1 flex items-center gap-2 px-4 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/45">
            <Settings className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
            Settings
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsChildItems.map((child) => {
                const href = child.href;
                const isChildActive = pathname === href;
                const showBadge =
                  href === '/settings/notifications' && !!notificationBadge;
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton asChild isActive={isChildActive}>
                      <Link
                        id={tourNavId(href)}
                        href={href}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${isChildActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                          }`}
                      >
                        <child.icon
                          className={`h-4 w-4 shrink-0 ${isChildActive ? 'text-primary-foreground' : 'text-sidebar-foreground/80'}`}
                        />
                        <span
                          className={
                            isChildActive ? 'text-primary-foreground' : 'text-sidebar-foreground'
                          }
                        >
                          {child.name}
                        </span>
                        {showBadge && (
                          <span
                            className={`ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ring-1 ${
                              isChildActive
                                ? 'bg-white/20 text-white ring-white/30'
                                : 'bg-rose-500 text-white ring-transparent'
                            }`}
                            aria-label={`${notificationBadge} unread notifications`}
                          >
                            {notificationBadge}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {!isAccountFrozen && pageTourRequest && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    type="button"
                    onClick={startPageTour}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  >
                    <Sparkles className="h-4 w-4 shrink-0 text-sidebar-foreground/80" />
                    <span className="text-sidebar-foreground">Take this page tour</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {isAdmin && !isAccountFrozen && (
          <SidebarGroup>
            <SidebarGroupLabel className="mb-1 px-4 text-[10px] font-bold uppercase tracking-widest text-destructive/70">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname?.startsWith('/admin/users') ?? false}
                  >
                    <Link
                      href="/admin/users"
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${(pathname?.startsWith('/admin/users') ?? false)
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        }`}
                    >
                      <User className="h-4 w-4 shrink-0" />
                      <span>Users</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/adminsupport'}
                  >
                    <Link
                      href="/adminsupport"
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${pathname === '/adminsupport'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        }`}
                    >
                      <HelpCircle className="h-4 w-4 shrink-0" />
                      <span>Admin Support</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/monitoring'}
                  >
                    <Link
                      href="/monitoring"
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${pathname === '/monitoring'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        }`}
                    >
                      <Activity className="h-4 w-4 shrink-0" />
                      <span>Monitoring</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname?.startsWith('/admin/subscriptions') ?? false}
                  >
                    <Link
                      href="/admin/subscriptions"
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${(pathname?.startsWith('/admin/subscriptions') ?? false)
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        }`}
                    >
                      <CreditCard className="h-4 w-4 shrink-0" />
                      <span>Subscriptions</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname?.startsWith('/admin/ai-engine-review') ?? false}
                  >
                    <Link
                      href="/admin/ai-engine-review"
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${(pathname?.startsWith('/admin/ai-engine-review') ?? false)
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        }`}
                    >
                      <Wand2 className="h-4 w-4 shrink-0" />
                      <span>AI Engine Review</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/send-notification'}
                  >
                    <Link
                      href="/send-notification"
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${pathname === '/send-notification'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        }`}
                    >
                      <Send className="h-4 w-4 shrink-0" />
                      <span>Send Notification</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border bg-sidebar p-3">
        <div
          className="flex cursor-default items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-sidebar-accent"
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm ring-1 ring-primary/30"
            aria-hidden
          >
            {authLoading ? '…' : nameInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">
              {authLoading ? 'Loading…' : displayName}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">{planLabel}</p>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
