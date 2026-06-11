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
      border: 'border-blue-200/80',
      shadow: 'shadow-[0_24px_64px_-32px_rgba(37,99,235,0.18)]',
      hoverShadow:
        'hover:shadow-[0_28px_72px_-24px_rgba(37,99,235,0.32)]',
      iconWrap: 'border-blue-100 bg-blue-50',
      iconText: 'text-blue-600',
      cta: 'text-blue-600 group-hover:text-blue-700',
    },
  },
  {
    platform: 'Instagram',
    href: '/legal/instagram-data-deletion-instruction',
    description:
      'Remove the Instagram Business data SocioGenie stores — connection tokens, profile metadata, and Instagram insights.',
    icon: Instagram,
    tone: {
      border: 'border-pink-200/80',
      shadow: 'shadow-[0_24px_64px_-32px_rgba(219,39,119,0.18)]',
      hoverShadow:
        'hover:shadow-[0_28px_72px_-24px_rgba(219,39,119,0.32)]',
      iconWrap: 'border-pink-100 bg-pink-50',
      iconText: 'text-pink-600',
      cta: 'text-pink-600 group-hover:text-pink-700',
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
      <p className="text-base leading-relaxed text-slate-600">
        <strong className="text-slate-900">SocioGenie</strong> (operated by{' '}
        <strong className="text-slate-900">MAGNATEX LLP</strong>) lets you
        connect external social accounts to publish and manage content. Use the
        options below to view the deletion instructions for the platform whose
        data you want removed.
      </p>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
        {PLATFORM_CARDS.map(({ platform, href, description, icon: Icon, tone }) => (
          <Link
            key={platform}
            href={href}
            aria-label={`Open ${platform} data deletion instructions`}
            className={[
              'group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border bg-white/95 p-6 transition-all duration-300 hover:-translate-y-0.5 sm:p-8',
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
            <h2 className="mt-5 font-[family-name:var(--font-sora)] text-xl font-bold text-slate-900 sm:text-2xl">
              {platform}
            </h2>
            <p className="mt-2 flex-1 text-pretty text-sm leading-relaxed text-slate-600 sm:text-base">
              {description}
            </p>
            <span
              className={[
                'mt-6 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors',
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
        ))}
      </div>

      <p className="text-sm leading-relaxed text-slate-500">
        Need a different deletion request or have a question about either
        platform? Email{' '}
        <a
          href="mailto:founder@magnatex.co"
          className="font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-900 hover:decoration-slate-500"
        >
          founder@magnatex.co
        </a>
        .
      </p>
    </LegalPage>
  );
}
