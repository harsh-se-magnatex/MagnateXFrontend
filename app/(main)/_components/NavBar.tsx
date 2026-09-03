'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { handleSameHashLinkClick } from '@/lib/scroll-to-hash';
import { GuestAuthLink } from '@/components/auth/GuestAuthLink';
import { useServerSession } from '@/hooks/useServerSession';
import { lockBodyScroll } from '@/lib/body-scroll-lock';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Try it', href: '/try-it' },
  { label: 'How It Works', href: '/product#how-it-works' },
  { label: 'Features', href: '/product#features' },
  { label: 'How It Looks', href: '/how-it-looks' },
  { label: 'Pricing', href: '/product#pricing' },
  { label: 'FAQ', href: '/product#faq' },
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
  const hasSession = useServerSession();
  const signedIn = hasSession === true;
  const pathname = usePathname();
  const [hash, setHash] = useState('');

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener('hashchange', updateHash);

    return () => window.removeEventListener('hashchange', updateHash);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    return lockBodyScroll();
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

      <header className="fixed top-0 z-50 w-full border-b border-default bg-[color-mix(in_srgb,var(--bg-screen)_85%,transparent)] backdrop-blur-2xl">
        <nav className="relative mx-auto flex h-16 w-full max-w-[1328px] items-center justify-between gap-4 px-6">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 sm:gap-3 group"
            onClick={closeMobileNav}
          >
            <img
              src="/logo.png"
              alt="SocioGenie"
              className="h-10 w-10 shrink-0 rounded-xl transition-expo sm:h-12 sm:w-12"
            />
            <span className="truncate text-2xl font-semibold tracking-[-0.04em] text-default sm:text-[1.75rem]">
              Socio
              <span className="brand-wordmark-glow bg-gradient-primary-text">
                Genie
              </span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map((item) => {
              const href = navItemHref(item.href, isAuthRender);
              const [itemPath, itemHash] = href.split('#');
              const isActive =
                pathname === itemPath && (!itemHash || hash === `#${itemHash}`);
              return (
                <a
                  key={item.href}
                  href={href}
                  onClick={(event) => handleSameHashLinkClick(event, href)}
                  className={cn(
                    'relative flex h-9 items-center rounded-full px-3 text-sm font-medium text-secondary transition-expo hover:bg-element hover:text-default',
                    isActive &&
                      'after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:rounded-full after:bg-gradient-to-r after:from-pink-500 after:to-blue-500'
                  )}
                >
                  {item.label}
                </a>
              );
            })}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <>
              <GuestAuthLink
                href={signedIn ? '/home' : '/sign-in'}
                className="flex h-9 items-center rounded-full px-4 text-sm font-medium text-secondary transition-expo hover:bg-element hover:text-default"
                onClick={closeMobileNav}
              >
                Login
              </GuestAuthLink>
              <GuestAuthLink
                href={signedIn ? '/home' : '/sign-up'}
                className="btn-brand-fill group inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium"
                onClick={closeMobileNav}
              >
                <span className="relative z-10 flex items-center">
                  Try it free
                  <ArrowRight className="ml-2 h-4 w-4 transition-expo-transform group-hover:translate-x-0.5" />
                </span>
              </GuestAuthLink>
            </>
          </div>
          <button
            type="button"
            className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-default bg-transparent text-default transition-expo hover:bg-element md:hidden"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav-menu"
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            <span
              aria-hidden
              className={cn(
                'absolute left-1/2 top-[13px] block h-0.5 w-[22px] -translate-x-1/2 rounded-full bg-current transition-expo ease-[cubic-bezier(0.4,0,0.2,1)]',
                mobileNavOpen && 'top-1/2/2 rotate-45'
              )}
            />
            <span
              aria-hidden
              className={cn(
                'absolute left-1/2 top-1/2 block h-0.5 w-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-current transition-expo ease-[cubic-bezier(0.4,0,0.2,1)]',
                mobileNavOpen && 'scale-x-0 opacity-0'
              )}
            />
            <span
              aria-hidden
              className={cn(
                'absolute bottom-[13px] left-1/2 block h-0.5 w-[22px] -translate-x-1/2 rounded-full bg-current transition-expo ease-[cubic-bezier(0.4,0,0.2,1)]',
                mobileNavOpen && 'bottom-1/2/2 -rotate-45'
              )}
            />
          </button>
        </nav>

        <div
          id="mobile-nav-menu"
          className={cn(
            'overflow-hidden border-t border-default bg-background/98 backdrop-blur-2xl shadow-[0_18px_40px_-12px_rgba(0,0,0,0.18)] transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] md:hidden',
            mobileNavOpen
              ? 'max-h-[min(85vh,560px)] opacity-100'
              : 'pointer-events-none max-h-0 border-t-transparent opacity-0'
          )}
          aria-hidden={!mobileNavOpen}
        >
          <div className="flex max-h-[min(85vh,560px)] flex-col gap-1 overflow-y-auto px-4 py-4 pb-6">
            <p className="px-4 pb-2 text-eyebrow">Navigate</p>
            {NAV_ITEMS.map((item) => {
              const href = navItemHref(item.href, isAuthRender);
              return (
                <a
                  key={item.href}
                  href={href}
                  className="rounded-full px-4 py-3 text-base font-medium text-secondary transition-expo hover:bg-element hover:text-default"
                  onClick={(event) => {
                    handleSameHashLinkClick(event, href);
                    closeMobileNav();
                  }}
                >
                  {item.label}
                </a>
              );
            })}
            <div className="mt-4 flex flex-col gap-2 border-t border-default pt-4">
              <p className="px-4 pb-2 text-eyebrow">Account</p>
              {signedIn ? (
                <Link
                  href="/home"
                  className="group relative flex items-center justify-center overflow-hidden rounded-full btn-brand-fill px-4 py-3.5 text-base font-bold transition-expo"
                  onClick={closeMobileNav}
                >
                  <span className="relative z-10 flex items-center">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              ) : (
                <>
                  <GuestAuthLink
                    href="/sign-in"
                    className="rounded-full border border-default bg-transparent px-4 py-3 text-center text-base font-medium text-default transition-expo hover:bg-element"
                    onClick={closeMobileNav}
                  >
                    Login
                  </GuestAuthLink>
                  <GuestAuthLink
                    href="/sign-up"
                    className="btn-brand-fill group flex items-center justify-center rounded-full px-4 py-3.5 text-base font-medium"
                    onClick={closeMobileNav}
                  >
                    <span className="relative z-10 flex items-center">
                      Try it free
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </GuestAuthLink>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
