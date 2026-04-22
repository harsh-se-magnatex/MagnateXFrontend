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
  ChevronRight,
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
  LogOut,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import { signOutUser } from '@/src/service/auth';
import router from 'next/router';
import { logoutUser } from '@/features/user/api';

const CREATE_PATHS = [
  '/create',
  '/instant-generation',
  '/batch-generation',
  '/product-advert',
  '/festive-post',
  '/ai-engine',
] as const;

const CALENDAR_PATHS = [
  '/calendar',
  '/post-scheduler',
  '/scheduled-post',
] as const;

function pathMatchesPrefixes(
  pathname: string | null,
  prefixes: readonly string[]
) {
  if (!pathname) return false;
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}




const workspaceNav = [
  {
    name: 'Quick Create',
    href: '/instant-generation',
    icon: Brain,
    match: (pathname: string | null) =>
      !!pathname && pathname.startsWith('/instant-generation'),
  }, {
    name: 'Bulk Create',
    href: '/batch-generation',
    icon: CloudLightning,
    match: (pathname: string | null) =>
      !!pathname && pathname.startsWith('/batch-generation'),
  },{
    name: 'Product Advert',
    href: '/product-advert',
    icon: ImagePlus,
    match: (pathname: string | null) =>
      !!pathname && pathname.startsWith('/product-advert'),
  },
  {
    name: 'Festive Post',
    href: '/festive-post',
    icon: CalendarSync,
    match: (pathname: string | null) =>
      !!pathname && pathname.startsWith('/festive-post'),
  },
  {
    name: 'Schedule Post',
    href: '/post-scheduler',
    icon: CalendarCheck2,
    match: (pathname: string | null) =>
      !!pathname && pathname.startsWith('/post-scheduler'),
  },
  {
    name: 'Post Queue',
    href: '/scheduled-post',
    icon: ClipboardClock,
    match: (pathname: string | null) =>
      !!pathname && pathname.startsWith('/scheduled-post'),
  },
  {
    name: 'Gallery',
    href: '/media-library',
    icon: Images,
    match: (pathname: string | null) =>
      !!pathname && pathname.startsWith('/media-library'),
  },
  {
    name: 'Linked Profiles',
    href: '/social-media-integration',
    icon: Share2,
    match: (pathname: string | null) =>
      !!pathname && pathname.startsWith('/social-media-integration'),
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    match: (pathname: string | null) =>
      !!pathname &&
      (pathname === '/analytics' || pathname.startsWith('/analytics/')),
  },
] as const;

const settingsNav = {
  name: 'Settings',
  href: '/settings/account',
  icon: Settings,
  children: [
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
    {
      name:'Sign Out',
      onClick: async () => {
          await logoutUser();
          router.replace('/sign-in');
      },
      icon: LogOut,
    }
  ],
};

export function AppSidebar({
  isAdmin,
  isNeedApproval,
}: {
  isAdmin: boolean;
  isNeedApproval: boolean;
}) {
  const pathname = usePathname();
  const isSettingsActive = pathname?.startsWith('/settings');
  const isCreateActive = pathMatchesPrefixes(pathname, CREATE_PATHS);
  const isCalendarActive = pathMatchesPrefixes(pathname, CALENDAR_PATHS);
  const [settingsOpen, setSettingsOpen] = React.useState(isSettingsActive);
  const [createOpen, setCreateOpen] = React.useState(isCreateActive);
  const [calendarOpen, setCalendarOpen] = React.useState(isCalendarActive);
  React.useEffect(() => {
    if (isSettingsActive) setSettingsOpen(true);
  }, [isSettingsActive]);
  React.useEffect(() => {
    if (isCreateActive) setCreateOpen(true);
  }, [isCreateActive]);
  React.useEffect(() => {
    if (isCalendarActive) setCalendarOpen(true);
  }, [isCalendarActive]);
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
        <Link href="/home" className="flex items-center gap-3 group flex-col">
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
              {workspaceNav.map((item) => {
                const isActive = item.match(pathname);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                          isActive
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
            {isNeedApproval && (
              <SidebarMenu>
                <SidebarMenuItem key={'need_approval'}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/approval'}
                  >
                    <Link
                      href={'/approval'}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                        pathname === '/approval'
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

        {/* Settings */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-4 mb-1">
            Configuration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                        isSettingsActive
                          ? 'bg-accent text-foreground'
                          : 'text-foreground/70 hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      <Settings className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-left">Settings</span>
                      <ChevronRight
                        className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${
                          settingsOpen ? 'rotate-90' : ''
                        }`}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="mt-1 ml-2 border-l border-border/40 pl-2">
                      {settingsNav.children.map((child) => {
                        const isChildActive = pathname === child.href;
                        if (child.onClick) {
                          return (
                            <SidebarMenuSubItem key={child.name} className='cursor-pointer'>
                              <SidebarMenuSubButton onClick={child.onClick}>
                                <child.icon className="h-3.5 w-3.5 shrink-0" />
                                <span>{child.name}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        }
                        return (
                          <SidebarMenuSubItem key={child.href}>
                            <SidebarMenuSubButton asChild isActive={isChildActive}>
                              <Link href={child.href || ''} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all ${isChildActive ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
                                <child.icon className="h-3.5 w-3.5 shrink-0" />
                                <span>{child.name}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-destructive/60 px-4 mb-1">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/adminsupport'}
                  >
                    <Link
                      href="/adminsupport"
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                        pathname === '/adminsupport'
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
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                        pathname === '/monitoring'
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
                    isActive={pathname === '/send-notification'}
                  >
                    <Link
                      href="/send-notification"
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                        pathname === '/send-notification'
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

      {/* Footer */}
      <SidebarFooter className="px-4 py-3 border-t border-border/40">
        <div className="flex items-center gap-2 rounded-xl bg-accent/50 px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground">
            All systems online
          </span>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
