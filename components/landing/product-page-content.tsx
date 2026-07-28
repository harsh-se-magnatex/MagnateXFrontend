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
  Zap,
  Layers,
  ImageIcon,
  PartyPopper,
  Bolt,
} from 'lucide-react';
import NavBar from '@/app/(main)/_components/NavBar';
import { HowItWorksFlow } from '@/components/landing/workflow-pipeline';
import { LandingPricingCards } from '@/components/landing/landing-pricing-cards';
import { SocialPreviewEmbed } from '@/components/landing/social-preview/social-preview-embed';

const PRODUCT_FEATURES = [
  {
    title: 'Daily Auto Generated Content',
    icon: Zap,
    description:
      'Strategy-informed posts created every day — structured around your brand profile. The content reflects your business, not a placeholder version of it.',
  },
  {
    title: 'One Input → Three Platform-Optimised Posts',
    icon: Layers,
    description:
      'Give Sociogenie a topic and get three distinct versions: concise and visual for Instagram, professional and insight-driven for LinkedIn, community-focused for Facebook.',
  },
  {
    title: 'Product Ad Creative Generator',
    icon: ImageIcon,
    description:
      'Upload a product image and receive platform-ready creatives with captions and hooks written for conversion — useful for launches and promotions.',
  },
  {
    title: 'Festival & Trend Campaigns',
    icon: PartyPopper,
    description:
      'Culturally relevant content generated automatically for festivals, events, and trending moments — matched to your brand without requiring your attention.',
  },
  {
    title: 'Instant Post Generator',
    icon: Bolt,
    description:
      'Need something published today? Write a prompt and get a ready-to-publish post in seconds.',
  },
  {
    title: 'Analytics Dashboard',
    icon: BarChart3,
    description:
      "Track performance across platforms, understand what's working, and get recommendations based on your results.",
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

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
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
    <article
      className={cn(
        'flex h-full flex-col rounded-2xl border border-border/50 bg-card p-5 shadow-sm transition-shadow duration-300 hover:shadow-md hover:border-border sm:p-6',
        className
      )}
    >
      {children}
    </article>
  );
}

export function ProductPageContent() {
  return (
    <div className="min-h-screen flex flex-col font-(--font-sora) selection:bg-primary-blue/20 overflow-hidden relative">
      <AppGradientBackground variant="vivid" />
      <NavBar />

      <main className="flex-1 relative z-10 flex flex-col">
        <section className="px-6 pt-28 pb-12 sm:pt-32 sm:pb-16">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="mx-auto max-w-3xl text-center"
          >
            <motion.h1
              variants={fadeIn}
              className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl leading-[1.08]"
            >
              Everything{' '}
              <span className="bg-gradient-primary-text">Sociogenie</span> does
              for your business
            </motion.h1>
            <motion.p
              variants={fadeIn}
              className="mt-6 text-lg leading-relaxed text-muted-foreground font-(--font-dm-sans)"
            >
              SocioGenie generates content, human review, and automated publishing
              across Instagram, Facebook &amp; LinkedIn.
            </motion.p>
            <motion.div
              variants={fadeIn}
              className="mt-8 flex flex-wrap justify-center gap-3"
            >
              <GuestAuthLink
                href="/sign-up"
                className="group inline-flex items-center rounded-xl bg-gradient-primary px-7 py-3.5 text-sm font-bold text-white transition-all hover:shadow-xl hover:shadow-primary-purple/25 active:scale-[0.98]"
              >
                Get Started Free
                <Rocket className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </GuestAuthLink>
              <Link
                href="/"
                className="group inline-flex items-center rounded-xl border border-border/80 bg-transparent px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                Back to experience
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          </motion.div>
        </section>

        <section
          id="how-it-works"
          aria-labelledby="how-it-works-heading"
          className="scroll-mt-24 border-y border-border/40 bg-card/20 px-6 py-10 sm:py-14"
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
                className="text-2xl font-extrabold text-foreground sm:text-3xl"
              >
                Set up once. Your content runs from there.
              </h2>
              <p className="mt-4 max-w-3xl font-(--font-dm-sans) text-base leading-relaxed text-muted-foreground">
                Four steps from brand setup to fully autonomous publishing.
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
          className="border-t border-border/40 bg-card/20 px-6 py-10 sm:py-14"
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
                className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
              >
                Everything you need to grow on social media
              </h2>
            </motion.div>
            <ul
              role="list"
              className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              {PRODUCT_FEATURES.map((feature) => (
                <motion.li key={feature.title} variants={fadeIn}>
                  <LandingCard>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-purple/10 text-primary-purple ring-1 ring-primary-purple/20">
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
          </motion.div>
        </section>

        <section
          id="social-preview"
          aria-labelledby="social-preview-heading"
          className="scroll-mt-24 border-t border-border/40 bg-card/20 px-6 py-10 sm:py-14"
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
                className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
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
          className="scroll-mt-24 border-t border-border/40 px-6 py-10 sm:py-14"
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
              <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">
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
          className="scroll-mt-24 border-t border-border/40 px-6 py-10 sm:py-14"
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
              <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl mb-6">
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
                    className="border-0 px-4 sm:px-5"
                  >
                    <AccordionTrigger className="py-4 text-sm font-semibold text-foreground hover:no-underline sm:text-[0.9375rem] cursor-pointer">
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

        <section className="relative overflow-hidden px-6 py-20 sm:py-24">
          <div className="absolute inset-0 bg-linear-to-br from-primary-purple/10 via-transparent to-primary-blue/10 pointer-events-none" />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="relative z-10 mx-auto max-w-3xl text-center"
          >
            <motion.h2
              variants={fadeIn}
              className="text-3xl font-extrabold text-foreground sm:text-4xl"
            >
              Ready to automate your social media?
            </motion.h2>
            <motion.div variants={fadeIn} className="mt-8">
              <GuestAuthLink
                href="/sign-up"
                className="group inline-flex items-center rounded-xl bg-gradient-primary px-10 py-4 text-base font-bold text-white transition-all hover:shadow-xl hover:shadow-primary-purple/25 active:scale-[0.98]"
              >
                Get Started Free
                <Rocket className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </GuestAuthLink>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
