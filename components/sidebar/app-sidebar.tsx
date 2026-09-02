'use client';
import * as React from 'react';
import Link from 'next/link';
import {
  Activity,
  BarChart3,
  Brain,
  CalendarCheck2,
  CalendarRange,
  CalendarSync,
  ChevronsUpDown,
  ClipboardClock,
  CloudLightning,
  CreditCard,
  HelpCircle,
  Eye,
  ImagePlus,
  Images,
  Receipt,
  Send,
  Settings2,
  Share2,
  Sparkles,
  Video,
  LayoutGrid,
  User,
  CalendarDays,
  Workflow,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePathname } from 'next/navigation';
import {
  WORKSPACE_NAV,
  WORKSPACE_NAV_HREFS,
  type WorkspaceNavHref,
} from '@/lib/workspace-nav';
import { useTourState } from '@/src/stores/tourState';
import { getPageTourRequest } from '@/components/tour/tour-steps';
import { useAuth } from '@/hooks/useAuth';
import { useUserPlanCredits } from '@/app/(main)/_components/UserPlanCreditsProvider';
import { UpgradeGate } from '@/components/shared/UpgradeGate';
import { PRICING_PLANS_BY_ID, type PlanId } from '@/lib/landing-pricing';

/** Turn a route into a stable id slug for tour anchoring.
 *  `/instant-generation` → `tour-nav-instant-generation`*  `/settings/billings`→ `tour-nav-settings-billings` */
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
  return (
    PRICING_PLANS_BY_ID[key]?.name ??
    activePlan.replace(/[-_]+/g, ' ').charAt(0).toUpperCase() +
      activePlan.replace(/[-_]+/g, ' ').slice(1)
  );
}

const workspaceNavIcons: Record<WorkspaceNavHref, typeof Brain> = {
  [WORKSPACE_NAV_HREFS.quickCreate]: Brain,
  [WORKSPACE_NAV_HREFS.productAdvert]: ImagePlus,
  [WORKSPACE_NAV_HREFS.videoGeneration]: Video,
  [WORKSPACE_NAV_HREFS.festivePost]: CalendarSync,
  [WORKSPACE_NAV_HREFS.createCampaign]: Sparkles,
  [WORKSPACE_NAV_HREFS.carouselCreate]: LayoutGrid,
  [WORKSPACE_NAV_HREFS.schedulePost]: CalendarCheck2,
  [WORKSPACE_NAV_HREFS.postQueue]: ClipboardClock,
  [WORKSPACE_NAV_HREFS.contentPlan]: CalendarRange,
  [WORKSPACE_NAV_HREFS.gallery]: Images,
  [WORKSPACE_NAV_HREFS.linkedProfiles]: Share2,
  [WORKSPACE_NAV_HREFS.analytics]: BarChart3,
};

const workspaceNav = WORKSPACE_NAV.map((item) => ({
  ...item,
  icon: workspaceNavIcons[item.href],
}));

const settingsNavItems = [
  { name: 'Account', href: '/settings/account', icon: User },
  { name: 'Billing & Credits', href: '/settings/billings', icon: CreditCard },
  {
    name: 'Next plan platforms',
    href: '/settings/next-plan-platforms',
    icon: Share2,
  },
  { name: 'Payment History', href: '/settings/transactions', icon: Receipt },
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
  const { billing } = useUserPlanCredits();
  const workspaceItems = (() => {
    if (isAccountFrozen) {
      return workspaceNav.filter(
        (item) => item.href === WORKSPACE_NAV_HREFS.linkedProfiles
      );
    }
    const items = [...workspaceNav];
    return items;
  })();
  const settingsChildItems = isAccountFrozen
    ? settingsNavItems.filter(
        (child) =>
          child.href === '/settings/billings' ||
          child.href === '/settings/support-legal'
      )
    : settingsNavItems;
  const { isMobile, setOpenMobile } = useSidebar();
  const { user, accountName, loading: authLoading } = useAuth();

  const displayName = (
    accountName ??
    user?.displayName ??
    user?.email ??
    'Account'
  ).trim();
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
    <Sidebar className="h-screen border-r border-default bg-screen [&_[data-slot=sidebar-inner]]:bg-screen">
      {/* Brand Header */}
      <SidebarHeader className="mt-1 flex border-b border-default pb-3">
        <Link
          href={isAccountFrozen ? '/settings/billings' : '/home'}
          className="flex items-center gap-3 group flex-col"
        >
          <div className="relative">
            <img
              src="/logo.png"
              alt="SocioGenie"
              className="w-full h-30 rounded-2xl transition-expo-transform"
            />
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="custom-scrollbar">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 px-4 text-eyebrow">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceItems.map((item) => {
                const isActive = item.match(pathname);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="hover:bg-transparent active:bg-transparent data-open:hover:bg-transparent data-active:bg-transparent"
                    >
                      <UpgradeGate
                        gated={
                          item.href === WORKSPACE_NAV_HREFS.contentPlan &&
                          billing?.mode === 'manual'
                        }
                        tooltip="Upgrade your plan to unlock AI Manager."
                        side="right"
                        className="w-full"
                      >
                        <Link
                          id={tourNavId(item.href)}
                          href={item.href}
                          className={`flex w-full items-center gap-3 h-9 rounded-full px-3 text-sm font-medium transition-expo ${
                            isActive
                              ? 'nav-active'
                              : 'text-secondary hover:bg-element hover:text-default'
                          }`}
                        >
                          <item.icon
                            className={`h-4 w-4 shrink-0 ${isActive ? 'text-[var(--brand-violet-text)]' : 'icon-secondary'}`}
                          />
                          <span
                            className={
                              isActive ? 'text-default' : 'text-secondary'
                            }
                          >
                            {item.name}
                          </span>
                        </Link>
                      </UpgradeGate>
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
                      className={`flex items-center gap-3 h-9 rounded-full px-3 text-sm font-medium transition-expo ${
                        pathname === '/approval'
                          ? 'nav-active'
                          : 'text-secondary hover:bg-element hover:text-default'
                      }`}
                    >
                      <Eye
                        className={`h-4 w-4 shrink-0 ${pathname === '/approval' ? 'text-[var(--brand-violet-text)]' : 'icon-secondary'}`}
                      />
                      <span
                        className={`${pathname === '/approval' ? 'text-default' : 'text-secondary'}`}
                      >
                        Approval
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            )}
            {!isAccountFrozen && pageTourRequest && (
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <button
                      type="button"
                      onClick={startPageTour}
                      className="flex h-9 w-full items-center gap-3 rounded-full px-3 text-sm font-medium text-secondary transition-expo hover:bg-element hover:text-default"
                    >
                      <Sparkles className="h-4 w-4 shrink-0 icon-secondary" />
                      <span className="text-secondary">
                        Take this page tour
                      </span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {isAdmin && !isAccountFrozen && (
          <SidebarGroup>
            <SidebarGroupLabel className="mb-2 px-4 text-eyebrow text-danger">
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
                      className={`flex items-center gap-3 h-9 rounded-full px-3 text-sm font-medium transition-expo ${
                        (pathname?.startsWith('/admin/users') ?? false)
                          ? 'nav-active'
                          : 'text-secondary hover:bg-element hover:text-default'
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
                    isActive={
                      pathname?.startsWith('/admin/automation') ?? false
                    }
                  >
                    <Link
                      href="/admin/automation"
                      className={`flex items-center gap-3 h-9 rounded-full px-3 text-sm font-medium transition-expo ${
                        (pathname?.startsWith('/admin/automation') ?? false)
                          ? 'nav-active'
                          : 'text-secondary hover:bg-element hover:text-default'
                      }`}
                    >
                      <Workflow className="h-4 w-4 shrink-0" />
                      <span>Unpaid Signups</span>
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
                      className={`flex items-center gap-3 h-9 rounded-full px-3 text-sm font-medium transition-expo ${
                        pathname === '/adminsupport'
                          ? 'nav-active'
                          : 'text-secondary hover:bg-element hover:text-default'
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
                      className={`flex items-center gap-3 h-9 rounded-full px-3 text-sm font-medium transition-expo ${
                        pathname === '/monitoring'
                          ? 'nav-active'
                          : 'text-secondary hover:bg-element hover:text-default'
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
                    isActive={
                      pathname?.startsWith('/admin/content-calendar-review') ??
                      false
                    }
                  >
                    <Link
                      href="/admin/content-calendar-review"
                      className={`flex items-center gap-3 h-9 rounded-full px-3 text-sm font-medium transition-expo ${
                        (pathname?.startsWith(
                          '/admin/content-calendar-review'
                        ) ?? false)
                          ? 'nav-active'
                          : 'text-secondary hover:bg-element hover:text-default'
                      }`}
                    >
                      <CalendarDays className="h-4 w-4 shrink-0" />
                      <span>AI Manager Review</span>
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
                      className={`flex items-center gap-3 h-9 rounded-full px-3 text-sm font-medium transition-expo ${
                        pathname === '/send-notification'
                          ? 'nav-active'
                          : 'text-secondary hover:bg-element hover:text-default'
                      }`}
                    >
                      <Send className="h-4 w-4 shrink-0" />
                      <span>Send Notification</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname?.startsWith('/admin/subscriptions') ?? false
                    }
                  >
                    <Link
                      href="/admin/subscriptions"
                      className={`flex items-center gap-3 h-9 rounded-full px-3 text-sm font-medium transition-expo ${
                        (pathname?.startsWith('/admin/subscriptions') ?? false)
                          ? 'nav-active'
                          : 'text-secondary hover:bg-element hover:text-default'
                      }`}
                    >
                      <CreditCard className="h-4 w-4 shrink-0" />
                      <span>Subscriptions</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-default bg-screen p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Open settings menu"
              className="flex w-full cursor-pointer items-center gap-3 rounded-full px-2 py-2 text-left transition-expo hover:bg-element focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strong"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-element font-mono text-sm font-medium text-default"
                aria-hidden
              >
                {authLoading ? '…' : nameInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-default">
                  {authLoading ? 'Loading…' : displayName}
                </p>
                <p className="truncate text-xs text-tertiary">{planLabel}</p>
              </div>
              <ChevronsUpDown
                className="h-4 w-4 shrink-0 icon-tertiary"
                aria-hidden
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            className="min-w-56"
          >
            <DropdownMenuLabel className="text-eyebrow">
              Settings
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {settingsChildItems.map((child) => {
                const isActive = pathname === child.href;
                return (
                  <DropdownMenuItem key={child.href} asChild>
                    <Link
                      id={tourNavId(child.href)}
                      href={child.href}
                      className={
                        isActive ? 'bg-hover text-accent-foreground' : undefined
                      }
                    >
                      <child.icon className="h-4 w-4" />
                      <span>{child.name}</span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
