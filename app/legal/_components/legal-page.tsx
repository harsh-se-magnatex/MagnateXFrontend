import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

export type IconTone = 'indigo' | 'blue' | 'pink' | 'emerald' | 'amber' | 'sky';

const iconToneClasses: Record<IconTone, string> = {
  indigo: 'bg-indigo-500/10 text-indigo-600 ring-indigo-500/15',
  blue: 'bg-blue-500/10 text-blue-600 ring-blue-500/15',
  pink: 'bg-pink-500/10 text-pink-600 ring-pink-500/15',
  emerald: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/15',
  amber: 'bg-amber-500/10 text-amber-600 ring-amber-500/15',
  sky: 'bg-sky-500/10 text-sky-600 ring-sky-500/15',
};

type LegalPageProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  icon: LucideIcon;
  iconTone?: IconTone;
  maxWidth?: 'lg' | 'xl';
  showContact?: boolean;
  children: React.ReactNode;
};

const maxWidthClasses = {
  lg: 'max-w-4xl',
  xl: 'max-w-5xl',
};

export function LegalPage({
  title,
  subtitle,
  badge = 'Legal document',
  icon: Icon,
  iconTone = 'indigo',
  maxWidth = 'lg',
  showContact = true,
  children,
}: LegalPageProps) {
  return (
    <article
      className={cn(
        'legal-page mx-auto px-4 pb-24 pt-6 sm:px-6',
        maxWidthClasses[maxWidth],
      )}
    >
      <header className="legal-page-header mb-10">
        <div
          className={cn(
            'legal-page-icon ring-1 ring-inset',
            iconToneClasses[iconTone],
          )}
        >
          <Icon className="h-8 w-8" aria-hidden />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
          {badge}
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-sora)] text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-500">
            {subtitle}
          </p>
        ) : null}
      </header>

      <div className="space-y-6">{children}</div>

      {showContact ? (
        <div className="legal-contact-strip mt-8">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Questions about this document?
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Our team can help with privacy, legal, or compliance requests.
            </p>
          </div>
          <Link href="mailto:founder@magnatex.co">
            <Mail className="h-4 w-4" aria-hidden />
            founder@magnatex.co
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export function LegalDocument({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('legal-document', className)}>
      <div className="legal-prose">{children}</div>
    </div>
  );
}

export function LegalPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('legal-panel', className)}>{children}</div>;
}

export function LegalAccordion({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('legal-accordion', className)}>{children}</div>;
}

export function LegalCallout({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('legal-callout', className)}>
      {title ? <p className="mb-2 font-semibold">{title}</p> : null}
      {children}
    </div>
  );
}
