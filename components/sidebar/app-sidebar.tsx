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
import { Sparkles as TourSparkles } from 'lucide-react';
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

  React.useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [pathname, isMobile]);

  return (
    <Sidebar className="h-screen border-r border-border/40">
      {/* Brand Header */}
      <SidebarHeader className="mt-1, flex">
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
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight bg-gradient-primary-text">
              SocioGenie
            </span>
            <span className="text-[10px] text-center font-medium text-muted-foreground uppercase tracking-widest">
              Social Hub
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="custom-scrollbar">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-4 ">
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
                            ? 'bg-gradient-primary shadow-sm'
                            : 'text-foreground/70 hover:bg-accent hover:text-foreground'
                          }`}
                      >
                        <item.icon
                          className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-foreground'}`}
                        />
                        <span
                          className={
                            isActive ? 'text-white' : 'text-foreground'
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
                          ? 'bg-gradient-primary shadow-sm'
                          : 'text-foreground/70 hover:bg-accent hover:text-foreground'
                        }`}
                    >
                      <Eye
                        className={`h-4 w-4 shrink-0 ${pathname === '/approval' ? 'text-white' : 'text-foreground'}`}
                      />
                      <span
                        className={`${pathname === '/approval' ? 'text-white' : 'text-foreground'}`}
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
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-4 mb-1 flex items-center gap-2">
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
                            ? 'bg-gradient-primary shadow-sm'
                            : 'text-foreground/70 hover:bg-accent hover:text-foreground'
                          }`}
                      >
                        <child.icon
                          className={`h-4 w-4 shrink-0 ${isChildActive ? 'text-white' : 'text-foreground'}`}
                        />
                        <span
                          className={
                            isChildActive ? 'text-white' : 'text-foreground'
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {isAdmin && !isAccountFrozen && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-destructive/60 px-4 mb-1">
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
                          ? 'bg-gradient-primary text-white shadow-sm'
                          : 'text-foreground/70 hover:bg-accent hover:text-foreground'
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
                          ? 'bg-gradient-primary text-white shadow-sm'
                          : 'text-foreground/70 hover:bg-accent hover:text-foreground'
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
                          ? 'bg-gradient-primary text-white shadow-sm'
                          : 'text-foreground/70 hover:bg-accent hover:text-foreground'
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
                    isActive={pathname?.startsWith('/admin/ai-engine-review') ?? false}
                  >
                    <Link
                      href="/admin/ai-engine-review"
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${(pathname?.startsWith('/admin/ai-engine-review') ?? false)
                          ? 'bg-gradient-primary text-white shadow-sm'
                          : 'text-foreground/70 hover:bg-accent hover:text-foreground'
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
                          ? 'bg-gradient-primary text-white shadow-sm'
                          : 'text-foreground/70 hover:bg-accent hover:text-foreground'
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
      {!isAccountFrozen && (
        <SidebarFooter className="border-t border-border/40">
          <button
            type="button"
            onClick={() => {
              // Close the mobile drawer first so it doesn't sit on top of
              // the tour popover and highlighted page content.
              if (isMobile) setOpenMobile(false);
              useTourState.getState().requestTour('platform');
            }}
            className="mx-2 mb-2 mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
          >
            <TourSparkles className="h-3.5 w-3.5 shrink-0" />
            Take the tour
          </button>
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  );
}
