'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import NavBar from './(main)/_components/NavBar';
import { GuestAuthLink } from '@/components/auth/GuestAuthLink';
import { Landing3DBackground } from '@/components/landing/landing-3d-background';
import { LandingScrollCallouts } from '@/components/landing/landing-scroll-callouts';
import { cn } from '@/lib/utils';
import '@/components/landing/landing-3d.css';

const fadeIn = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 1, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

/** The headline itself doesn't move — it only schedules its words. */
const headline: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

/**
 * One word falling the full height of the page and landing.
 *
 * The start offset is `-45vh` rather than a multiple of the word's own
 * height: the hero is vertically centred, so the headline's distance from
 * the top of the window changes with the viewport. A viewport-relative
 * offset is the one value that reliably puts every word above the fold —
 * and therefore behind the fixed nav, which sits at z-index 60 against the
 * hero's 20 — no matter how tall the window is. The words drop out from
 * under the menu bar instead of nudging up from where they already are.
 *
 * A spring (rather than a duration) is what sells the landing: the slight
 * overshoot reads as weight settling, which a fixed easing curve can't
 * produce. Damping ratio here is ~0.8 — enough bounce to feel physical,
 * not enough to wobble. Tilt and blur make it a fall rather than a slide.
 */
const dropWord: Variants = {
  hidden: { y: '-45vh', opacity: 0, rotate: -4, filter: 'blur(12px)' },
  visible: {
    y: 0,
    opacity: 1,
    rotate: 0,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 80,
      damping: 15,
      mass: 1.1,
      opacity: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
      filter: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  },
};

/**
 * Splits a line into individually-falling words. The separators are real
 * spaces rather than padding on the spans, so the headline still wraps
 * naturally on narrow screens.
 *
 * The shine lives on an inner span, not the animated one: the outer span
 * is where Framer writes `filter: blur(...)` each frame, and a filter
 * declared in CSS on that same element would be overwritten the moment
 * the animation starts.
 */
function FallingWords({ text, className }: { text: string; className?: string }) {
  const words = text.split(' ');
  return (
    <>
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <motion.span variants={dropWord} className="inline-block">
            <span className={cn('landing-edge-shine inline-block', className)}>{word}</span>
          </motion.span>
          {i < words.length - 1 && ' '}
        </Fragment>
      ))}
    </>
  );
}

export default function Home() {
  return (
    <div className="landing-3d-root min-h-screen relative">
      <Landing3DBackground />

      <NavBar />

      <div className="landing-3d-overlay">
        <section
          id="heroContent"
          className="min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center"
        >
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="mx-auto max-w-4xl"
          >
            <motion.p variants={fadeIn}>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80 backdrop-blur-md">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-300" />
                </span>
                AI Social Growth Engine
              </span>
            </motion.p>

            <motion.h1
              variants={headline}
              className="landing-display mt-6 text-[clamp(2.75rem,7vw,4.9rem)] leading-[1.02] tracking-[-0.035em] text-white"
            >
              <FallingWords text="Your entire marketing team." />
              <br />
              <FallingWords text="Your own AI, on the job." className="landing-headline-accent" />
            </motion.h1>

            <motion.div
              variants={fadeIn}
              className="mt-12 flex flex-wrap items-center justify-center gap-4"
            >
              <GuestAuthLink href="/sign-up" className="landing-btn-primary group">
                Get started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </GuestAuthLink>
              <Link href="/product" className="landing-btn-secondary">
                See how it works
              </Link>
            </motion.div>

            <motion.p
              variants={fadeIn}
              className="landing-body mt-6 text-sm text-white/45"
            >
              Setup in under 10 minutes · Human-reviewed before publishing · Cancel anytime
            </motion.p>
            <motion.p variants={fadeIn} className="landing-body mt-3 text-sm">
              <Link
                href="/try-it"
                className="text-white/50 underline-offset-4 transition-colors hover:text-white/80 hover:underline"
              >
                Or try a free post for your website
              </Link>
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.8 }}
            className="landing-scroll-hint absolute bottom-12 left-1/2 -translate-x-1/2"
            aria-hidden
          >
            <span className="landing-scroll-hint__line" />
          </motion.div>
        </section>
      </div>

      <main className="landing-3d-content py-24 sm:py-32">
        <LandingScrollCallouts />
      </main>
    </div>
  );
}
