import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

export type IconTone = 'indigo' | 'blue' | 'pink' | 'emerald' | 'amber' | 'sky';

const iconToneClasses: Record<IconTone, string> = {
  indigo: 'bg-preview text-preview ring-[var(--border-preview)]',
  blue: 'bg-info text-info ring-[var(--border-info)]',
  pink: 'bg-preview text-preview ring-[var(--border-preview)]',
  emerald: 'bg-success text-success ring-[var(--border-success)]',
  amber: 'bg-warning text-warning ring-[var(--border-warning)]',
  sky: 'bg-info text-info ring-[var(--border-info)]',
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
        maxWidthClasses[maxWidth]
      )}
    >
      <header className="legal-page-header mb-10">
        <div
          className={cn(
            'legal-page-icon ring-1 ring-inset',
            iconToneClasses[iconTone]
          )}
        >
          <Icon className="h-8 w-8" aria-hidden />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tertiary">
          {badge}
        </p>
        <h1 className="text-page-title text-black mt-3 font-[family-name:var(--font-sora)]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-secondary">
            {subtitle}
          </p>
        ) : null}
      </header>

      <div className="space-y-6">{children}</div>

      {showContact ? (
        <div className="legal-contact-strip mt-8">
          <div>
            <p className="text-sm font-semibold text-default">
              Questions about this document?
            </p>
            <p className="mt-1 text-sm text-secondary">
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
