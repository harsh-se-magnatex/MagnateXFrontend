import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import NavBar from '@/app/(main)/_components/NavBar';
import { GuestAuthLink } from '@/components/auth/GuestAuthLink';
import { Footer } from '@/components/shared/Footer';
import { SITE_URL } from '@/lib/guides';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';

const TITLE = 'About SocioGenie | AI Social Media Software';
const DESCRIPTION =
  'SocioGenie is AI social media software for growing businesses, built by MAGNATEX LLP in Ahmedabad, India. Launched July 2026.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/about`,
    siteName: 'SocioGenie',
    type: 'website',
  },
};

const FACTS = [
  { label: 'Product', value: 'SocioGenie (sociogenie.ai)' },
  { label: 'Company', value: 'MAGNATEX LLP · LLPIN ACU-5689' },
  { label: 'Based in', value: 'Ahmedabad, Gujarat, India' },
  { label: 'Launched', value: '28 July 2026' },
  { label: 'Serves', value: 'Growing businesses worldwide' },
  {
    label: 'Publishes to',
    value: 'Instagram, Facebook, LinkedIn — via official APIs',
  },
];

/** Who is behind SocioGenie: the trust page guides link their byline to. */
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-screen">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ])}
      />
      <NavBar />

      <main className="pb-24 pt-28 sm:pt-32">
        <div className="expo-container">
          <div className="max-w-3xl">
            <p className="text-eyebrow text-[var(--brand-violet-text)]">
              About
            </p>
            <h1 className="mt-4 text-display-2 text-default">
              Social media that runs itself,{' '}
              <span className="text-gradient-brand">
                for businesses that are growing.
              </span>
            </h1>

            <div className="mt-8 space-y-5 text-base leading-relaxed text-secondary">
              <p>
                Most growing businesses have plenty to post about — new
                products, offers, festivals, happy customers. What they lack is
                the time to turn all of it into consistent social media.
                SocioGenie exists to close that gap.
              </p>
              <p>
                It learns a business first — its website, products, brand colors
                and existing designs — then plans the month, creates each post
                and publishes it to Instagram, Facebook and LinkedIn through the
                official platform APIs. On AI Manager plans, every calendar post
                is reviewed before it goes out: by the business itself, or by
                our in-house team.
              </p>
              <p>
                SocioGenie is built by MAGNATEX LLP in Ahmedabad, India, and
                launched on 28 July 2026. Our guides share what we learn
                building it, written plainly and kept up to date.
              </p>
            </div>

            <dl className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-default bg-[var(--border-default)] sm:grid-cols-2">
              {FACTS.map((fact) => (
                <div key={fact.label} className="bg-default p-5">
                  <dt className="text-eyebrow">{fact.label}</dt>
                  <dd className="mt-2 text-sm text-default">{fact.value}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-8 text-sm text-secondary">
              Contact:{' '}
              <a
                href="mailto:founder@magnatex.co"
                className="text-[var(--brand-violet-text)] hover:underline"
              >
                founder@magnatex.co
              </a>
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <GuestAuthLink href="/sign-up" className="btn-brand group">
                Get started
                <ArrowRight className="size-4 transition-expo-transform group-hover:translate-x-0.5" />
              </GuestAuthLink>
              <Link href="/guides" className="landing-btn-secondary">
                Read our guides
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
