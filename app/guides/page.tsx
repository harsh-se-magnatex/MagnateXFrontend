import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import NavBar from '@/app/(main)/_components/NavBar';
import { Footer } from '@/components/shared/Footer';
import { clusterGuides, pillarGuides, SITE_URL } from '@/lib/guides';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';

const TITLE = 'Social Media Marketing Guides | SocioGenie';
const DESCRIPTION =
  'Practical guides on AI social media marketing and social media marketing for growing businesses: costs, tools, calendars and real examples.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/guides` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/guides`,
    siteName: 'SocioGenie',
    type: 'website',
  },
};

const CLUSTERS = [
  { id: 'ai', title: 'AI social media marketing' },
  { id: 'smm', title: 'Social media marketing' },
] as const;

/** The hub: both pillar guides up top, then every guide by cluster. */
export default function GuidesPage() {
  const pillars = pillarGuides();
  const guides = clusterGuides();

  return (
    <div className="min-h-screen bg-screen">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Guides', path: '/guides' },
        ])}
      />
      <NavBar />

      <main className="pb-24 pt-28 sm:pt-32">
        <div className="expo-container">
          <header className="max-w-2xl">
            <p className="text-eyebrow text-[var(--brand-violet-text)]">
              Guides
            </p>
            <h1 className="mt-4 text-display-2 text-default">
              Social media marketing,{' '}
              <span className="text-gradient-brand">explained plainly.</span>
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-secondary sm:text-base">
              Honest, practical guides for growing businesses — what to post,
              what it costs, and where AI helps.
            </p>
          </header>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {pillars.map((p) => (
              <Link
                key={p.slug}
                href={p.path}
                className="brand-card group flex flex-col p-6 sm:p-8"
              >
                <span className="text-eyebrow text-[var(--brand-violet-text)]">
                  The complete guide · {p.readingMinutes} min
                </span>
                <span className="mt-3 text-display-4 text-default">
                  {p.title}
                </span>
                <span className="mt-3 text-sm leading-relaxed text-secondary">
                  {p.description}
                </span>
                <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-violet-text)]">
                  Read the guide
                  <ArrowRight className="size-4 transition-expo-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>

          {CLUSTERS.map((cluster) => {
            const items = guides.filter((g) => g.pillar === cluster.id);
            if (items.length === 0) return null;
            return (
              <section key={cluster.id} className="mt-16">
                <h2 className="text-eyebrow">{cluster.title}</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((g) => (
                    <Link
                      key={g.slug}
                      href={g.path}
                      className="group flex flex-col rounded-2xl border border-default bg-default p-5 transition-expo hover:border-[var(--border-strong)]"
                    >
                      <span className="text-subsection text-default">
                        {g.title}
                      </span>
                      <span className="mt-2 line-clamp-2 text-sm text-secondary">
                        {g.description}
                      </span>
                      <span className="mt-4 text-xs text-tertiary">
                        {g.readingMinutes} min read
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
