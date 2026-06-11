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
    <div className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-indigo-200 hover:text-indigo-700"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            Back
          </button>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:border-indigo-200 hover:text-indigo-700"
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
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all',
                  active
                    ? 'border-indigo-300 bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700',
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
