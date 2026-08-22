'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import NavBar from '@/app/(main)/_components/NavBar';
import { AppGradientBackground } from '@/components/shared/AppGradientBackground';
import { Footer } from '@/components/shared/Footer';
import {
  SocialPreviewEmbed,
} from '@/components/landing/social-preview/social-preview-embed';
import { SevenVisualsEmbed } from '@/components/landing/seven-visuals/seven-visuals-embed';

const fadeIn = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

export function SocialPreviewPage() {
  return (
    <div className="relative min-h-screen overflow-hidden font-(--font-sora) selection:bg-primary-blue/20">
      <AppGradientBackground variant="vivid" />
      <NavBar />

      <main className="relative z-10 px-6 pb-16 pt-28 sm:pt-32">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="mx-auto max-w-6xl"
        >
          <motion.div variants={fadeIn} className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-purple">
              Preview
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              How will your{' '}
              <span className="bg-gradient-primary-text">social media</span> look?
            </h1>
            <p className="mx-auto mt-4 max-w-2xl font-(--font-dm-sans) text-base leading-relaxed text-muted-foreground sm:text-lg">
              Pick a brand, switch between Instagram, Facebook, and LinkedIn, browse the
              profile grid, and open any post to see how Sociogenie-generated content could
              appear once published.
            </p>
          </motion.div>

          <motion.div variants={fadeIn} className="mt-10">
            <SocialPreviewEmbed />
          </motion.div>

          <motion.section
            variants={fadeIn}
            className="mt-24 border-t border-border/50 pt-20"
            aria-labelledby="seven-visuals-heading"
          >
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-purple">
                Page styles
              </p>
              <h2
                id="seven-visuals-heading"
                className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl"
              >
                See your brand in seven different styles.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl font-(--font-dm-sans) text-base leading-relaxed text-muted-foreground sm:text-lg">
                Explore how the same page can feel minimalist, vibrant, elegant, or bold—then open each visual to see its caption and full-size artwork.
              </p>
            </div>
            <div className="mt-10">
              <SevenVisualsEmbed />
            </div>
          </motion.section>

          <motion.div variants={fadeIn} className="mt-8">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="inline-flex items-center rounded-xl bg-gradient-primary px-7 py-3 text-sm font-bold text-white transition-all hover:shadow-xl hover:shadow-primary-purple/25 active:scale-[0.98]"
              >
                Get Started Free
              </Link>
              <Link
                href="/product"
                className="inline-flex items-center rounded-xl border border-border/80 bg-card/50 px-7 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                View product
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
