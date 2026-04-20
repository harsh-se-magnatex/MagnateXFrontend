'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '#faq' },
] as const;


function navItemHref(href: string, isAuthRender: boolean): string {
  if (!isAuthRender) return href;
  if (href.startsWith('#')) return `/${href}`;
  return href;
}

type NavBarProps = {
  isAuthRender?: boolean;
};

export default function NavBar({ isAuthRender = false }: NavBarProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className={cn(
          'fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px] transition-opacity duration-300 md:hidden',
          mobileNavOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        )}
        onClick={closeMobileNav}
        tabIndex={mobileNavOpen ? 0 : -1}
      />

      <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/70 backdrop-blur-2xl supports-backdrop-filter:bg-background/50">
        <nav className="relative mx-auto flex w-full items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 sm:gap-3 group"
            onClick={closeMobileNav}
          >
            <img
              src="/logo.png"
              alt="SocioGenie"
              className="h-10 w-10 shrink-0 rounded-xl shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300 sm:h-12 sm:w-12"
            />
            <span className="truncate text-xl font-extrabold tracking-tight bg-gradient-primary-text sm:text-2xl">
              SocioGenie
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={navItemHref(item.href, isAuthRender)}
                className="relative text-sm font-medium text-muted-foreground transition-colors hover:text-foreground after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-linear-to-r after:from-primary-blue after:to-primary-purple after:transition-all after:duration-300 hover:after:w-full"
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-foreground/70 transition-all hover:text-foreground hover:bg-accent/80 duration-200"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="group relative inline-flex items-center justify-center rounded-xl bg-gradient-primary px-6 py-2.5 text-sm font-bold text-white overflow-hidden transition-all hover:shadow-xl hover:shadow-primary-blue/25 active:scale-95 duration-300"
            >
              <span className="relative z-10 flex items-center">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 duration-200" />
              </span>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
            </Link>
          </div>
          <button
            type="button"
            className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/80 text-foreground shadow-sm transition-colors hover:bg-accent md:hidden"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav-menu"
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            <span
              aria-hidden
              className={cn(
                'absolute left-1/2 top-[13px] block h-0.5 w-[22px] -translate-x-1/2 rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                mobileNavOpen && 'top-1/2 -translate-y-1/2 rotate-45'
              )}
            />
            <span
              aria-hidden
              className={cn(
                'absolute left-1/2 top-1/2 block h-0.5 w-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                mobileNavOpen && 'scale-x-0 opacity-0'
              )}
            />
            <span
              aria-hidden
              className={cn(
                'absolute bottom-[13px] left-1/2 block h-0.5 w-[22px] -translate-x-1/2 rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                mobileNavOpen && 'bottom-1/2 translate-y-1/2 -rotate-45'
              )}
            />
          </button>
        </nav>

        <div
          id="mobile-nav-menu"
          className={cn(
            'overflow-hidden border-t border-border/40 bg-background/98 backdrop-blur-2xl shadow-[0_18px_40px_-12px_rgba(0,0,0,0.18)] transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden',
            mobileNavOpen
              ? 'max-h-[min(85vh,560px)] opacity-100'
              : 'pointer-events-none max-h-0 border-t-transparent opacity-0'
          )}
          aria-hidden={!mobileNavOpen}
        >
          <div className="flex max-h-[min(85vh,560px)] flex-col gap-1 overflow-y-auto px-4 py-4 pb-6">
            <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Navigate
            </p>
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={navItemHref(item.href, isAuthRender)}
                className="rounded-xl px-4 py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-accent/80 hover:text-foreground"
                onClick={closeMobileNav}
              >
                {item.label}
              </a>
            ))}
            <div className="mt-4 flex flex-col gap-2 border-t border-border/50 pt-4">
              <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Account
              </p>
              <Link
                href="/sign-in"
                className="rounded-xl border border-border/60 bg-card/50 px-4 py-3 text-center text-base font-semibold text-foreground transition-colors hover:bg-accent/80"
                onClick={closeMobileNav}
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="group relative flex items-center justify-center overflow-hidden rounded-xl bg-gradient-primary px-4 py-3.5 text-base font-bold text-white transition-all hover:shadow-lg hover:shadow-primary-blue/25 active:scale-[0.98]"
                onClick={closeMobileNav}
              >
                <span className="relative z-10 flex items-center">
                  Sign up free
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
              </Link>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
