import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronRight, Plus } from 'lucide-react';
import NavBar from '@/app/(main)/_components/NavBar';
import { GuestAuthLink } from '@/components/auth/GuestAuthLink';
import { Footer } from '@/components/shared/Footer';
import { relatedGuides, type Guide } from '@/lib/guides';
import { parseMarkdownBlocks, renderMarkdownBlocks } from '@/lib/markdown';
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd, JsonLd } from '@/lib/seo';
import './guide.css';

/** Real output for the demo brand, dropped in wherever a guide says
 *  `::examples`. Evidence beats adjectives on an AI-marketing page. */
const EXAMPLES = [
  {
    src: '/showcase/jewelry/visual-billboard.webp',
    label: 'Marketing visual · Billboard',
  },
  { src: '/showcase/jewelry/create-post-1.webp', label: 'Create Post' },
  { src: '/showcase/jewelry/product-advert.webp', label: 'Product advert' },
  { src: '/showcase/jewelry/carousel-gold-1.webp', label: 'Carousel' },
  {
    src: '/showcase/jewelry/visual-storefront.webp',
    label: 'Marketing visual · Storefront',
  },
  { src: '/showcase/jewelry/create-post-2.webp', label: 'Create Post' },
];

function ExamplesGrid() {
  return (
    <aside className="my-10 rounded-3xl border border-default bg-default p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {EXAMPLES.map((ex) => (
          <figure
            key={ex.src}
            className="relative aspect-[4/5] overflow-hidden rounded-xl border border-default"
          >
            <Image
              src={ex.src}
              alt={`${ex.label} made by SocioGenie for a demo jewelry brand`}
              fill
              sizes="(min-width: 640px) 240px, 45vw"
              className="object-cover"
            />
            <figcaption className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
              {ex.label}
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-3 text-sm text-tertiary">
        Real SocioGenie output for SocioGenie.Jewel, a demo brand.{' '}
        <Link
          href="/how-it-looks"
          className="font-medium text-[var(--brand-violet-text)] hover:underline"
        >
          See all 218 examples
        </Link>
      </p>
    </aside>
  );
}

function formatDate(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      });
}

/**
 * One template for pillars and cluster guides: breadcrumb, H1, the short
 * answer block (what AI assistants quote), table of contents, body, a CTA,
 * FAQ, related guides — plus Article, FAQPage and BreadcrumbList schema.
 */
export function GuideArticle({ guide }: { guide: Guide }) {
  const crumbs =
    guide.kind === 'pillar'
      ? [
          { name: 'Home', path: '/' },
          { name: guide.title, path: guide.path },
        ]
      : [
          { name: 'Home', path: '/' },
          { name: 'Guides', path: '/guides' },
          { name: guide.title, path: guide.path },
        ];
  const related = relatedGuides(guide);
  const blocks = parseMarkdownBlocks(guide.body);

  return (
    <div className="min-h-screen bg-screen">
      <JsonLd data={articleJsonLd(guide)} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      {guide.faq.length > 0 ? <JsonLd data={faqJsonLd(guide.faq)} /> : null}
      <NavBar />

      <main className="pb-24 pt-28 sm:pt-32">
        <article className="expo-container">
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex flex-wrap items-center gap-1 text-sm text-tertiary">
              {crumbs.map((crumb, i) => (
                <li key={crumb.path} className="flex items-center gap-1">
                  {i > 0 ? (
                    <ChevronRight className="size-3.5" aria-hidden />
                  ) : null}
                  {i < crumbs.length - 1 ? (
                    <Link
                      href={crumb.path}
                      className="transition-expo hover:text-default"
                    >
                      {crumb.name}
                    </Link>
                  ) : (
                    <span
                      className="line-clamp-1 text-secondary"
                      aria-current="page"
                    >
                      {crumb.name}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          <header className="max-w-3xl">
            <p className="text-eyebrow text-[var(--brand-violet-text)]">
              {guide.kind === 'pillar' ? 'The complete guide' : 'Guide'}
            </p>
            <h1 className="mt-4 text-display-2 text-default">{guide.title}</h1>
            <p className="mt-4 text-sm text-tertiary">
              By the{' '}
              <Link
                href="/about"
                className="hover:text-default hover:underline"
              >
                SocioGenie team
              </Link>{' '}
              · Updated{' '}
              <time dateTime={guide.updated}>{formatDate(guide.updated)}</time>{' '}
              · {guide.readingMinutes} min read
            </p>
            {guide.answer ? (
              <div className="mt-8 rounded-2xl border border-[color-mix(in_srgb,var(--brand-violet)_35%,var(--border-default))] bg-[color-mix(in_srgb,var(--brand-violet)_7%,var(--bg-default))] p-5 sm:p-6">
                <p className="text-eyebrow text-[var(--brand-violet-text)]">
                  Short answer
                </p>
                <p className="mt-2 text-base leading-relaxed text-default sm:text-lg">
                  {guide.answer}
                </p>
              </div>
            ) : null}
          </header>

          <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div className="max-w-3xl">
              {guide.toc.length > 2 ? (
                <nav
                  aria-label="On this page"
                  className="mb-10 rounded-2xl border border-default bg-default p-5 lg:hidden"
                >
                  <p className="text-eyebrow">On this page</p>
                  <ol className="mt-3 space-y-1.5 text-sm">
                    {guide.toc.map((item) => (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          className="text-secondary transition-expo hover:text-default"
                        >
                          {item.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              ) : null}

              <div className="guide-prose">
                {renderMarkdownBlocks(blocks, {
                  headingIds: true,
                  tableWrapClassName: 'guide-table-wrap',
                  examples: <ExamplesGrid />,
                })}
              </div>

              <section className="mt-14 rounded-3xl border border-default bg-default p-6 sm:p-8">
                <h2 className="text-display-4 text-default">
                  Let SocioGenie run your social media
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-secondary">
                  AI Manager plans your month, creates every post and publishes
                  it at your best hour. Studio from $14.99 a month; AI Manager
                  from $49.99.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <GuestAuthLink href="/sign-up" className="btn-brand group">
                    Get started
                    <ArrowRight className="size-4 transition-expo-transform group-hover:translate-x-0.5" />
                  </GuestAuthLink>
                  <Link href="/how-it-looks" className="landing-btn-secondary">
                    See real examples
                  </Link>
                </div>
              </section>

              {guide.faq.length > 0 ? (
                <section
                  className="guide-faq mt-14"
                  aria-labelledby="faq-heading"
                >
                  <h2 id="faq-heading" className="text-display-4 text-default">
                    Frequently asked questions
                  </h2>
                  <div className="mt-5 divide-y divide-[var(--border-default)] rounded-2xl border border-default bg-default">
                    {guide.faq.map((item) => (
                      <details key={item.question} className="group px-5 py-4">
                        <summary className="flex items-start justify-between gap-4 text-base font-medium text-default">
                          {item.question}
                          <Plus
                            className="guide-faq-icon mt-1 size-4 shrink-0 text-tertiary"
                            aria-hidden
                          />
                        </summary>
                        <div className="guide-prose mt-3 text-[0.9375rem]">
                          {renderMarkdownBlocks(
                            parseMarkdownBlocks(item.answer)
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            {guide.toc.length > 2 ? (
              <aside className="hidden lg:block">
                <nav aria-label="On this page" className="sticky top-28">
                  <p className="text-eyebrow">On this page</p>
                  <ol className="mt-3 space-y-2 border-l border-default text-sm">
                    {guide.toc.map((item) => (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          className="-ml-px block border-l border-transparent pl-3 text-tertiary transition-expo hover:border-[var(--border-strong)] hover:text-default"
                        >
                          {item.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              </aside>
            ) : null}
          </div>

          {related.length > 0 ? (
            <section className="mt-20" aria-labelledby="related-heading">
              <h2 id="related-heading" className="text-eyebrow">
                Keep reading
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {related.map((g) => (
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
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-violet-text)]">
                      Read guide
                      <ArrowRight className="size-3.5 transition-expo-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </article>
      </main>

      <Footer />
    </div>
  );
}
