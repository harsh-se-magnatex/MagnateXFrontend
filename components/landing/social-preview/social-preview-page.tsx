'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import NavBar from '@/app/(main)/_components/NavBar';
import { AppGradientBackground } from '@/components/shared/AppGradientBackground';
import { Footer } from '@/components/shared/Footer';
import { PlatformSwitcher } from '@/components/landing/social-preview/platform-switcher';
import { PreviewDeviceFrame } from '@/components/landing/social-preview/preview-device-frame';
import { InstagramPageMockup } from '@/components/landing/social-preview/instagram-page-mockup';
import { FacebookPageMockup } from '@/components/landing/social-preview/facebook-page-mockup';
import { LinkedInPageMockup } from '@/components/landing/social-preview/linkedin-page-mockup';
import type { PreviewPlatform } from '@/components/landing/social-preview/constants';
import { getShowcasePostsForPlatform } from '@/components/landing/social-preview/showcase-data';

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

function PreviewDisclaimer() {
  return (
    <p className="mx-auto max-w-2xl text-center text-xs leading-relaxed text-muted-foreground font-(--font-dm-sans)">
      Illustrative previews only. Platform interfaces shown are mockups for demonstration
      and are not official Meta or LinkedIn products. SocioGenie is not affiliated with,
      endorsed by, or sponsored by Meta Platforms, Inc. or LinkedIn Corporation.
    </p>
  );
}

export function SocialPreviewPage() {
  const [platform, setPlatform] = useState<PreviewPlatform>('instagram');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const posts = useMemo(
    () => getShowcasePostsForPlatform(platform),
    [platform]
  );

  const handlePlatformChange = (next: PreviewPlatform) => {
    setPlatform(next);
    setSelectedPostId(null);
  };

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
              Switch between Instagram, Facebook, and LinkedIn, browse the profile grid,
              and open any post to see how Sociogenie-generated content could appear once
              published.
            </p>
          </motion.div>

          <motion.div variants={fadeIn} className="mt-10">
            <PlatformSwitcher active={platform} onChange={handlePlatformChange} />
          </motion.div>

          <motion.div variants={fadeIn} className="mt-8">
            <PreviewDeviceFrame platform={platform} nestedScroll>
              {platform === 'instagram' && (
                <InstagramPageMockup
                  posts={posts}
                  selectedPostId={selectedPostId}
                  onSelectPost={setSelectedPostId}
                  onClosePost={() => setSelectedPostId(null)}
                />
              )}
              {platform === 'facebook' && (
                <FacebookPageMockup
                  posts={posts}
                  selectedPostId={selectedPostId}
                  onSelectPost={setSelectedPostId}
                  onClosePost={() => setSelectedPostId(null)}
                />
              )}
              {platform === 'linkedin' && (
                <LinkedInPageMockup
                  posts={posts}
                  selectedPostId={selectedPostId}
                  onSelectPost={setSelectedPostId}
                  onClosePost={() => setSelectedPostId(null)}
                />
              )}
            </PreviewDeviceFrame>
          </motion.div>

          <motion.div variants={fadeIn} className="mt-8 space-y-6">
            <PreviewDisclaimer />
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
