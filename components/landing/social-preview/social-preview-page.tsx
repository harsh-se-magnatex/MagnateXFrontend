'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import NavBar from '@/app/(main)/_components/NavBar';
import { GuestAuthLink } from '@/components/auth/GuestAuthLink';
import { AppGradientBackground } from '@/components/shared/AppGradientBackground';
import { Footer } from '@/components/shared/Footer';
import { JewelryShowcase } from '@/components/landing/jewelry-showcase';
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
          <motion.div
            variants={fadeIn}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="brand-pill mx-auto">
              <Sparkles className="size-3.5" aria-hidden />
              Real output
            </p>
            <h1 className="mt-6 text-display-1 text-default">
              How will your{' '}
              <span className="text-gradient-brand">social media</span> look?
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-secondary sm:text-base">
              Every visual here was made by SocioGenie — no person wrote or
              designed it. Here is what that looks like for a jewelry brand.
            </p>
          </motion.div>

          <motion.div variants={fadeIn} className="mt-12">
            <JewelryShowcase />
          </motion.div>

          <motion.section
            variants={fadeIn}
            className="mt-24 border-t border-border/50 pt-20"
            aria-labelledby="seven-visuals-heading"
          >
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-eyebrow text-[var(--brand-violet-text)]">
                Page styles
              </p>
              <h2
                id="seven-visuals-heading"
                className="mt-6 text-display-2 text-default"
              >
                See your brand in{' '}
                <span className="text-gradient-brand-warm">seven styles.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg font-medium leading-relaxed text-default">
                Choose your page style — pick how you want your feed to look.
              </p>
              <p className="mx-auto mt-1 max-w-xl text-sm text-secondary">
                You can change it any time.
              </p>
            </div>
            <div className="mt-10">
              <SevenVisualsEmbed />
            </div>
          </motion.section>

          <motion.div variants={fadeIn} className="mt-20 text-center">
            <h2 className="mx-auto max-w-2xl text-display-2 text-default">
              Now picture{' '}
              <span className="text-gradient-brand">your brand here.</span>
            </h2>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <GuestAuthLink href="/sign-up" className="btn-brand group">
                Get started free
                <ArrowRight className="size-4 transition-expo-transform group-hover:translate-x-0.5" />
              </GuestAuthLink>
              <Link href="/product" className="landing-btn-secondary">
                View product
              </Link>
            </div>
            <p className="mt-5 text-sm text-tertiary">
              No credit card needed · Cancel anytime
            </p>
          </motion.div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
