'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const LEGAL_LINKS = [
  { label: 'Privacy', href: '/legal/privacy' },
  { label: 'Terms', href: '/legal/terms' },
  { label: 'Refund', href: '/legal/refund' },
  { label: 'Cookies', href: '/legal/cookie' },
  { label: 'Acceptable Use', href: '/legal/acceptable-use' },
  { label: 'AI Disclosure', href: '/legal/ai-disclosure' },
  { label: 'Sub-processors', href: '/legal/sub-processors' },
  { label: 'Licenses', href: '/legal/licenses' },
] as const;

export function LegalBackNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-40 border-b border-default bg-default backdrop-blur-xl">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-full border border-default bg-default px-3.5 py-1.5 text-sm font-medium text-secondary transition-expo hover:border-preview hover:text-preview"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            Back
          </button>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-default bg-default px-3.5 py-1.5 text-sm font-semibold text-default transition-expo hover:border-preview hover:text-preview"
          >
            <img src="/logo.png" alt="" className="h-5 w-5 rounded-md" />
            SocioGenie
          </Link>
        </div>

        <nav
          aria-label="Legal documents"
          className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {LEGAL_LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-expo',
                  active
                    ? 'border-preview bg-[var(--purple-9)] text-white'
                    : 'border-default bg-default text-secondary hover:border-preview hover:bg-preview hover:text-preview'
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
