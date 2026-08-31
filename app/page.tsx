import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import NavBar from './(main)/_components/NavBar';
import { GuestAuthLink } from '@/components/auth/GuestAuthLink';
import {
  LandingAgents,
  LandingAutomation,
  LandingChallenge,
  LandingClose,
} from '@/components/landing/landing-agents';
import '@/components/landing/landing.css';

/** The three platforms, said out loud. A social product should show which
 *  networks it posts to above the fold, not three sections down. */
const PLATFORMS = [
  { name: 'Instagram', accent: 'var(--brand-pink)' },
  { name: 'Facebook', accent: 'var(--brand-sky)' },
  { name: 'LinkedIn', accent: 'var(--brand-cyan)' },
];

/** Explicit and self-referencing, rather than relying on inheriting the
 *  root layout's defaults — keeps this page correct even if those change. */
export const metadata: Metadata = {
  title: 'Sociogenie – AI Social Media Management for Small Businesses',
  description:
    'Sociogenie helps small businesses automate social media with AI-generated, human-reviewed content for Instagram, Facebook, and LinkedIn. Setup in under 10 minutes.',
  alternates: {
    canonical: 'https://www.sociogenie.ai/',
  },
  openGraph: {
    title: 'Sociogenie – AI Social Media Management for Small Businesses',
    description:
      'AI-generated content, human-reviewed before publishing, posted automatically across Instagram, Facebook & LinkedIn.',
    siteName: 'SocioGenie',
    url: 'https://www.sociogenie.ai/',
    images: ['/logo.png'],
    type: 'website',
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
 * What did NOT come back: hover lifts, light sweeps, glass blur, scroll
 * hijacking, and 80 MB of streamed frames. The energy is in the palette, not
 * in movement — which is also why it stays fast.
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-screen">
      <NavBar />

      <main>
        <section className="brand-wash-hero expo-hero pt-32 sm:pt-40">
          <div className="expo-container text-center">
            <p className="brand-pill">
              <Sparkles className="size-3.5" aria-hidden />
              AI Social Growth Engine
            </p>

            <h1 className="mx-auto mt-8 max-w-4xl text-display-1 text-default">
              Your entire marketing team.
              <br />
              <span className="text-gradient-brand">
                Your own AI, on the job.
              </span>
            </h1>

            <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-secondary">
              Posts written, designed, reviewed and published for you — every
              day, in your brand voice, on the networks your customers actually
              use.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <GuestAuthLink href="/sign-up" className="btn-brand group">
                Get started
                <ArrowRight className="size-4 transition-expo-transform group-hover:translate-x-0.5" />
              </GuestAuthLink>
              <Link href="/product" className="landing-btn-secondary">
                See how it works
              </Link>
            </div>

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

            <p className="mt-10 text-sm text-tertiary">
              Setup in under 10 minutes · Human-reviewed before publishing ·
              Cancel anytime
            </p>
            <p className="mt-3 text-sm">
              <Link
                href="/try-it"
                className="font-medium text-[var(--brand-violet-text)] underline-offset-4 transition-expo hover:underline"
              >
                Or try a free post for your website
              </Link>
            </p>
          </div>
        </section>

        <LandingChallenge />
        <LandingAutomation />
        <LandingAgents />
        <LandingClose />
      </main>
    </div>
  );
}
