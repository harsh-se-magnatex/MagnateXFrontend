'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GuestAuthLink } from '@/components/auth/GuestAuthLink';
import { Footer } from '@/components/shared/Footer';
import { AppGradientBackground } from '@/components/shared/AppGradientBackground';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  BarChart3,
  ArrowRight,
  Rocket,
  Sparkles,
  Zap,
  ImageIcon,
  PartyPopper,
  Video,
  Target,
  Megaphone,
  GalleryHorizontal,
  CalendarClock,
  LayoutGrid,
  ListChecks,
  FolderOpen,
  Share2,
  MessageCircle,
} from 'lucide-react';
import NavBar from '@/app/(main)/_components/NavBar';
import { FeatureCard } from '@/components/landing/feature-card';
import { HowItWorksFlow } from '@/components/landing/workflow-pipeline';
import { LandingPricingCards } from '@/components/landing/landing-pricing-cards';
import { InlinePrice } from '@/components/pricing/price-display';
import { PlanComparison } from '@/components/landing/plan-comparison';
import { AnalyticsReportTeaser } from '@/components/landing/analytics-report-teaser';
import { SocialPreviewEmbed } from '@/components/landing/social-preview/social-preview-embed';

const PRODUCT_FEATURES = [
  {
    title: 'Create Post',
    icon: Zap,
    description:
      'Give it text or a photo; get a native post for every platform.',
  },
  {
    title: 'Marketing Scenes',
    icon: Megaphone,
    description:
      'Your product on a billboard, lightbox, magazine or shop window.',
  },
  {
    title: 'Product Posts',
    icon: ImageIcon,
    description: 'A clean product shot, or a social ad with copy built in.',
  },
  {
    title: 'Videos',
    icon: Video,
    description: '20-second videos from a prompt, with your logo built in.',
  },
  {
    title: 'Occasion Posts',
    icon: PartyPopper,
    description:
      'Pick the festivals that matter; greetings are made and posted.',
  },
  {
    title: 'Campaigns',
    icon: Target,
    description:
      'One concept, five days of connected posts, scheduled for you.',
  },
  {
    title: 'Carousel Posts',
    icon: GalleryHorizontal,
    description: 'Write the story, or let AI build the slides from your brand.',
  },
  {
    title: 'Schedule a Post',
    icon: CalendarClock,
    description: 'Pick the exact date and time for anything you made.',
  },
  {
    title: 'AI Manager',
    icon: LayoutGrid,
    description:
      'Plans, creates, reviews and publishes your month. Prime, Elite and Legacy.',
  },
  {
    title: 'Upcoming Posts',
    icon: ListChecks,
    description: 'Everything queued to publish, in one list.',
  },
  {
    title: 'Media Library',
    icon: FolderOpen,
    description: 'Every post, ad, video and carousel, ready to reuse.',
  },
  {
    title: 'Connected Accounts',
    icon: Share2,
    description: 'Connect Instagram, Facebook and LinkedIn once.',
  },
  {
    title: 'Analytics',
    icon: BarChart3,
    description:
      'Graded performance, best and worst posts, and what to post next.',
  },
  {
    title: 'Chat Assistant',
    icon: MessageCircle,
    description: 'An in-app guide that knows your brand.',
  },
] as const;

const LANDING_FAQ_ITEMS = [
  {
    question: 'How is SocioGenie different from other scheduling tools?',
    answer:
      'Schedulers post what you wrote. SocioGenie also decides what to post and creates it.',
  },
  {
    question: "Who reviews my content before it's published?",
    answer:
      'On AI Manager plans, you (Manual Review) or our in-house team (Auto Approve). On Studio, you create and see every post.',
  },
  {
    question: "What's the difference between Studio and AI Manager?",
    answer:
      'Studio: you decide what to make and when. AI Manager: it plans and runs your month.',
  },
  {
    question: 'Is the content specific to my business, or is it generic?',
    answer:
      'Specific. It is built from your brand profile — industry, voice and context — not a template bank.',
  },
  {
    question: 'What platforms does SocioGenie support?',
    answer: 'Instagram, Facebook and LinkedIn.',
  },
  {
    question: 'How long does setup take?',
    answer: 'Under 10 minutes. Your first content is ready within 24 hours.',
  },
  {
    question: 'Can I see what my content will look like before I commit?',
    answer: 'Yes. After setup you get 3 sample posts per platform.',
  },
  {
    question: 'What happens to unused credits?',
    answer:
      'Plan credits reset each cycle; credit packs last 30 days. AI Manager runs regardless of your balance.',
  },
  {
    question: 'Can I pause or cancel my subscription?',
    answer: 'Yes. No contracts — cancel any time in settings.',
  },
  {
    question:
      'Is SocioGenie suitable for a business with no social media presence yet?',
    answer:
      'Yes. It decides what to post and when, so you can start from zero.',
  },
] as const;

const LANDING_FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: LANDING_FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
} as const;

/**
 * Focus-in, matching the homepage callouts: content resolves out of the
 * background rather than sliding in from an edge. Blur pulls sharp while
 * the element settles inward from slightly oversized. No translation, so
 * nothing tracks sideways or upward on arrival.
 */
const fadeIn = {
  hidden: { opacity: 0, scale: 1.03, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/** Same idea, tuned tighter for the card grid so 13 arrivals stay brisk. */
const riseIn = {
  hidden: { opacity: 0, scale: 1.04, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.62, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.05 },
  },
};

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-eyebrow mb-3 text-[var(--brand-violet-text)]">
      {children}
    </p>
  );
}

/** The brand sweep, in order. Cards take their accent by index, so a grid
 *  runs blue -> pink across the row instead of repeating one hue. */
const CARD_ACCENTS = [
  'var(--brand-cyan)',
  'var(--brand-sky)',
  'var(--brand-indigo)',
  'var(--brand-violet)',
  'var(--brand-orchid)',
  'var(--brand-pink)',
  'var(--brand-coral)',
];

function LandingCard({
  children,
  className,
  index = 0,
}: {
  children: ReactNode;
  className?: string;
  index?: number;
}) {
  return (
    <FeatureCard
      accent={CARD_ACCENTS[index % CARD_ACCENTS.length]}
      className={cn('h-full p-5 sm:p-6', className)}
    >
      {children}
    </FeatureCard>
  );
}

export function ProductPageContent() {
  return (
    <div className="min-h-screen flex flex-col font-(--font-sora) selection:bg-primary-blue/20 overflow-hidden relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(LANDING_FAQ_JSON_LD),
        }}
      />
      <AppGradientBackground variant="vivid" />
      <NavBar />

      <main className="flex-1 relative z-10 flex flex-col">
        <section className="relative px-6 pt-32 pb-20 sm:pt-40 sm:pb-28">
          <div className="aurora-field" aria-hidden />
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="relative z-10 mx-auto max-w-4xl text-center"
          >
            <motion.p variants={fadeIn} className="brand-pill mb-6">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              The complete platform
            </motion.p>
            <motion.h1
              variants={fadeIn}
              className="text-display-1 text-default"
            >
              Everything <span className="text-gradient-brand">SocioGenie</span>
              <br className="hidden sm:block" /> does for your business
            </motion.h1>
            <motion.p
              variants={fadeIn}
              className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-secondary sm:text-base"
            >
              AI social media software for growing businesses. Studio from{' '}
              <InlinePrice usd={14.99} />
              /month; AI Manager, which runs your calendar, from{' '}
              <InlinePrice usd={49.99} />
              /month.
            </motion.p>
            <motion.div
              variants={fadeIn}
              className="mt-8 flex flex-wrap justify-center gap-3"
            >
              <Link
                href="/try-it"
                className="group relative inline-flex items-center overflow-hidden rounded-full bg-gradient-primary px-8 py-4 text-base font-bold text-white transition-expo ease-[cubic-bezier(0.4,0,0.2,1)]"
              >
                <span className="relative z-10 flex items-center">
                  See a post for your brand
                  <Rocket className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
                <span
                  className="absolute inset-0 bg-default transition-expo group-hover:bg-default"
                  aria-hidden
                />
              </Link>
              <Link
                href="/pricing"
                className="group inline-flex items-center rounded-full border border-default bg-transparent px-7 py-3.5 text-sm font-semibold text-default transition-expo ease-[cubic-bezier(0.4,0,0.2,1)] hover:border-strong hover:bg-hover"
              >
                See pricing
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          </motion.div>
        </section>

        <section
          id="how-it-works"
          aria-labelledby="how-it-works-heading"
          className="scroll-mt-24 bg-default px-6 py-14 sm:py-20 lg:py-24"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mx-auto max-w-6xl"
          >
            <motion.div variants={fadeIn}>
              <SectionEyebrow>How It Works</SectionEyebrow>
              <h2
                id="how-it-works-heading"
                className="text-display-3 text-default"
              >
                Set up once. Your content runs from there.
              </h2>
              <p className="mt-4 max-w-3xl font-(--font-dm-sans) text-sm leading-relaxed text-secondary">
                Set up your brand once. Every post follows the same four steps.
              </p>
            </motion.div>
            <motion.div variants={fadeIn} className="mt-10">
              <HowItWorksFlow />
            </motion.div>
          </motion.div>
        </section>

        <section
          id="features"
          aria-labelledby="product-features-heading"
          className="px-6 py-14 sm:py-20 lg:py-24"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-48px' }}
            variants={stagger}
            className="mx-auto max-w-6xl"
          >
            <motion.div variants={fadeIn} className="text-center">
              <SectionEyebrow>Features</SectionEyebrow>
              <h2
                id="product-features-heading"
                className="text-display-3 text-default"
              >
                Everything you need to grow on social media
              </h2>
            </motion.div>
            <ul
              role="list"
              className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              {PRODUCT_FEATURES.map((feature, i) => (
                <motion.li key={feature.title} variants={riseIn}>
                  <LandingCard index={i}>
                    <span className="brand-chip">
                      <feature.icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-base font-extrabold leading-snug text-default">
                      {feature.title}
                    </h3>
                    <p className="mt-2 flex-1 font-(--font-dm-sans) text-sm leading-relaxed text-secondary">
                      {feature.description}
                    </p>
                  </LandingCard>
                </motion.li>
              ))}
            </ul>
            <motion.div variants={fadeIn}>
              <AnalyticsReportTeaser />
            </motion.div>
          </motion.div>
        </section>

        <section
          id="plans"
          aria-labelledby="plans-heading"
          className="scroll-mt-24 bg-default px-6 py-14 sm:py-20 lg:py-24"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-48px' }}
            variants={stagger}
            className="mx-auto max-w-5xl"
          >
            <motion.div variants={fadeIn} className="text-center">
              <SectionEyebrow>Studio vs. AI</SectionEyebrow>
              <h2 id="plans-heading" className="text-display-3 text-default">
                Run it yourself, or hand over the month
              </h2>
              <p className="mx-auto mt-4 max-w-2xl font-(--font-dm-sans) text-sm leading-relaxed text-secondary">
                Same features. The difference is who decides what gets made.
              </p>
            </motion.div>
            <motion.div variants={fadeIn} className="mt-10">
              <PlanComparison />
            </motion.div>
          </motion.div>
        </section>

        <section
          id="social-preview"
          aria-labelledby="social-preview-heading"
          className="scroll-mt-24 px-6 py-14 sm:py-20 lg:py-24"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-48px' }}
            variants={stagger}
            className="mx-auto max-w-6xl"
          >
            <motion.div
              variants={fadeIn}
              className="mx-auto max-w-3xl text-center"
            >
              <SectionEyebrow>Preview</SectionEyebrow>
              <h2
                id="social-preview-heading"
                className="text-display-3 text-default"
              >
                How will your social media look?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl font-(--font-dm-sans) text-sm leading-relaxed text-secondary">
                Browse example profiles and posts on each platform.
              </p>
            </motion.div>
            <motion.div variants={fadeIn} className="mt-10">
              <SocialPreviewEmbed />
            </motion.div>
          </motion.div>
        </section>

        <section
          id="pricing"
          className="scroll-mt-24 bg-default px-6 py-14 sm:py-20 lg:py-24"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mx-auto max-w-6xl"
          >
            <motion.div variants={fadeIn} className="text-center">
              <SectionEyebrow>Pricing</SectionEyebrow>
              <h2 className="text-display-3 text-default">
                Simple, transparent pricing
              </h2>
              <p className="mt-4 font-(--font-dm-sans) text-secondary">
                No contracts. Cancel any time.
              </p>
            </motion.div>
            <motion.div variants={fadeIn} className="mt-10">
              <LandingPricingCards />
            </motion.div>
            <motion.div variants={fadeIn} className="mt-8 text-center">
              <Link
                href="/pricing"
                className="group inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-violet-text)] underline-offset-4 transition-expo hover:underline"
              >
                Full pricing & credits
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          </motion.div>
        </section>

        <section id="faq" className="scroll-mt-24 px-6 py-14 sm:py-20 lg:py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mx-auto max-w-4xl"
          >
            <motion.div variants={fadeIn}>
              <SectionEyebrow>FAQ</SectionEyebrow>
              <h2 className="text-display-3 text-default mb-6">
                Common questions
              </h2>
            </motion.div>
            <motion.div variants={fadeIn}>
              <Accordion
                type="single"
                collapsible
                className="rounded-2xl border border-default bg-default font-(--font-dm-sans) divide-y divide-border/40 overflow-hidden"
              >
                {LANDING_FAQ_ITEMS.map((item, i) => (
                  <AccordionItem
                    key={item.question}
                    value={`faq-${i}`}
                    className="border-0 px-4 transition-expo hover:bg-primary-purple/[0.03] sm:px-5"
                  >
                    <AccordionTrigger className="py-4 text-sm font-semibold text-default transition-expo hover:no-underline hover:text-preview sm:text-[0.9375rem] cursor-pointer">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-secondary text-sm leading-relaxed pb-4 pt-0">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </motion.div>
        </section>

        <section className="relative overflow-hidden bg-default px-6 py-28 sm:py-36">
          <div className="aurora-field" aria-hidden />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="relative z-10 mx-auto max-w-3xl text-center"
          >
            <motion.h2
              variants={fadeIn}
              className="text-display-2 text-default"
            >
              Ready to automate
              <br />
              <span className="shimmer-text">your social media?</span>
            </motion.h2>
            <motion.div variants={fadeIn} className="mt-8">
              <GuestAuthLink
                href="/sign-up"
                className="group relative inline-flex items-center overflow-hidden rounded-full bg-gradient-primary px-12 py-5 text-lg font-bold text-white transition-expo ease-[cubic-bezier(0.4,0,0.2,1)]"
              >
                <span className="relative z-10 flex items-center">
                  See a post for your brand
                  <Rocket className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
                <span
                  className="absolute inset-0 bg-default transition-expo group-hover:bg-default"
                  aria-hidden
                />
              </GuestAuthLink>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
