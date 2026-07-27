'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import NavBar from './(main)/_components/NavBar';
<<<<<<< HEAD
=======
import { GuestAuthLink } from '@/components/auth/GuestAuthLink';
>>>>>>> test
import { Landing3DBackground } from '@/components/landing/landing-3d-background';
import { LandingScrollCallouts } from '@/components/landing/landing-scroll-callouts';
import '@/components/landing/landing-3d.css';

<<<<<<< HEAD
const SCROLL_SPACER_COUNT = 12;
=======
const SCROLL_SPACER_COUNT = 16;
>>>>>>> test

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

export default function Home() {
  return (
    <div className="landing-3d-root min-h-screen relative">
      <Landing3DBackground />
      <LandingScrollCallouts />

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
            <motion.p variants={fadeIn} className="landing-eyebrow">
              AI Social Growth Engine
            </motion.p>

            <motion.h1
              variants={fadeIn}
              className="landing-display mt-5 text-[clamp(2.75rem,7vw,4.9rem)] leading-[1.02] tracking-[-0.03em] text-white"
            >
              Your entire marketing team.
              <br />
              <span className="landing-accent">Your own AI, on the job.</span>
            </motion.h1>

            <motion.p
              variants={fadeIn}
              className="landing-body mx-auto mt-7 max-w-2xl text-[clamp(1.05rem,2.2vw,1.25rem)] leading-[1.65] text-white/72"
            >
              Stop managing social media. SocioGenie researches your industry,
              learns your business, creates high-performing content, and
              publishes it at the perfect time — while you run your business,
              your AI is already planning tomorrow&apos;s growth.
            </motion.p>

            <motion.div
              variants={fadeIn}
              className="mt-10 flex flex-wrap items-center justify-center gap-4"
            >
<<<<<<< HEAD
              <Link href="/sign-up" className="landing-btn-primary group">
                Start Free — 10-Day Elite Trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
=======
              <GuestAuthLink href="/sign-up" className="landing-btn-primary group">
                Start Free — 10-Day Elite Trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </GuestAuthLink>
>>>>>>> test
              <Link href="/product" className="landing-btn-secondary">
                See how it works
              </Link>
            </motion.div>

            <motion.p
              variants={fadeIn}
              className="landing-body mt-6 text-sm text-white/45"
            >
              No credit card · Setup in under 10 minutes · Human-reviewed before publishing
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.8 }}
            className="landing-scroll-hint absolute bottom-12 left-1/2 -translate-x-1/2"
            aria-hidden
          >
            <span className="landing-body text-[11px] font-medium uppercase tracking-[0.28em] text-white/40">
              Scroll to explore
            </span>
            <span className="landing-scroll-hint__line" />
          </motion.div>
        </section>
      </div>

      <main className="landing-3d-content" aria-hidden>
        {Array.from({ length: SCROLL_SPACER_COUNT }, (_, i) => (
          <div key={i} className="h-screen" />
        ))}
      </main>
    </div>
  );
}
