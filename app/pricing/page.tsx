'use client';

import { useState, useEffect } from 'react';
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
import { ArrowRight, Dot } from 'lucide-react';
import { useServerSession } from '@/hooks/useServerSession';
import { lockBodyScroll } from '@/lib/body-scroll-lock';
import {
  CREDIT_TOPUP_PACKS,
  PRICING_PLANS_BY_ID,
  pricingPlansForMode,
  planButtonDisplayName,
  type PlanMode,
} from '@/lib/landing-pricing';
import {
  PriceDisplay,
  InlinePrice,
  PricingDisclaimer,
} from '@/components/pricing/price-display';
import { CurrencySwitcher } from '@/components/pricing/currency-switcher';

const NAV_ITEMS = [
  { label: 'How It Works', href: '/product#how-it-works' },
  { label: 'Features', href: '/product#features' },
  { label: 'How It Looks', href: '/how-it-looks' },
  { label: 'Pricing', href: '/product#pricing' },
  { label: 'FAQ', href: '/product#faq' },
] as const;

const BILLING_FAQ_ITEMS = [
  {
    question: 'Do I need to enter payment details?',
    answer:
      'Yes. A valid payment method is required when you subscribe to a paid plan.',
  },
  {
    question: 'Can I buy extra credits?',
    answer:
      'Yes. Top-up credit packs are available from Billing while you have an active subscription.',
  },
  {
    question: 'What happens to unused credits?',
    answer:
      "Plan credits reset to your plan's monthly allowance at the start of each billing cycle — unused plan credits don't roll over. Credit packs you buy separately stay valid for 30 days from purchase.",
  },
  {
    question: "Does the AI Plan's automated posting use my credits?",
    answer:
      "No. Your AI Plan calendar runs on your subscription and never touches your credit balance. Credits are only spent when you manually trigger something — Create Post, Product Posts, Campaigns, Occasion Posts, Carousel Posts, or Videos — outside the automated calendar.",
  },
  {
    question: 'In what order are my credits spent?',
    answer:
      "Plan credits are spent first. Once those run out, any top-up pack credits you've purchased are used next.",
  },
  {
    question: 'Can I cancel or pause my subscription?',
    answer: 'Yes. No long-term contracts — cancel anytime from your account settings.',
  },
] as const;

const CREDIT_ACTIONS = [
  { label: 'Product Posts', credits: '4 credits (6 for a full social ad)' },
  { label: 'Campaign post', credits: '3 credits / day' },
  { label: 'Create Post', credits: '2 credits' },
  { label: 'Occasion Posts', credits: '2 credits' },
  { label: 'Carousel Posts', credits: '3 credits / slide' },
  { label: 'Videos', credits: '15 credits' },
  { label: 'Regeneration', credits: '1 credit (First regen free)' },
] as const;

/** All four active plans, for `Offer` JSON-LD — matches `PRICING_PLANS_BY_ID`. */
const PRICING_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'SocioGenie',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'AI social media management for small businesses — automated and on-demand content for Instagram, Facebook and LinkedIn.',
  url: 'https://www.sociogenie.ai/pricing',
  // Always USD, never the localised display figure: schema states the price
  // actually settled, and this is what AI assistants and search engines quote.
  offers: Object.values(PRICING_PLANS_BY_ID).map((plan) => ({
    '@type': 'Offer',
    name: plan.name,
    price: plan.priceUsd.toFixed(2),
    priceCurrency: 'USD',
    url: 'https://www.sociogenie.ai/pricing',
  })),
} as const;

const BILLING_FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: BILLING_FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
} as const;

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

export default function PricingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  /** "Studio" = manual mode (you curate every post). "AI" = auto mode
   *  (daily orchestrator generates posts automatically). Pricing + credit
   *  counts differ between the two within the same tier. */
  const [planMode, setPlanMode] = useState<PlanMode>('AutoPilot');
  const visiblePlans = pricingPlansForMode(planMode);
  const signedIn = useServerSession() === true;

  useEffect(() => {
    if (!mobileNavOpen) return;
    return lockBodyScroll();
  }, [mobileNavOpen]);

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <div className="min-h-screen flex flex-col font-(--font-sora) selection:bg-primary-blue/20 overflow-hidden relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(PRICING_JSON_LD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BILLING_FAQ_JSON_LD) }}
      />
      <button
        type="button"
        aria-label="Close menu"
        className={cn(
          'fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px] transition-opacity duration-300 md:hidden',
          mobileNavOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        )}
        onClick={closeMobileNav}
        tabIndex={mobileNavOpen ? 0 : -1}
      />

      <AppGradientBackground variant="vivid" />

      <header className="fixed top-0 z-50 w-full border-b border-default bg-[color-mix(in_srgb,var(--bg-screen)_85%,transparent)] backdrop-blur-2xl">
        <nav className="relative mx-auto flex h-16 w-full max-w-[1328px] items-center justify-between gap-4 px-6">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 sm:gap-3 group"
            onClick={closeMobileNav}
          >
            <img
              src="/logo.png"
              alt="SocioGenie"
              className="h-10 w-10 shrink-0 rounded-xl transition-expo sm:h-12 sm:w-12"
            />
            <span className="truncate text-xl font-semibold tracking-[-0.04em] text-default sm:text-2xl">
              SocioGenie
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex h-9 items-center rounded-full px-3 text-sm font-medium transition-expo',
                  item.href === '/product#pricing'
                    ? 'nav-active'
                    : 'text-secondary hover:bg-element hover:text-default'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            {signedIn ? (
              <Link
                href="/home"
                className="group relative inline-flex items-center justify-center rounded-full btn-brand-fill h-9 px-4 text-sm font-medium transition-expo"
              >
                <span className="relative z-10 flex items-center">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4 transition-expo-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ) : (
              <>
                <GuestAuthLink
                  href="/sign-in"
                  className="inline-flex h-9 items-center rounded-full px-4 text-sm font-medium text-secondary transition-expo hover:bg-element hover:text-default"
                >
                  Login
                </GuestAuthLink>
                <GuestAuthLink
                  href="/sign-up"
                  className="btn-brand-fill group inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium"
                >
                  <span className="relative z-10 flex items-center">
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4 transition-expo-transform group-hover:translate-x-0.5" />
                  </span>
                </GuestAuthLink>
              </>
            )}
          </div>
          <button
            type="button"
            className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-default bg-background/80 text-default transition-expo hover:bg-hover md:hidden"
            aria-expanded={mobileNavOpen}
            aria-controls="pricing-mobile-nav"
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            <span
              aria-hidden
              className={cn(
                'absolute left-1/2 top-[13px] block h-0.5 w-[22px] -translate-x-1/2 rounded-full bg-current transition-expo ease-[cubic-bezier(0.4,0,0.2,1)]',
                mobileNavOpen && 'top-1/2/2 rotate-45'
              )}
            />
            <span
              aria-hidden
              className={cn(
                'absolute left-1/2 top-1/2 block h-0.5 w-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-current transition-expo ease-[cubic-bezier(0.4,0,0.2,1)]',
                mobileNavOpen && 'scale-x-0 opacity-0'
              )}
            />
            <span
              aria-hidden
              className={cn(
                'absolute bottom-[13px] left-1/2 block h-0.5 w-[22px] -translate-x-1/2 rounded-full bg-current transition-expo ease-[cubic-bezier(0.4,0,0.2,1)]',
                mobileNavOpen && 'bottom-1/2/2 -rotate-45'
              )}
            />
          </button>
        </nav>

        <div
          id="pricing-mobile-nav"
          className={cn(
            'overflow-hidden border-t border-default bg-background/98 backdrop-blur-2xl shadow-[0_18px_40px_-12px_rgba(0,0,0,0.18)] transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] md:hidden',
            mobileNavOpen
              ? 'max-h-[min(85vh,560px)] opacity-100'
              : 'pointer-events-none max-h-0 border-t-transparent opacity-0'
          )}
          aria-hidden={!mobileNavOpen}
        >
          <div className="flex max-h-[min(85vh,560px)] flex-col gap-1 overflow-y-auto px-4 py-4 pb-6">
            <p className="px-4 pb-2 text-eyebrow">Navigate</p>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-3 text-base font-medium text-secondary transition-expo hover:bg-element hover:text-default"
                onClick={closeMobileNav}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-2 border-t border-default pt-4">
              <p className="px-4 pb-2 text-eyebrow">Account</p>
              {signedIn ? (
                <Link
                  href="/home"
                  className="group relative flex items-center justify-center overflow-hidden rounded-full btn-brand-fill px-4 py-3.5 text-base font-medium transition-expo"
                  onClick={closeMobileNav}
                >
                  <span className="relative z-10 flex items-center">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4 transition-expo-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ) : (
                <>
                  <GuestAuthLink
                    href="/sign-in"
                    className="rounded-full border border-default bg-transparent px-4 py-3 text-center text-base font-medium text-default transition-expo hover:bg-element"
                    onClick={closeMobileNav}
                  >
                    Login
                  </GuestAuthLink>
                  <GuestAuthLink
                    href="/sign-up"
                    className="btn-brand-fill group flex items-center justify-center rounded-full px-4 py-3.5 text-base font-medium"
                    onClick={closeMobileNav}
                  >
                    <span className="relative z-10 flex items-center">
                      Get Started Free
                      <ArrowRight className="ml-2 h-4 w-4 transition-expo-transform group-hover:translate-x-0.5" />
                    </span>
                  </GuestAuthLink>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-[var(--nav-offset,5.5rem)] sm:pt-24">
        <section className="px-6 py-10 sm:py-14">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="mx-auto max-w-6xl"
          >
            <motion.h1
              variants={fadeIn}
              className="text-display-2 text-default mb-4 text-center text-balance"
            >
              Pricing
            </motion.h1>
            <motion.p
              variants={fadeIn}
              className="mx-auto mb-6 max-w-2xl text-center text-sm text-secondary sm:text-base font-(--font-dm-sans) text-pretty"
            >
              Pricing for our plans and credit packs. No contracts — cancel
              anytime.
            </motion.p>
            <motion.p
              variants={fadeIn}
              className="mx-auto mb-6 max-w-2xl text-center text-sm text-tertiary font-(--font-dm-sans) text-pretty"
            >
              Studio starts at <InlinePrice usd={14.99} />/month with 100
              credits for manual content. AI Plans start at{' '}
              <InlinePrice usd={49.99} />/month and add a fully automated
              monthly calendar — every plan includes human review before
              publishing.
            </motion.p>

            <motion.div
              variants={fadeIn}
              className="mb-8 flex justify-center"
            >
              <CurrencySwitcher />
            </motion.div>

            {/* Mode toggle: one manual Studio plan or the AI tier catalog. */}
            <div
              role="tablist"
              aria-label="Plan mode"
              className="mx-auto mb-8 flex w-full max-w-fit items-center justify-center gap-1 rounded-full border border-default bg-element p-1 backdrop-blur-sm"
            >
              {(['AutoPilot', 'Studio'] as const).map((mode) => {
                const selected = planMode === mode;
                const label = mode === 'Studio' ? 'Studio' : 'AI';
                const sublabel =
                  mode === 'Studio'
                    ? 'You create every post'
                    : 'Personalized AI';
                return (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setPlanMode(mode)}
                    className={cn(
                      'rounded-full  px-5 py-2 text-sm font-semibold transition-expo focus:outline-none focus:ring-2 focus:ring-strong',
                      selected
                        ? 'bg-foreground text-background'
                        : 'text-secondary hover:text-default'
                    )}
                  >
                    <span className="block leading-none">{label}</span>
                    <span className="mt-0.5 block text-[10px] font-medium opacity-80">
                      {sublabel}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              className={cn(
                'grid gap-6 items-stretch mx-auto',
                visiblePlans.length === 1
                  ? 'max-w-md'
                  : 'max-w-6xl md:grid-cols-3'
              )}
            >
              {visiblePlans.map((p) => (
                <motion.div
                  variants={scaleIn}
                  key={p.name}
                  className={cn(
                    'group relative flex h-full min-h-0 flex-col rounded-3xl p-8 border transition-expo overflow-visible',
                    p.highlighted
                      ? 'border-2 border-primary-blue bg-default z-10'
                      : 'border-default bg-default',
                    p.comingSoon && 'opacity-95'
                  )}
                >
                  {!p.comingSoon && p.discountLabel ? (
                    <div className="absolute right-[-42px] top-6 z-20 w-44 rotate-45 bg-gradient-to-r from-[var(--red-9)] to-[var(--amber-9)] px-2 py-1 text-center text-[10px] font-extrabold uppercase tracking-wider text-white">
                      {p.discountLabel} Limited Offer
                    </div>
                  ) : null}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary-blue/10 to-transparent" />
                  {p.highlighted ? (
                    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                      <div className="absolute -left-1/3 top-0 h-full w-1/2 -skew-x-12 bg-default blur-xl opacity-60 transition-transform duration-1000 group-hover:translate-x-[210%]" />
                    </div>
                  ) : null}
                  {p.badge ? (
                    <div className="absolute -top-4 left-0 right-0 mx-auto w-max min-w-max max-w-[calc(100%-1rem)] rounded-full bg-gradient-primary px-4 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-white sm:text-xs">
                      {p.badge}
                    </div>
                  ) : null}
                  <h2 className="text-section text-default">{p.name}</h2>
                  <div className="mb-6 mt-5">
                    {!p.comingSoon && (p.originalPrice || p.discountLabel) ? (
                      <div className="mb-2 flex items-center gap-2 font-(--font-dm-sans)">
                        {p.originalPrice ? (
                          <span className="rounded-full bg-element px-2 py-0.5 text-base font-semibold text-secondary line-through decoration-2 decoration-rose-500/80">
                            {p.originalPrice}
                          </span>
                        ) : null}
                        {/* {p.discountLabel ? (
                          <span className="rounded-full bg-success px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-success ring-1 ring-[var(--border-success)]">
                            Save {p.discountLabel}
                          </span>
                        ) : null} */}
                      </div>
                    ) : null}
                    <PriceDisplay
                      usd={p.priceUsd}
                      period={p.period}
                      amountClassName={cn(
                        'font-black tracking-tight text-default drop-shadow-[0_6px_20px_rgba(59,130,246,0.24)]',
                        p.comingSoon ? 'text-2xl sm:text-3xl' : 'text-5xl'
                      )}
                    />
                  </div>
                  <ul className="space-y-2.5 text-sm text-secondary font-(--font-dm-sans)">
                    {p.lines.map((line) => (
                      <li
                        key={`${p.name}-${line.text}`}
                        className={cn(
                          'flex gap-2.5 mb-5 text-pretty leading-snug items-center',
                          line.sub ? 'pl-1 text-[13px]' : 'items-center'
                        )}
                      >
                        {line.sub ? (
                          <span
                            className="mt-0.5 shrink-0 text-secondary/80"
                            aria-hidden
                          >
                            <ArrowRight className="size-4" />
                          </span>
                        ) : (
                          <span className="shrink-0 text-secondary" aria-hidden>
                            <Dot />
                          </span>
                        )}
                        <span
                          className={cn(
                            line.sub && 'text-secondary',
                            'flex items-center justify-center'
                          )}
                        >
                          {line.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto w-full pt-6">
                    {p.comingSoon ? (
                      <div
                        className="block w-full rounded-xl border border-dashed border-default bg-element py-3.5 text-center text-sm font-bold text-secondary cursor-not-allowed"
                        aria-disabled
                      >
                        Coming soon
                      </div>
                    ) : (
                      <GuestAuthLink
                        href="/sign-up"
                        className={cn(
                          'flex flex-col items-center justify-center gap-0.5 w-full rounded-full py-3.5 text-center transition-expo relative overflow-hidden',
                          p.highlighted
                            ? 'bg-gradient-primary text-white hover:opacity-95'
                            : p.discountLabel
                              ? 'bg-foreground text-background hover:bg-foreground/90'
                              : 'bg-hover text-default hover:bg-hover'
                        )}
                      >
                        <span className="relative z-10 text-sm font-bold leading-tight">
                          Start {planButtonDisplayName(p.name)}
                        </span>
                        <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full transition-transform duration-700 group-hover:translate-x-full" />
                      </GuestAuthLink>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            <PricingDisclaimer className="mx-auto mt-8 max-w-2xl text-center" />
          </motion.div>
        </section>

        <section className="px-6 py-10 border-y border-default bg-hover">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mx-auto max-w-4xl"
          >
            <motion.h2
              variants={fadeIn}
              className="text-2xl font-extrabold text-default sm:text-3xl mb-3"
            >
              What are credits?
            </motion.h2>
            <motion.p
              variants={fadeIn}
              className="text-secondary font-(--font-dm-sans) mb-6 leading-relaxed"
            >
              Credits pay for content you generate on demand — product posts,
              quick creates, campaigns, occasion posts, carousels, and videos.
              If you&apos;re on an AI Plan, your automated monthly calendar (19
              pieces of content per cycle, plus seasonal posts) runs on your
              subscription and never touches this balance.
            </motion.p>
            <motion.p
              variants={fadeIn}
              className="text-sm font-semibold text-default mb-2 font-(--font-dm-sans)"
            >
              Credits used per action by manual trigger:
            </motion.p>
            <motion.ul
              variants={fadeIn}
              className="mb-8 space-y-1.5 text-sm text-secondary font-(--font-dm-sans)"
              aria-label="Credits per action"
            >
              {CREDIT_ACTIONS.map((row) => (
                <li key={row.label}>
                  · {row.label}: {row.credits}
                </li>
              ))}
            </motion.ul>

            <motion.h3
              variants={fadeIn}
              className="text-lg font-bold text-default mb-3"
            >
              Credit packs
            </motion.h3>
            <motion.p
              variants={fadeIn}
              className="text-secondary font-(--font-dm-sans) mb-4 leading-relaxed max-w-xl"
            >
              Add credits on top of your plan allowance. Purchased pack credits
              are valid for 30 days from purchase.
            </motion.p>
            <motion.h4
              variants={fadeIn}
              className="text-base font-bold text-default mb-3"
            >
              Packs
            </motion.h4>
            <ul
              role="list"
              className="max-w-md rounded-xl border border-default font-(--font-dm-sans) text-sm divide-y divide-border/40 overflow-hidden"
            >
              {CREDIT_TOPUP_PACKS.map((pack) => (
                <li
                  key={pack.name}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 px-4 py-3 text-secondary sm:gap-x-6 sm:px-5"
                >
                  <span className="font-medium text-default">{pack.name}</span>
                  <span className="tabular-nums text-secondary">
                    <InlinePrice usd={pack.priceUsd} />
                  </span>
                  <span className="text-right tabular-nums">
                    {pack.credits}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-secondary rounded-full bg-subtle px-2 py-0.5 justify-self-end">
                    30 days
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </section>

        <section className="px-6 py-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mx-auto max-w-4xl"
          >
            <motion.h2
              variants={fadeIn}
              className="text-2xl font-extrabold text-default sm:text-3xl mb-3"
            >
              Who is Elite for?
            </motion.h2>
            <motion.p
              variants={fadeIn}
              className="text-secondary font-(--font-dm-sans) text-sm sm:text-base leading-relaxed max-w-2xl"
            >
              Sign up, then subscribe to Elite from Billing — our most popular
              plan for teams scaling content with AI or Studio mode.
            </motion.p>
          </motion.div>
        </section>

        <section className="px-6 py-10 border-t border-default bg-background">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mx-auto max-w-4xl"
          >
            <motion.h2
              variants={fadeIn}
              className="text-2xl font-extrabold text-default sm:text-3xl mb-6"
            >
              Billing FAQ
            </motion.h2>
            <motion.div variants={fadeIn}>
              <Accordion
                type="single"
                collapsible
                className="rounded-xl border border-default bg-hover font-(--font-dm-sans) divide-y divide-border/40 overflow-hidden"
              >
                {BILLING_FAQ_ITEMS.map((item, i) => (
                  <AccordionItem
                    key={item.question}
                    value={`billing-faq-${i}`}
                    className="border-0 px-4 sm:px-5"
                  >
                    <AccordionTrigger className="py-4 text-sm font-semibold text-default hover:no-underline sm:text-[0.9375rem] cursor-pointer text-left">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-secondary text-sm leading-relaxed pb-4 pt-0 sm:text-[0.9375rem]">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </motion.div>
        </section>

        <section className="px-6 py-16 sm:py-20">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mx-auto max-w-3xl text-center"
          >
            <motion.div variants={fadeIn}>
              <GuestAuthLink
                href="/sign-up"
                className="btn-brand-fill group inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-medium"
              >
                <span className="flex items-center">
                  Create account
                  {/* &amp; claim {PRICING_PLANS[1].name} */}
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1 duration-200" />
                </span>
              </GuestAuthLink>
              <p className="mt-4 text-sm text-secondary font-(--font-dm-sans)">
                Choose a plan after sign-in · Cancel anytime
              </p>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
