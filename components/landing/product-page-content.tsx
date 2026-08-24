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
import { PlanComparison } from '@/components/landing/plan-comparison';
import { AnalyticsReportTeaser } from '@/components/landing/analytics-report-teaser';
import { SocialPreviewEmbed } from '@/components/landing/social-preview/social-preview-embed';

const PRODUCT_FEATURES = [
  {
    title: 'Create Post',
    icon: Zap,
    description:
      "Give it text, get every platform. Add a photo and SocioGenie edits it into your brand's look before writing native Instagram, Facebook and LinkedIn versions.",
  },
  {
    title: 'Product Posts',
    icon: ImageIcon,
    description:
      'Two modes: a photoshoot-ready product shot, or a social ad with copy built into the creative. You choose.',
  },
  {
    title: 'Videos',
    icon: Video,
    description:
      '20-second videos from a text prompt, with your logo set as the opening or closing frame.',
  },
  {
    title: 'Occasion Posts',
    icon: PartyPopper,
    description:
      'A year-round calendar of festivals and holidays — pick the ones relevant to your brand and get a timely greeting generated and published automatically.',
  },
  {
    title: 'Campaigns',
    icon: Target,
    description:
      'Pick a concept and get five days of connected content across your platforms, generated and scheduled end to end.',
  },
  {
    title: 'Carousel Posts',
    icon: GalleryHorizontal,
    description:
      'Write the story yourself, or leave it blank and let the AI build the slide sequence from your brand profile.',
  },
  {
    title: 'Schedule a Post',
    icon: CalendarClock,
    description:
      'Choose the exact date and time for any piece of content you have created.',
  },
  {
    title: 'AI Plan',
    icon: LayoutGrid,
    description:
      "Your whole month at a glance — every day, every platform, what's planned or already posted. AI plan only.",
  },
  {
    title: 'Scheduled Posts',
    icon: ListChecks,
    description:
      'A running list of everything queued to publish, so you always know what is coming.',
  },
  {
    title: 'Media Library',
    icon: FolderOpen,
    description:
      'Every generated post, ad, video and carousel, kept in one place and ready to reuse.',
  },
  {
    title: 'Connected Accounts',
    icon: Share2,
    description:
      'Connect Instagram, Facebook and LinkedIn once — SocioGenie handles publishing and analytics from there.',
  },
  {
    title: 'Analytics',
    icon: BarChart3,
    description:
      'Graded performance across seven areas, your best and worst posts, and two ready-to-run ideas for what is next.',
  },
  {
    title: 'Chat Assistant',
    icon: MessageCircle,
    description:
      'A guide built into the app that knows your brand and helps you decide what to run next.',
  },
] as const;

const LANDING_FAQ_ITEMS = [
  {
    question: 'How is Sociogenie different from other Scheduling Tools?',
    answer:
      "They schedule content you've already written. Sociogenie creates the content, has it reviewed by a human, and publishes it for you. It handles the creation and strategy layer, not just the scheduling step.",
  },
  {
    question: "Who reviews my content before it's published?",
    answer:
      'It depends on your plan. On Studio plans, you review and approve every post before it goes live. On AI plans, our in-house review team checks each post for brand alignment, clarity, platform suitability, and quality before publishing — typically within 24 hours.',
  },
  {
    question: "What's the difference between the Studio and AI plans?",
    answer:
      'Studio gives you every creative tool, run on your own schedule — you decide what to make and when to post it. AI adds the AI Plan: SocioGenie plans, generates and schedules a full month for you, against a fixed monthly quota of campaigns, AI posts, carousels, videos and event posts.',
  },
  {
    question: 'Is the content specific to my business, or is it generic?',
    answer:
      "It's built from your brand profile — your industry, tone of voice, and business context. What gets generated for your account is specific to your setup, not pulled from a shared template bank.",
  },
  {
    question: 'What platforms does Sociogenie support?',
    answer:
      'Instagram, Facebook, and LinkedIn. Additional platforms are on the roadmap.',
  },
  {
    question: 'How long does setup take?',
    answer:
      'Most users complete setup in under 10 minutes. Your first content batch is reviewed and ready within 24 hours.',
  },
  {
    question: 'Can I see what my content will look like before I commit?',
    answer:
      'Yes — right after setup, generate 3 sample posts per platform (Instagram, Facebook, LinkedIn) so you can see your brand’s look before going further.',
  },
  {
    question: 'What happens to unused credits?',
    answer:
      'Credits are valid for 30 days. Personalized AI runs independently — it continues regardless of your credit balance.',
  },
  {
    question: 'Can I pause or cancel my subscription?',
    answer:
      'Yes. No long-term contracts. Cancel at any time from your account settings.',
  },
  {
    question:
      'Is Sociogenie suitable for a business with no social media presence yet?',
    answer:
      "Yes — Sociogenie handles the strategy, so you don't need to know what to post or when. It's well-suited to businesses that want to build a consistent presence without hiring someone to manage it.",
  },
] as const;

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
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-purple mb-3">
      {children}
    </p>
  );
}

function LandingCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <FeatureCard className={cn('h-full p-5 sm:p-6', className)}>
      {children}
    </FeatureCard>
  );
}

export function ProductPageContent() {
  return (
    <div className="min-h-screen flex flex-col font-(--font-sora) selection:bg-primary-blue/20 overflow-hidden relative">
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
            <motion.p
              variants={fadeIn}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-purple/25 bg-primary-purple/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary-purple backdrop-blur-sm"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              The complete platform
            </motion.p>
            <motion.h1
              variants={fadeIn}
              className="font-[family-name:var(--font-display)] text-[clamp(2.75rem,7vw,5rem)] font-normal tracking-[-0.02em] text-foreground leading-[1.04]"
            >
              Everything{' '}
              <span className="shimmer-text">Sociogenie</span>
              <br className="hidden sm:block" /> does for your business
            </motion.h1>
            <motion.p
              variants={fadeIn}
              className="mx-auto mt-7 max-w-2xl text-lg font-light leading-relaxed text-muted-foreground sm:text-xl"
            >
              From a five-minute brand setup to a fully scheduled month —
              see exactly how SocioGenie researches, creates, reviews and
              publishes for Instagram, Facebook and LinkedIn.
            </motion.p>
            <motion.div
              variants={fadeIn}
              className="mt-8 flex flex-wrap justify-center gap-3"
            >
              <GuestAuthLink
                href="/sign-up"
                className="group relative inline-flex items-center overflow-hidden rounded-full bg-gradient-primary px-8 py-4 text-base font-bold text-white shadow-lg shadow-primary-purple/35 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary-purple/55 active:translate-y-0 active:scale-95"
              >
                <span className="relative z-10 flex items-center">
                  Get Started Free
                  <Rocket className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
                <span className="absolute inset-0 bg-white/0 transition-colors duration-300 group-hover:bg-white/10" aria-hidden />
              </GuestAuthLink>
              <Link
                href="/"
                className="group inline-flex items-center rounded-full border border-border/80 bg-transparent px-7 py-3.5 text-sm font-semibold text-foreground transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-primary-purple/40 hover:bg-accent active:scale-95"
              >
                Back to experience
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          </motion.div>
        </section>

        <section
          id="how-it-works"
          aria-labelledby="how-it-works-heading"
          className="scroll-mt-24 bg-card/85 px-6 py-14 sm:py-20 lg:py-24"
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
                className="font-[family-name:var(--font-display)] text-3xl font-normal tracking-[-0.015em] text-foreground sm:text-[2.6rem] sm:leading-[1.1]"
              >
                Set up once. Your content runs from there.
              </h2>
              <p className="mt-4 max-w-3xl font-(--font-dm-sans) text-base leading-relaxed text-muted-foreground">
                Four steps to set up your brand, then four steps every post
                goes through after that.
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
                className="font-[family-name:var(--font-display)] text-3xl font-normal tracking-[-0.015em] text-foreground sm:text-[2.6rem] sm:leading-[1.1]"
              >
                Everything you need to grow on social media
              </h2>
            </motion.div>
            <ul
              role="list"
              className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              {PRODUCT_FEATURES.map((feature) => (
                <motion.li key={feature.title} variants={riseIn}>
                  <LandingCard>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-purple to-primary-blue text-white shadow-lg shadow-primary-purple/25 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:scale-110 group-hover/card:-rotate-6">
                      <feature.icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-base font-extrabold leading-snug text-foreground">
                      {feature.title}
                    </h3>
                    <p className="mt-2 flex-1 font-(--font-dm-sans) text-sm leading-relaxed text-muted-foreground">
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
          className="scroll-mt-24 bg-card/85 px-6 py-14 sm:py-20 lg:py-24"
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
              <h2
                id="plans-heading"
                className="font-[family-name:var(--font-display)] text-3xl font-normal tracking-[-0.015em] text-foreground sm:text-[2.6rem] sm:leading-[1.1]"
              >
                Run it yourself, or hand over the month
              </h2>
              <p className="mx-auto mt-4 max-w-2xl font-(--font-dm-sans) text-base leading-relaxed text-muted-foreground">
                Every feature above is available on both. The difference is
                who decides what gets made and when.
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
            <motion.div variants={fadeIn} className="mx-auto max-w-3xl text-center">
              <SectionEyebrow>Preview</SectionEyebrow>
              <h2
                id="social-preview-heading"
                className="font-[family-name:var(--font-display)] text-3xl font-normal tracking-[-0.015em] text-foreground sm:text-[2.6rem] sm:leading-[1.1]"
              >
                How will your social media look?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl font-(--font-dm-sans) text-base leading-relaxed text-muted-foreground">
                Switch between Instagram, Facebook, and LinkedIn, browse the profile
                grid, and open any post to see how Sociogenie-generated content could
                appear once published.
              </p>
            </motion.div>
            <motion.div variants={fadeIn} className="mt-10">
              <SocialPreviewEmbed />
            </motion.div>
          </motion.div>
        </section>

        <section
          id="pricing"
          className="scroll-mt-24 bg-card/85 px-6 py-14 sm:py-20 lg:py-24"
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
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-normal tracking-[-0.015em] text-foreground sm:text-[2.6rem] sm:leading-[1.1]">
                Simple, transparent pricing
              </h2>
              <p className="mt-4 font-(--font-dm-sans) text-muted-foreground">
                Start with a plan that fits your team. No contracts — cancel anytime.
              </p>
            </motion.div>
            <motion.div variants={fadeIn} className="mt-10">
              <LandingPricingCards />
            </motion.div>
          </motion.div>
        </section>

        <section
          id="faq"
          className="scroll-mt-24 px-6 py-14 sm:py-20 lg:py-24"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mx-auto max-w-4xl"
          >
            <motion.div variants={fadeIn}>
              <SectionEyebrow>FAQ</SectionEyebrow>
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-normal tracking-[-0.015em] text-foreground sm:text-[2.6rem] sm:leading-[1.1] mb-6">
                Common questions
              </h2>
            </motion.div>
            <motion.div variants={fadeIn}>
              <Accordion
                type="single"
                collapsible
                className="rounded-2xl border border-border/50 bg-card font-(--font-dm-sans) divide-y divide-border/40 overflow-hidden"
              >
                {LANDING_FAQ_ITEMS.map((item, i) => (
                  <AccordionItem
                    key={item.question}
                    value={`faq-${i}`}
                    className="border-0 px-4 transition-colors duration-200 hover:bg-primary-purple/[0.03] sm:px-5"
                  >
                    <AccordionTrigger className="py-4 text-sm font-semibold text-foreground transition-colors duration-200 hover:no-underline hover:text-primary-purple sm:text-[0.9375rem] cursor-pointer">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-4 pt-0">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </motion.div>
        </section>

        <section className="relative overflow-hidden bg-card/85 px-6 py-28 sm:py-36">
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
              className="font-[family-name:var(--font-display)] text-[clamp(2.25rem,5.5vw,3.75rem)] font-normal tracking-[-0.02em] leading-[1.06] text-foreground"
            >
              Ready to automate
              <br />
              <span className="shimmer-text">your social media?</span>
            </motion.h2>
            <motion.div variants={fadeIn} className="mt-8">
              <GuestAuthLink
                href="/sign-up"
                className="group relative inline-flex items-center overflow-hidden rounded-full bg-gradient-primary px-12 py-5 text-lg font-bold text-white shadow-xl shadow-primary-purple/40 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary-purple/60 active:translate-y-0 active:scale-95"
              >
                <span className="relative z-10 flex items-center">
                  Get Started Free
                  <Rocket className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
                <span className="absolute inset-0 bg-white/0 transition-colors duration-300 group-hover:bg-white/10" aria-hidden />
              </GuestAuthLink>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
