import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Sparkles } from 'lucide-react';
import NavBar from './(main)/_components/NavBar';
import { GuestAuthLink } from '@/components/auth/GuestAuthLink';
import { LandingAgents, LandingClose } from '@/components/landing/landing-agents';
import {
  AiManagerLoop,
  LandingAgencyCost,
  LandingAiManager,
  LandingGuides,
  LandingMarketingVisuals,
  LandingMarquees,
  LandingOfficialApis,
  LandingPositioning,
  LandingStatementMarquees,
} from '@/components/landing/landing-home-sections';
import { RotatingWords } from '@/components/landing/motion/rotating-words';
import '@/components/landing/landing.css';
import { JsonLd, SOFTWARE_APPLICATION_JSON_LD } from '@/lib/seo';

/** The three platforms, said out loud. A social product should show which
 *  networks it posts to above the fold, not three sections down. */
const PLATFORMS = [
  { name: 'Instagram', accent: 'var(--brand-pink)' },
  { name: 'Facebook', accent: 'var(--brand-sky)' },
  { name: 'LinkedIn', accent: 'var(--brand-cyan)' },
];

/** The hero's rotating slot: growing-business types that exist in every
 *  market. Each takes its own accent from the sweep. The first one is what
 *  the server renders, so it is the H1 crawlers read. */
const SEGMENTS = [
  'boutique',
  'jewelry store',
  'salon',
  'café',
  'D2C brand',
  'real estate agency',
];
const SEGMENT_COLORS = [
  'var(--brand-pink-text)',
  'var(--brand-orchid-text)',
  'var(--brand-sky-text)',
  'var(--brand-amber-text)',
  'var(--brand-cyan-text)',
  'var(--brand-coral-text)',
];

/** Explicit and self-referencing, rather than relying on inheriting the
 *  root layout's defaults — keeps this page correct even if those change. */
const HOME_TITLE = 'AI Social Media Manager for Growing Businesses | SocioGenie';
const HOME_DESCRIPTION =
  'SocioGenie plans, designs and publishes Instagram, Facebook & LinkedIn posts for growing businesses — no agency needed. From $14.99/month.';

/** The share image comes from `app/opengraph-image.tsx`; no `images` here,
 *  or it would override the generated one. */
export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: 'https://www.sociogenie.ai/',
  },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    siteName: 'SocioGenie',
    url: 'https://www.sociogenie.ai/',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

/**
 * The landing page is static — no scroll-scrubbed frame sequence, no fixed
 * panel driven by a 624vh spacer. It is a hero, then sections, stacked.
 *
 * Colour, on the other hand, is doing real work here. The dashboard's rule —
 * neutral surfaces, hue reserved for status — is right for a workspace and
 * wrong for a front door: this product's promise is that it makes colourful
 * things, and a landing page in greyscale quietly argues the opposite. So the
 * marketing surfaces run the brand sweep across headline phrases, the CTA,
 * the feature chips and a set of very low ambient washes.
 *
 * Motion is typographic and small: one rotating word slot per headline,
 * two CSS marquees, and a staggered entrance. No scroll hijacking, no
 * streamed frames, and all of it stands still under reduced motion. The
 * page reads in the order the SEO plan ranks it: agency cost, the AI
 * Manager moat, marketing visuals, then official-API trust.
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-screen">
      <JsonLd data={SOFTWARE_APPLICATION_JSON_LD} />
      <NavBar />

      <main>
        <section className="brand-wash-hero expo-hero pt-32 sm:pt-40">
          <div className="expo-container text-center">
            <p className="brand-pill landing-rise">
              <Sparkles className="size-3.5" aria-hidden />
              AI social media manager
            </p>

            {/* The rotating slot sits on its own line, so as its width eases
                between words only that line re-centres — the rest of the
                headline never moves. */}
            <h1 className="mx-auto mt-8 max-w-4xl text-display-1 text-default">
              <span className="landing-rise landing-rise--no-fade block" style={{ '--rise-delay': '80ms' } as React.CSSProperties}>
                Social media for your
              </span>
              <span className="landing-rise landing-rise--no-fade block" style={{ '--rise-delay': '160ms' } as React.CSSProperties}>
                <RotatingWords words={SEGMENTS} colors={SEGMENT_COLORS} />,
              </span>
              <span className="landing-rise landing-rise--no-fade block" style={{ '--rise-delay': '240ms' } as React.CSSProperties}>
                <span className="text-gradient-brand">handled without an agency.</span>
              </span>
            </h1>

          </div>

          {/* The "why" bands sit between the headline and the CTAs, outside
              the container so they run edge to edge. */}
          <div
            className="landing-rise landing-rise--no-fade mt-12"
            style={{ '--rise-delay': '320ms' } as React.CSSProperties}
          >
            <LandingStatementMarquees />
          </div>

          <div className="expo-container text-center">
            <div
              className="landing-rise mt-10 flex flex-wrap items-center justify-center gap-3"
              style={{ '--rise-delay': '400ms' } as React.CSSProperties}
            >
              <GuestAuthLink href="/sign-up" className="btn-brand group">
                Get started
                <ArrowRight className="size-4 transition-expo-transform group-hover:translate-x-0.5" />
              </GuestAuthLink>
              <Link href="#agency-cost" className="landing-btn-secondary">
                Compare with an agency
              </Link>
            </div>

            <AiManagerLoop />

            {/* Platform row. Each network takes an accent from the sweep, so
                the first colourful thing on the page is also the most
                informative one. */}
            <ul className="mt-12 flex flex-wrap items-center justify-center gap-2.5">
              {PLATFORMS.map((platform) => (
                <li
                  key={platform.name}
                  className="inline-flex h-8 items-center gap-2 rounded-full border border-default bg-element px-3.5 text-sm font-medium text-secondary"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ background: platform.accent }}
                    aria-hidden
                  />
                  {platform.name}
                </li>
              ))}
            </ul>

            <Link
              href="#official-api"
              className="mt-5 inline-flex items-center gap-1.5 text-sm text-tertiary transition-expo hover:text-secondary"
            >
              <BadgeCheck className="size-4 text-[var(--brand-sky-text)]" aria-hidden />
              Publishes through the official Meta &amp; LinkedIn APIs
            </Link>

            <p className="mt-6 text-sm text-tertiary">
              Setup in under 10 minutes · Cancel anytime
            </p>
          </div>
        </section>

        <LandingPositioning />
        <LandingMarquees />
        <LandingAgencyCost />
        <LandingAiManager />
        <LandingMarketingVisuals />
        <LandingOfficialApis />
        <LandingAgents />
        <LandingGuides />
        <LandingClose />
      </main>
    </div>
  );
}
