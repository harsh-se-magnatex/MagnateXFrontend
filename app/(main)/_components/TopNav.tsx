'use client';

import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brain, Fingerprint, Home, MessageSquare, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';

const topNav = [
  { name: 'Home', href: '/home', icon: Home },
  { name: 'Contact Us', href: '/contact-us', icon: MessageSquare },
  { name: 'AI Engine', href: '/ai-engine', icon: Brain },
  { name: 'Brand DNA', href: '/template-dna', icon: Fingerprint },
] as const;



export function TopNav() {
  const pathname = usePathname();
  const { user, loading: authLoading, accountName } = useAuth();

  const displayName = useMemo(() => {
    const raw =
      accountName?.trim() ||
      user?.displayName?.trim() ||
      user?.email?.split('@')[0] ||
      (user?.phoneNumber
        ? `…${user.phoneNumber.replace(/\D/g, '').slice(-4)}`
        : '') ||
      'there';
    return raw;
  }, [user, accountName]);


  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="grid h-14 w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarInset className="bg-transparent">
            <div className="flex h-14 shrink-0 items-center">
              <SidebarTrigger className="text-muted-foreground transition-colors hover:text-foreground" />
            </div>
          </SidebarInset>
          {!authLoading && (
          <p className="min-w-0 sm:flex hidden truncate text-sm font-medium leading-none">
            <span className="text-muted-foreground">Hello,</span>
            <span className="font-semibold tracking-tight text-foreground">
            &nbsp; {displayName}
            </span>
          </p>
          )}
        </div>

        <nav className="flex items-center gap-1">
          {topNav.map((item) => {
            const isActive =
              item.href === '/template-dna'
                ? pathname?.startsWith('/template-dna')
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

        <div className="w-12 justify-self-end" aria-hidden />
      </div>
    </header>
  );
}
