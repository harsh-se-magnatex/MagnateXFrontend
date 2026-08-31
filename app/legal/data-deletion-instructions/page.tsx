import Link from 'next/link';
import { ArrowRight, Facebook, Instagram, Trash2 } from 'lucide-react';
import { LegalPage } from '../_components/legal-page';

type PlatformCard = {
  platform: 'Facebook' | 'Instagram';
  href: string;
  description: string;
  icon: typeof Facebook;
  tone: {
    border: string;
    shadow: string;
    iconWrap: string;
    iconText: string;
    cta: string;
    hoverShadow: string;
  };
};

const PLATFORM_CARDS: readonly PlatformCard[] = [
  {
    platform: 'Facebook',
    href: '/legal/facebook-data-deletion-instruction',
    description:
      'Remove the Facebook data SocioGenie stores for your account — access tokens, connected Page details, and Facebook analytics.',
    icon: Facebook,
    tone: {
      border: 'border-info',
      shadow: 'shadow-[0_24px_64px_-32px_rgba(37,99,235,0.18)]',
      hoverShadow: 'hover:shadow-[0_28px_72px_-24px_rgba(37,99,235,0.32)]',
      iconWrap: 'border-info bg-info',
      iconText: 'text-info',
      cta: 'text-info group-hover:text-info',
    },
  },
  {
    platform: 'Instagram',
    href: '/legal/instagram-data-deletion-instruction',
    description:
      'Remove the Instagram Business data SocioGenie stores — connection tokens, profile metadata, and Instagram insights.',
    icon: Instagram,
    tone: {
      border: 'border-preview',
      shadow: 'shadow-[0_24px_64px_-32px_rgba(219,39,119,0.18)]',
      hoverShadow: 'hover:shadow-[0_28px_72px_-24px_rgba(219,39,119,0.32)]',
      iconWrap: 'border-preview bg-preview',
      iconText: 'text-preview',
      cta: 'text-preview group-hover:text-preview',
    },
  },
] as const;

export default function DataDeletionInstructionsPage() {
  return (
    <LegalPage
      title="Data Deletion Instructions"
      subtitle="Pick the platform you'd like to remove data for. We'll walk you through the steps."
      badge="Data deletion"
      icon={Trash2}
      iconTone="indigo"
    >
      <p className="text-base leading-relaxed text-secondary">
        <strong className="text-default">SocioGenie</strong> (operated by{' '}
        <strong className="text-default">MAGNATEX LLP</strong>) lets you connect
        external social accounts to publish and manage content. Use the options
        below to view the deletion instructions for the platform whose data you
        want removed.
      </p>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
        {PLATFORM_CARDS.map(
          ({ platform, href, description, icon: Icon, tone }) => (
            <Link
              key={platform}
              href={href}
              aria-label={`Open ${platform} data deletion instructions`}
              className={[
                'group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border bg-default p-6 transition-expo sm:p-8',
                tone.border,
                tone.shadow,
                tone.hoverShadow,
              ].join(' ')}
            >
              <div
                className={[
                  'inline-flex h-14 w-14 items-center justify-center rounded-2xl border',
                  tone.iconWrap,
                  tone.iconText,
                ].join(' ')}
              >
                <Icon className="h-7 w-7" aria-hidden />
              </div>
              <h2 className="text-section text-default mt-5 font-[family-name:var(--font-sora)]">
                {platform}
              </h2>
              <p className="mt-2 flex-1 text-pretty text-sm leading-relaxed text-secondary sm:text-base">
                {description}
              </p>
              <span
                className={[
                  'mt-6 inline-flex items-center gap-1.5 text-sm font-semibold transition-expo',
                  tone.cta,
                ].join(' ')}
              >
                View {platform} instructions
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  aria-hidden
                />
              </span>
            </Link>
          )
        )}
      </div>

      <p className="text-sm leading-relaxed text-secondary">
        Need a different deletion request or have a question about either
        platform? Email{' '}
        <a
          href="mailto:founder@magnatex.co"
          className="font-medium text-default underline decoration-slate-300 underline-offset-4 hover:text-default hover:decoration-slate-500"
        >
          founder@magnatex.co
        </a>
        .
      </p>
    </LegalPage>
  );
}
