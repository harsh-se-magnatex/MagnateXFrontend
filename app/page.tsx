'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/shared/Footer';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  BarChart3,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Clock,
  Rocket,
  Dot,
} from 'lucide-react';
import NavBar from './(main)/_components/NavBar';

const TRUST_BAR_ITEMS = [
  'Instagram, Facebook & LinkedIn',
  'Human-reviewed before publishing',
  'Content ready in 24 hours',
  'Setup in under 10 minutes',
] as const;

const SOCIAL_MEDIA_PAIN_POINTS = [
  'Agencies are expensive.',
  'Freelancers are inconsistent.',
  'Scheduling tools still expect you to create all the content yourself.',
  "And doing everything manually takes hours every week that most business owners simply don't have.",
  "The challenge isn't knowing you should post — it's having the time and system to do it consistently.",
] as const;

const PAIN_POINT_CARDS = [
  {
    title: 'Agencies',
    description:
      'Charge ₹15,000–30,000/month for work that is largely automatable.',
  },
  {
    title: 'Freelancers',
    description:
      'Creative but hard to manage. Quality and consistency vary week to week.',
  },
  {
    title: 'Scheduling Tools',
    description:
      'They queue up content — but you still have to write every single post yourself.',
  },
  {
    title: 'Doing It Yourself',
    description:
      "Works until it doesn't. Most people run out of time before they run out of ideas.",
  },
] as const;

const SOLUTION_PILLARS = [
  {
    title: 'Content tailored to your business — not generic templates',
    description:
      'Sociogenie uses your brand profile, industry, tone, and audience context to generate relevant content. What gets created for your account is specific to you.',
  },
  {
    title: 'Every post reviewed by a real person before it goes live',
    description:
      "AI creates at speed. Our review team checks every post for brand alignment, clarity, and quality before it's published. Turnaround: within 24 hours.",
  },
  {
    title: 'Scheduled automatically for the best posting times',
    description:
      'Approved content is published at optimal times without you needing to manage a calendar or log in to schedule anything.',
  },
] as const;

const HUMAN_REVIEW_CHECKS = [
  'Brand alignment — does this match your tone, values, and positioning?',
  'Clarity and readability — is it easy to understand and engaging?',
  "Platform suitability — is the format, length, and style right for where it's being posted?",
  'Quality assurance — grammar, relevance, and overall content standard',
] as const;

const PRODUCT_FEATURES = [
  {
    title: 'Daily AI-Generated Content',
    description:
      'Strategy-informed posts created every day — structured around your brand profile. The content reflects your business, not a placeholder version of it.',
  },
  {
    title: 'One Input → Three Platform-Optimised Posts',
    description:
      'Give Sociogenie a topic and get three distinct versions: concise and visual for Instagram, professional and insight-driven for LinkedIn, community-focused for Facebook.',
  },
  {
    title: 'Product Ad Creative Generator',
    description:
      'Upload a product image and receive platform-ready creatives with captions and hooks written for conversion — useful for launches and promotions.',
  },
  {
    title: 'Festival & Trend Campaigns',
    description:
      'Culturally relevant content generated automatically for festivals, events, and trending moments — matched to your brand without requiring your attention.',
  },
  {
    title: 'Instant Post Generator',
    description:
      'Need something published today? Write a prompt and get a ready-to-publish post in seconds.',
  },
  {
    title: 'Analytics Dashboard (Elite & Legacy)',
    description:
      "Track performance across platforms, understand what's working, and get AI-powered content recommendations based on your results.",
  },
] as const;

const OUTCOME_CARDS = [
  'Replace most of your manual content creation and scheduling workload',
  'Maintain daily posting consistency across up to 3 platforms',
  'Reduce social media costs significantly compared to an agency or freelancer',
  'Free up several hours every week for work only you can do',
] as const;

const COMPARISON_TABLE_COLUMNS = [
  'Agencies',
  'Freelancers',
  'Scheduling Tools',
  'Sociogenie',
] as const;

const COMPARISON_TABLE_ROWS = [
  {
    criterion: 'Creates content',
    values: ['Yes', 'Yes', 'No', 'Yes'],
  },
  {
    criterion: 'Strategy included',
    values: ['Sometimes', 'Sometimes', 'No', 'Yes'],
  },
  {
    criterion: 'Human review',
    values: ['Yes', 'Varies', 'No', 'Yes — every post'],
  },
  {
    criterion: 'Auto publishing',
    values: ['No', 'No', 'Partial', 'Yes'],
  },
  {
    criterion: 'Platform-specific',
    values: ['Sometimes', 'Sometimes', 'No', 'Yes'],
  },
  {
    criterion: 'Affordable',
    values: ['No', 'Moderate', 'Yes', 'Yes'],
  },
  {
    criterion: 'Works without daily input',
    values: ['No', 'No', 'No', 'Yes, after setup'],
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
      'Our in-house review team checks every post before it goes live — for brand alignment, clarity, platform suitability, and quality. Standard turnaround is within 24 hours. You can also review and approve posts yourself if you prefer direct control.',
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
      'Credits are valid for 30 days. Your daily automated posts run independently — they continue regardless of your credit balance.',
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

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col font-(--font-sora) selection:bg-primary-blue/20 overflow-hidden relative">
      {/* Background */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-primary-blue/8 blur-[120px] rounded-full sm:w-[900px] sm:h-[900px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-primary-purple/8 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 left-[-10%] w-[400px] h-[400px] bg-primary-purple/5 blur-[100px] rounded-full" />
      </div>

      <NavBar />

      <main className="flex-1 relative z-10 flex flex-col">
        {/* Hero */}
        <section className="px-6 pt-24 text-center relative">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="mx-auto max-w-5xl relative z-10"
          >
            <motion.div variants={fadeIn} className="mb-8 flex justify-center">
              <span className="inline-flex items-center rounded-full border border-primary-blue/20 bg-primary-blue/5 px-5 py-2 text-xs font-bold text-primary-blue shadow-sm gap-2">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Powered by AI
              </span>
            </motion.div>
            <motion.h1
              variants={fadeIn}
              className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.1]"
            >
              <span className="bg-gradient-primary-text">
                Automate Your Social Media
              </span>
              <br className="" />
              with AI + Human Review{' '}
            </motion.h1>
            <motion.p
              variants={fadeIn}
              className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed font-(--font-dm-sans)"
            >
              Sociogenie plans, creates, reviews, and publishes content for
              Instagram, Facebook, and LinkedIn — helping your brand stay active
              without the weekly content grind.
            </motion.p>
            <motion.p
              variants={fadeIn}
              className="mx-auto mt-4 max-w-2xl text-base text-foreground/90 font-(--font-dm-sans)"
            >
              A smarter alternative to hiring an agency, managing a freelancer,
              or doing it all yourself.
            </motion.p>
            <motion.div
              variants={fadeIn}
              className="mt-10 flex flex-wrap justify-center gap-4"
            >
              <Link
                href="/sign-up"
                className="group flex items-center rounded-2xl bg-gradient-primary px-8 py-4 text-sm font-bold text-white overflow-hidden relative transition-all hover:shadow-2xl hover:shadow-primary-blue/30 active:scale-95 duration-300"
              >
                <span className="relative z-10 flex items-center">
                  Get Started
                  <Rocket className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 duration-200" />
                </span>
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
              </Link>
              <Link
                href="#how-it-works"
                className="group flex items-center rounded-2xl border border-border bg-card px-8 py-4 text-sm font-semibold text-foreground transition-all hover:bg-accent hover:shadow-lg duration-300"
              >
                See How It Works
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 duration-200" />
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Trust bar */}
        <section
          aria-label="Trust and platform highlights"
          className="border-b border-border/40 px-6 pb-8 pt-8"
        >
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="mx-auto max-w-full"
          >
            <p className="text-center text-pretty text-sm font-(--font-dm-sans) leading-relaxed text-muted-foreground sm:text-base">
              <span className="text-foreground/90">
                {TRUST_BAR_ITEMS.join(' \u00a0·\u00a0 ')}
              </span>
            </p>
          </motion.div>
        </section>

        {/* What Is Sociogenie? */}
        <section
          id="about"
          className="scroll-mt-24 border-y border-border/30 bg-accent/10 px-6 py-10"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="mx-auto max-w-full text-center"
          >
            <motion.p
              variants={fadeIn}
              className="text-pretty text-2xl font-extrabold leading-[1.2] tracking-tight text-foreground sm:text-3xl sm:leading-snug"
            >
              Sociogenie is an{' '}
              <span className="bg-gradient-primary-text">AI-powered</span>{' '}
              social media management system for small businesses
            </motion.p>
            <motion.p
              variants={fadeIn}
              className="mt-5 max-w-2xl text-pretty font-(--font-dm-sans) text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg mx-auto"
            >
              Combining automated content generation with human review and
              publishing.
            </motion.p>
          </motion.div>
        </section>

        {/* Problem */}
        <section className="px-6 py-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-48px' }}
            variants={stagger}
            className="mx-auto max-w-3xl"
          >
            <motion.h2
              variants={fadeIn}
              className="mb-4 text-pretty text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              Why social media is hard for most small businesses
            </motion.h2>
            <ul
              role="list"
              className="divide-y divide-border/50 overflow-hidden  px-4 sm:px-6"
            >
              {SOCIAL_MEDIA_PAIN_POINTS.map((text) => (
                <motion.li
                  key={text}
                  variants={fadeIn}
                  className="flex gap-3.5 py-2 tracking-tight font-(--font-dm-sans)"
                >
                  <span
                    className="relative mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center"
                    aria-hidden
                  >
                    <span className="absolute h-5 w-5 rounded-full bg-primary-blue/18" />
                    <span className="relative h-2 w-2 rounded-full bg-linear-to-br from-primary-blue to-primary-purple" />
                  </span>
                  <span className="min-w-0 text-pretty text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                    {text}
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </section>

        {/* Pain point cards */}
        <section
          aria-label="Common approaches and their drawbacks"
          className="px-6 pb-10 pt-2 sm:pb-14"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-48px' }}
            variants={stagger}
            className="mx-auto max-w-6xl"
          >
            <ul
              role="list"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5"
            >
              {PAIN_POINT_CARDS.map((card) => (
                <motion.li
                  key={card.title}
                  variants={fadeIn}
                  className="min-h-0"
                >
                  <article className="flex h-full flex-col rounded-2xl border border-border/50 bg-card/50 p-5 shadow-sm backdrop-blur-sm transition-shadow duration-300 hover:shadow-md sm:p-6">
                    <h3 className="text-base font-extrabold tracking-tight text-foreground sm:text-lg">
                      {card.title}
                    </h3>
                    <p className="mt-3 flex-1 text-pretty font-(--font-dm-sans) text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                      {card.description}
                    </p>
                  </article>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </section>

        {/* Comparison: more than a scheduling tool */}
        <section
          aria-labelledby="comparison-scheduling-heading"
          className="border-t border-border/40 bg-accent/10 px-6 py-10 sm:py-14"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-48px' }}
            variants={stagger}
            className="mx-auto max-w-3xl"
          >
            <motion.h2
              id="comparison-scheduling-heading"
              variants={fadeIn}
              className="text-pretty text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              More than a scheduling tool
            </motion.h2>
            <motion.div
              variants={fadeIn}
              className="mt-6 space-y-5 font-(--font-dm-sans) text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              <p className="text-pretty">
                Scheduling Tools help you publish content — but they still
                depend on you to decide what to post, write it, and maintain
                consistency every week.
              </p>
              <p className="text-pretty">
                Unlike scheduling tools that rely on content you create
                yourself, Sociogenie generates, reviews, and publishes content
                for you. It handles the parts of social media that actually take
                time: the strategy, the writing, the quality check, and the
                publishing — all built around your specific business.
              </p>
              <p className="text-pretty">
                If you&apos;re already using a scheduling tool and still
                spending hours on content every week, this is the layer that was
                missing.
              </p>
            </motion.div>
          </motion.div>
        </section>

        {/* Solution — AI + human review + publishing */}
        <section
          aria-labelledby="solution-pillars-heading"
          className="border-t border-border/40 px-6 py-10 sm:py-14"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-48px' }}
            variants={stagger}
            className="mx-auto max-w-6xl"
          >
            <motion.h2
              id="solution-pillars-heading"
              variants={fadeIn}
              className="mx-auto max-w-3xl text-pretty text-center text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              AI-generated content, human-reviewed before publishing
            </motion.h2>
            <motion.p
              variants={fadeIn}
              className="mx-auto mt-5 max-w-3xl text-pretty text-center font-(--font-dm-sans) text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg"
            >
              Sociogenie helps small businesses handle the hardest parts of
              social media: deciding what to post, creating the content,
              reviewing it for quality, and publishing it consistently — all in
              one system tailored to your brand.
            </motion.p>
            <ul
              role="list"
              className="mt-10 grid grid-cols-1 gap-4 md:mt-12 md:grid-cols-3 md:gap-5 lg:gap-6"
            >
              {SOLUTION_PILLARS.map((pillar, index) => (
                <motion.li
                  key={pillar.title}
                  variants={fadeIn}
                  className="min-h-0"
                >
                  <article className="flex h-full flex-col rounded-2xl border border-border/50 bg-card/55 p-5 shadow-sm backdrop-blur-sm transition-shadow duration-300 hover:shadow-md sm:p-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary-blue">
                      Pillar {index + 1}
                    </p>
                    <h3 className="mt-3 text-pretty text-base font-extrabold leading-snug tracking-tight text-foreground sm:text-lg">
                      {pillar.title}
                    </h3>
                    <p className="mt-3 flex-1 text-pretty font-(--font-dm-sans) text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                      {pillar.description}
                    </p>
                  </article>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </section>

        {/* How It Works — solution walkthrough */}
        <section
          id="how-it-works"
          className="scroll-mt-24 px-6 pt-8 border-y border-border/30 bg-accent/10"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mx-auto max-w-4xl"
          >
            <motion.h2
              variants={fadeIn}
              className="text-2xl font-extrabold text-foreground sm:text-3xl mb-6"
            >
              Set up once. Your content runs from there.{' '}
            </motion.h2>
            <ol className="space-y-6 font-(--font-dm-sans)">
              <motion.li variants={fadeIn} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-blue/20 text-primary-blue font-bold text-sm">
                  1
                </span>
                <div>
                  <strong className="text-foreground">
                    Build your brand profile (~10 minutes)
                  </strong>{' '}
                  — Add your business details, tone of voice, and target
                  audience. This is what makes your content feel specific to
                  your brand instead of generic.
                </div>
              </motion.li>
              <motion.li variants={fadeIn} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-blue/20 text-primary-blue font-bold text-sm">
                  2
                </span>
                <div>
                  <strong className="text-foreground">
                    Connect your platforms
                  </strong>{' '}
                  — Link Instagram, Facebook, and LinkedIn securely. One-click
                  authorisation, no technical setup required.
                </div>
              </motion.li>
              <motion.li variants={fadeIn} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-blue/20 text-primary-blue font-bold text-sm">
                  3
                </span>
                <div>
                  <strong className="text-foreground">
                    AI builds your content calendar
                  </strong>{' '}
                  — Sociogenie builds a content calendar tailored to your
                  business, audience, and posting goals — the right mix of
                  content types and messaging for your platforms.
                </div>
              </motion.li>
              <motion.li variants={fadeIn} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-blue/20 text-primary-blue font-bold text-sm">
                  4
                </span>
                <div>
                  <strong className="text-foreground">
                    Human team reviews before publishing
                  </strong>{' '}
                  — Every post goes to our review team. They check for brand
                  fit, clarity, and quality. Content is ready within 24 hours.
                  You can also review and approve posts yourself if you prefer.
                </div>
              </motion.li>
              <motion.li variants={fadeIn} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-blue/20 text-primary-blue font-bold text-sm">
                  5
                </span>
                <div>
                  <strong className="text-foreground">
                    Content publishes automatically
                  </strong>{' '}
                  — Approved posts are scheduled and published at peak
                  engagement times. No manual work required after setup.
                </div>
              </motion.li>
            </ol>
            <motion.p
              variants={fadeIn}
              className="mt-6 text-foreground font-(--font-dm-sans)"
            >
              Fully hands-free after setup.
            </motion.p>
            <Link
              href="/sign-up"
              className="group flex items-center rounded-2xl bg-gradient-primary px-8 py-4 text-sm font-bold text-white overflow-hidden relative transition-all hover:shadow-2xl hover:shadow-primary-blue/30 active:scale-95 duration-300 max-w-fit mx-auto"
            >
              <span className="relative z-10 flex items-center">
                Get Started
                <Rocket className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 duration-200" />
              </span>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
            </Link>
          </motion.div>
        </section>

        {/* Human Review Explainer */}
        <section
          aria-labelledby="human-review-explainer-heading"
          className="px-6 pt-10 pb-4 sm:pb-6"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-48px' }}
            variants={stagger}
            className="mx-auto max-w-3xl"
          >
            <motion.h2
              id="human-review-explainer-heading"
              variants={fadeIn}
              className="text-pretty text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              What &quot;human-reviewed&quot; actually means
            </motion.h2>
            <motion.div
              variants={fadeIn}
              className="mt-5 space-y-4 font-(--font-dm-sans) text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg"
            >
              <p className="text-pretty">
                Every post Sociogenie generates goes through a structured review
                before it reaches your audience.
              </p>
              <p className="text-pretty font-semibold text-foreground">
                Our team checks:
              </p>
            </motion.div>
            <motion.ul
              variants={fadeIn}
              role="list"
              className="mt-4 space-y-3 font-(--font-dm-sans) sm:mt-5"
            >
              {HUMAN_REVIEW_CHECKS.map((line) => (
                <li key={line} className="flex gap-3 text-pretty">
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-primary-blue"
                    aria-hidden
                  />
                  <span className="text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                    {line}
                  </span>
                </li>
              ))}
            </motion.ul>
            <motion.div
              variants={fadeIn}
              className="mt-8 space-y-4 font-(--font-dm-sans) text-base leading-relaxed text-muted-foreground sm:mt-10 sm:text-lg"
            >
              <p className="text-pretty">
                <strong className="text-foreground">
                  Standard review time:
                </strong>{' '}
                within 24 hours.
              </p>
              <p className="text-pretty">
                You can also choose to review and approve posts yourself before
                they go live.
              </p>
            </motion.div>
            <motion.aside
              variants={fadeIn}
              className="mt-8 rounded-2xl border border-primary-blue/25 bg-linear-to-br from-primary-blue/8 via-card/80 to-primary-purple/8 p-5 shadow-sm sm:mt-10 sm:p-6"
            >
              <p className="text-pretty font-(--font-dm-sans) text-sm leading-relaxed text-foreground sm:text-base">
                This is the core difference between Sociogenie and AI tools that
                publish content without any checks.
              </p>
            </motion.aside>
          </motion.div>
        </section>

        {/* Features */}
        <section
          id="features"
          aria-labelledby="product-features-heading"
          className="border-t border-border/40 px-6 py-10 sm:py-14"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-48px' }}
            variants={stagger}
            className="mx-auto max-w-6xl"
          >
            <motion.h2
              id="product-features-heading"
              variants={fadeIn}
              className="mx-auto max-w-3xl text-pretty text-center text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              Everything your social media needs, in one system
            </motion.h2>
            <ul
              role="list"
              className="mt-10 grid grid-cols-1 gap-4 md:mt-12 md:grid-cols-2 md:gap-5 lg:gap-6"
            >
              {PRODUCT_FEATURES.map((feature, index) => (
                <motion.li
                  key={feature.title}
                  variants={fadeIn}
                  className="min-h-0"
                >
                  <article className="flex h-full flex-col rounded-2xl border border-border/50 bg-card/50 p-5 shadow-sm backdrop-blur-sm transition-shadow duration-300 hover:shadow-md sm:p-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary-blue">
                      Feature {index + 1}
                    </p>
                    <h3 className="mt-3 text-pretty text-base font-extrabold leading-snug tracking-tight text-foreground sm:text-lg">
                      {feature.title}
                    </h3>
                    <p className="mt-3 flex-1 text-pretty font-(--font-dm-sans) text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                      {feature.description}
                    </p>
                  </article>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </section>

        {/* Outcomes / Proof */}
        <section
          aria-labelledby="outcomes-proof-heading"
          className="border-t border-border/40 bg-accent/10 px-6 py-10 sm:py-10"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-48px' }}
            variants={stagger}
            className="mx-auto max-w-4xl"
          >
            <motion.h2
              id="outcomes-proof-heading"
              variants={fadeIn}
              className="text-pretty text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              What changes when you stop managing content manually
            </motion.h2>
            <motion.p
              variants={fadeIn}
              className="mt-5 max-w-3xl text-pretty font-(--font-dm-sans) text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg"
            >
              Most small business owners who manage social media themselves
              spend 5–10 hours a week on content creation alone — before
              accounting for strategy, scheduling, and review. Sociogenie
              replaces most of that workload.
            </motion.p>
            <ul
              role="list"
              className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5"
            >
              {OUTCOME_CARDS.map((text) => (
                <motion.li key={text} variants={fadeIn} className="min-h-0">
                  <article className="flex h-full items-start gap-3 rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm backdrop-blur-sm transition-shadow duration-300 hover:shadow-md sm:p-6">
                    <TrendingUp
                      className="mt-0.5 h-5 w-5 shrink-0 text-primary-blue"
                      aria-hidden
                    />
                    <p className="text-pretty font-(--font-dm-sans) text-sm leading-snug text-foreground sm:text-[15px]">
                      {text}
                    </p>
                  </article>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </section>

        {/* Comparison table */}
        <section
          id="compare"
          aria-labelledby="comparison-table-heading"
          className="scroll-mt-24 border-t border-border/40 px-6 py-10 sm:py-14"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-48px' }}
            variants={stagger}
            className="mx-auto max-w-5xl"
          >
            <motion.h2
              id="comparison-table-heading"
              variants={fadeIn}
              className="text-pretty text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              How Sociogenie compares
            </motion.h2>
            <motion.div
              variants={fadeIn}
              className="mt-8 overflow-x-auto rounded-2xl border border-border/50 bg-card/40 shadow-sm [-webkit-overflow-scrolling:touch]"
            >
              <table className="w-full min-w-[640px] border-collapse text-left font-(--font-dm-sans) text-sm">
                <caption className="sr-only">
                  Comparison of Sociogenie with agencies, freelancers, and
                  scheduling tools across content, strategy, review, and
                  publishing.
                </caption>
                <thead>
                  <tr className="border-b border-border/60 bg-accent/30">
                    <th
                      scope="col"
                      className="sticky top-0 z-10 w-[min(28%,220px)] px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-muted-foreground sm:px-5 sm:py-4 sm:text-sm sm:normal-case sm:tracking-normal"
                    >
                      <span className="sr-only">Criterion</span>
                    </th>
                    {COMPARISON_TABLE_COLUMNS.map((col, colIndex) => (
                      <th
                        key={col}
                        scope="col"
                        className={cn(
                          'sticky top-0 z-10 px-3 py-3.5 text-center text-xs font-bold text-foreground sm:px-4 sm:py-4 sm:text-sm',
                          colIndex === COMPARISON_TABLE_COLUMNS.length - 1 &&
                            'bg-primary-blue/12 text-primary-blue'
                        )}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_TABLE_ROWS.map((row) => (
                    <tr
                      key={row.criterion}
                      className="border-b border-border/40 last:border-b-0"
                    >
                      <th
                        scope="row"
                        className="w-[min(28%,220px)] px-4 py-3 text-[13px] font-semibold leading-snug text-foreground sm:px-5 sm:py-3.5 sm:text-sm"
                      >
                        {row.criterion}
                      </th>
                      {row.values.map((cell, i) => (
                        <td
                          key={`${row.criterion}-${COMPARISON_TABLE_COLUMNS[i]}`}
                          className={cn(
                            'px-3 py-3 text-center text-[13px] leading-snug text-muted-foreground sm:px-4 sm:py-3.5 sm:text-sm',
                            i === row.values.length - 1 &&
                              'bg-primary-blue/8 text-foreground'
                          )}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
            <motion.p
              variants={fadeIn}
              className="mt-6 max-w-3xl text-pretty font-(--font-dm-sans) text-sm leading-relaxed text-muted-foreground sm:mt-8 sm:text-base"
            >
              Scheduling tools are excellent at publishing content you&apos;ve
              already created. Sociogenie creates, reviews, and publishes it —{' '}
              it&apos;s a different category.
            </motion.p>
          </motion.div>
        </section>

        <section
          id="faq"
          className="scroll-mt-24 px-6 py-10 border-b border-border/30 bg-background"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mx-auto max-w-4xl"
          >
            <motion.h2
              variants={fadeIn}
              className="text-2xl font-extrabold text-foreground sm:text-3xl mb-6"
            >
              Common questions
            </motion.h2>
            <motion.div variants={fadeIn}>
              <Accordion
                type="single"
                collapsible
                className="rounded-xl border border-border/50 bg-accent/5 font-(--font-dm-sans) divide-y divide-border/40 overflow-hidden "
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
                    <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-4 pt-0 sm:text-[0.9375rem]">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </motion.div>
        </section>
        {/* Final CTA */}
        <section className="px-6 py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-primary-blue/5 to-primary-purple/5 pointer-events-none" />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mx-auto max-w-4xl text-center relative z-10"
          >
            <motion.h2
              variants={fadeIn}
              className="text-2xl font-extrabold text-foreground sm:text-4xl mb-4"
            >
              Start with 2 months of Elite — on the house
            </motion.h2>
            <motion.p
              variants={fadeIn}
              className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto font-(--font-dm-sans)"
            >
              Set up your brand profile in under 10 minutes. Your content will
              be reviewed and ready within 24 hours. Claim Elite from Billing after
              you sign up — no payment required for the promotional period.
            </motion.p>
            <motion.div
              variants={fadeIn}
              className="flex flex-col items-center gap-4"
            >
              <Link
                href="/sign-up"
                className="group inline-flex items-center rounded-2xl bg-gradient-primary px-10 py-4 text-base font-bold text-white overflow-hidden relative transition-all hover:shadow-2xl hover:shadow-primary-blue/30 active:scale-95 duration-300"
              >
                <span className="relative z-10 flex items-center">
                  Get Started Free
                  <Rocket className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1 duration-200" />
                </span>
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
              </Link>
              <p className="text-sm text-muted-foreground font-(--font-dm-sans)">
                No payment for 2 months of Elite · Cancel anytime after that
              </p>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
//
