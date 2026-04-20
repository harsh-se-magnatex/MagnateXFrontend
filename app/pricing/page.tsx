'use client';

import { useState, useEffect } from 'react';
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
import { ArrowRight, Dot } from 'lucide-react';
import {
  CREDIT_TOPUP_PACKS,
  PRICING_PLANS,
} from '@/lib/landing-pricing';

const NAV_ITEMS = [
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Features', href: '/#features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/#faq' },
] as const;

const BILLING_FAQ_ITEMS = [
  {
    question: 'What does the Elite offer include?',
    answer:
      'New accounts get full Elite access for two months at no charge: up to two platforms, monthly credits for on-demand features, and your daily automated posting workflow.',
  },
  {
    question: 'Do I need to enter payment details?',
    answer:
      'No. Claim Elite from Billing after you sign in — there is no checkout during this promotional period.',
  },
  {
    question: 'Can I buy extra credits?',
    answer:
      'Credit top-ups are not available during this promotion. Your Elite allowance is included for the promotional window.',
  },
  {
    question: 'What happens to unused credits?',
    answer:
      'Credits expire at the end of your current allowance period. Daily automated posts run on their own schedule.',
  },
  {
    question: 'How long does the promotion last?',
    answer:
      'Complimentary Elite access runs for two months from the day you claim it in Billing.',
  },
] as const;

const CREDIT_ACTIONS = [
  { label: 'Product Advert post', credits: '4 credits' },
  { label: 'Instant generation post', credits: '2 credits' },
  { label: 'Festive post', credits: '2 credits' },
  { label: 'Regeneration post', credits: '1 credit' },
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

export default function PricingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <div className="min-h-screen flex flex-col font-(--font-sora) selection:bg-primary-blue/20 overflow-hidden relative">
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

      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-primary-blue/8 blur-[120px] rounded-full sm:w-[900px] sm:h-[900px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-primary-purple/8 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 left-[-10%] w-[400px] h-[400px] bg-primary-purple/5 blur-[100px] rounded-full" />
      </div>

      <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/70 backdrop-blur-2xl supports-backdrop-filter:bg-background/50">
        <nav className="relative mx-auto flex w-full items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 sm:gap-3 group"
            onClick={closeMobileNav}
          >
            <img
              src="/logo.png"
              alt="SocioGenie"
              className="h-10 w-10 shrink-0 rounded-xl shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300 sm:h-12 sm:w-12"
            />
            <span className="truncate text-xl font-extrabold tracking-tight bg-gradient-primary-text sm:text-2xl">
              SocioGenie
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative text-sm font-medium transition-colors after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-linear-to-r after:from-primary-blue after:to-primary-purple after:transition-all after:duration-300 hover:after:w-full',
                  item.href === '/pricing'
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-foreground/70 transition-all hover:text-foreground hover:bg-accent/80 duration-200"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="group relative inline-flex items-center justify-center rounded-xl bg-gradient-primary px-6 py-2.5 text-sm font-bold text-white overflow-hidden transition-all hover:shadow-xl hover:shadow-primary-blue/25 active:scale-95 duration-300"
            >
              <span className="relative z-10 flex items-center">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 duration-200" />
              </span>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
            </Link>
          </div>
          <button
            type="button"
            className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/80 text-foreground shadow-sm transition-colors hover:bg-accent md:hidden"
            aria-expanded={mobileNavOpen}
            aria-controls="pricing-mobile-nav"
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            <span
              aria-hidden
              className={cn(
                'absolute left-1/2 top-[13px] block h-0.5 w-[22px] -translate-x-1/2 rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                mobileNavOpen && 'top-1/2 -translate-y-1/2 rotate-45'
              )}
            />
            <span
              aria-hidden
              className={cn(
                'absolute left-1/2 top-1/2 block h-0.5 w-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                mobileNavOpen && 'scale-x-0 opacity-0'
              )}
            />
            <span
              aria-hidden
              className={cn(
                'absolute bottom-[13px] left-1/2 block h-0.5 w-[22px] -translate-x-1/2 rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                mobileNavOpen && 'bottom-1/2 translate-y-1/2 -rotate-45'
              )}
            />
          </button>
        </nav>

        <div
          id="pricing-mobile-nav"
          className={cn(
            'overflow-hidden border-t border-border/40 bg-background/98 backdrop-blur-2xl shadow-[0_18px_40px_-12px_rgba(0,0,0,0.18)] transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden',
            mobileNavOpen
              ? 'max-h-[min(85vh,560px)] opacity-100'
              : 'pointer-events-none max-h-0 border-t-transparent opacity-0'
          )}
          aria-hidden={!mobileNavOpen}
        >
          <div className="flex max-h-[min(85vh,560px)] flex-col gap-1 overflow-y-auto px-4 py-4 pb-6">
            <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Navigate
            </p>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-4 py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-accent/80 hover:text-foreground"
                onClick={closeMobileNav}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-2 border-t border-border/50 pt-4">
              <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Account
              </p>
              <Link
                href="/sign-in"
                className="rounded-xl border border-border/60 bg-card/50 px-4 py-3 text-center text-base font-semibold text-foreground transition-colors hover:bg-accent/80"
                onClick={closeMobileNav}
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="group relative flex items-center justify-center overflow-hidden rounded-xl bg-gradient-primary px-4 py-3.5 text-base font-bold text-white transition-all hover:shadow-lg hover:shadow-primary-blue/25 active:scale-[0.98]"
                onClick={closeMobileNav}
              >
                <span className="relative z-10 flex items-center">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 duration-200" />
                </span>
              </Link>
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
              className="text-3xl font-extrabold text-foreground sm:text-4xl mb-4 text-center text-balance"
            >
              Two months of Elite — on us
            </motion.h1>
            <motion.p
              variants={fadeIn}
              className="mx-auto mb-10 max-w-2xl text-center text-sm text-muted-foreground sm:text-base font-(--font-dm-sans) text-pretty"
            >
              Elite is available today (two months on us). Prime and Legacy are
              on the roadmap — join now and claim Elite from Billing after you
              sign in.
            </motion.p>

            <div className="grid gap-6 md:grid-cols-3 items-stretch max-w-6xl mx-auto">
              {PRICING_PLANS.map((p) => (
                <motion.div
                  variants={scaleIn}
                  key={p.name}
                  className={cn(
                    'group relative flex h-full min-h-0 flex-col rounded-3xl p-8 border transition-all duration-500 overflow-visible',
                    p.highlighted
                      ? 'border-2 border-primary-blue bg-card shadow-2xl shadow-primary-blue/20 md:scale-[1.02] z-10'
                      : 'border-border bg-card/70 shadow-lg shadow-black/5',
                    p.comingSoon && 'opacity-95'
                  )}
                >
                  {p.comingSoon ? (
                    <div className="absolute right-[-38px] top-8 z-20 w-40 rotate-45 bg-slate-600 px-2 py-1 text-center text-[10px] font-extrabold uppercase tracking-wider text-white shadow-lg">
                      Coming soon
                    </div>
                  ) : null}
                  {!p.comingSoon && p.discountLabel ? (
                    <div className="absolute right-[-42px] top-6 z-20 w-44 rotate-45 bg-gradient-to-r from-rose-500 to-orange-500 px-2 py-1 text-center text-[10px] font-extrabold uppercase tracking-wider text-white shadow-lg">
                      {p.discountLabel} Limited Offer
                    </div>
                  ) : null}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary-blue/10 to-transparent" />
                  {p.highlighted ? (
                    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                      <div className="absolute -left-1/3 top-0 h-full w-1/2 -skew-x-12 bg-white/20 blur-xl opacity-60 transition-transform duration-1000 group-hover:translate-x-[210%]" />
                    </div>
                  ) : null}
                  {p.badge ? (
                    <div className="absolute -top-4 left-0 right-0 mx-auto w-max min-w-max max-w-[calc(100%-1rem)] rounded-full bg-gradient-primary px-4 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-white sm:text-xs">
                      {p.badge}
                    </div>
                  ) : null}
                  <h2 className="text-lg font-extrabold tracking-tight text-foreground">
                    {p.name}
                  </h2>
                  <div className="mt-1 font-(--font-dm-sans) text-sm leading-snug text-muted-foreground">
                    {p.subtitle}
                  </div>
                  <div className="mb-6 mt-5">
                    {!p.comingSoon && (p.originalPrice || p.discountLabel) ? (
                      <div className="mb-2 flex items-center gap-2 font-(--font-dm-sans)">
                        {p.originalPrice ? (
                          <span className="rounded-full bg-muted/60 px-2 py-0.5 text-base font-semibold text-muted-foreground line-through decoration-2 decoration-rose-500/80">
                            {p.originalPrice}
                          </span>
                        ) : null}
                        {p.discountLabel ? (
                          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-500/35">
                            Save {p.discountLabel}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-baseline gap-x-1">
                      <span
                        className={cn(
                          'font-black tracking-tight text-foreground drop-shadow-[0_6px_20px_rgba(59,130,246,0.24)]',
                          p.comingSoon
                            ? 'text-2xl sm:text-3xl'
                            : 'text-5xl'
                        )}
                      >
                        {p.price}
                      </span>
                      {p.period ? (
                      <span className="ml-1 text-muted-foreground">
                        {p.period}
                      </span>
                      ) : null}
                    </div>
                    {p.comingSoon ? (
                      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Purchase opens soon · price shown is the planned rate
                      </p>
                    ) : (
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-emerald-700/90">
                      No payment required for 2 months
                    </p>
                    )}
                  </div>
                  <ul className="space-y-2.5 text-sm text-muted-foreground font-(--font-dm-sans)">
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
                            className="mt-0.5 shrink-0 text-muted-foreground/80"
                            aria-hidden
                          >
                            <ArrowRight className="size-4" />
                          </span>
                        ) : (
                          <span
                            className=" shrink-0 text-foreground/40"
                            aria-hidden
                          >
                            <Dot />
                          </span>
                        )}
                        <span
                          className={cn(
                            line.sub && 'text-muted-foreground',
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
                        className="block w-full rounded-xl border border-dashed border-border bg-muted/40 py-3.5 text-center text-sm font-bold text-muted-foreground cursor-not-allowed"
                        aria-disabled
                      >
                        Coming soon
                      </div>
                    ) : (
                      <Link
                        href="/sign-up"
                        className={cn(
                          'block w-full rounded-xl py-3.5 text-center text-sm font-bold transition-all relative overflow-hidden',
                          p.highlighted
                            ? 'bg-gradient-primary text-white hover:opacity-95 hover:shadow-xl hover:shadow-primary-blue/30'
                            : p.discountLabel
                              ? 'bg-foreground text-background hover:bg-foreground/90 hover:shadow-lg'
                              : 'bg-accent text-foreground hover:bg-accent/80'
                        )}
                      >
                        <span className="relative z-10">Claim Elite</span>
                        <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full transition-transform duration-700 group-hover:translate-x-full" />
                      </Link>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="px-6 py-10 border-y border-border/30 bg-accent/10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mx-auto max-w-4xl"
          >
            <motion.h2
              variants={fadeIn}
              className="text-2xl font-extrabold text-foreground sm:text-3xl mb-3"
            >
              What are credits?
            </motion.h2>
            <motion.p
              variants={fadeIn}
              className="text-muted-foreground font-(--font-dm-sans) mb-6 leading-relaxed"
            >
              Credits unlock on-demand and advanced content features — product
              ads, instant posts, festive campaigns, and regenerations. Daily
              automated posting continues independently of your credit balance.
            </motion.p>
            <motion.p
              variants={fadeIn}
              className="text-sm font-semibold text-foreground mb-2 font-(--font-dm-sans)"
            >
              Credits used per action:
            </motion.p>
            <motion.ul
              variants={fadeIn}
              className="mb-8 space-y-1.5 text-sm text-muted-foreground font-(--font-dm-sans)"
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
              className="text-lg font-bold text-foreground mb-3"
            >
              Credit packs
            </motion.h3>
            <motion.p
              variants={fadeIn}
              className="text-muted-foreground font-(--font-dm-sans) mb-4 leading-relaxed max-w-xl"
            >
              Add credits on top of your plan allowance. Purchased pack credits
              are valid for 30 days from purchase.
            </motion.p>
            <motion.h4
              variants={fadeIn}
              className="text-base font-bold text-foreground mb-3"
            >
              Packs
            </motion.h4>
            <ul
              role="list"
              className="max-w-md rounded-xl border border-border/50 font-(--font-dm-sans) text-sm divide-y divide-border/40 overflow-hidden"
            >
              {CREDIT_TOPUP_PACKS.map((pack) => (
                <li
                  key={pack.name}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 px-4 py-3 text-muted-foreground sm:gap-x-6 sm:px-5"
                >
                  <span className="font-medium text-foreground">{pack.name}</span>
                  <span className="tabular-nums text-foreground/90">
                    {pack.price}
                  </span>
                  <span className="text-right tabular-nums">{pack.credits}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 rounded-full bg-slate-500/10 px-2 py-0.5 justify-self-end">
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
              className="text-2xl font-extrabold text-foreground sm:text-3xl mb-3"
            >
              Who is Elite for?
            </motion.h2>
            <motion.p
              variants={fadeIn}
              className="text-muted-foreground font-(--font-dm-sans) text-sm sm:text-base leading-relaxed max-w-2xl"
            >
              Brands posting on two platforms (for example Instagram plus
              Facebook or LinkedIn). Sign up, then open Billing and tap Claim
              Elite to activate your two-month complimentary access.
            </motion.p>
          </motion.div>
        </section>

        <section className="px-6 py-10 border-t border-border/30 bg-background">
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
              Billing FAQ
            </motion.h2>
            <motion.div variants={fadeIn}>
              <Accordion
                type="single"
                collapsible
                className="rounded-xl border border-border/50 bg-accent/5 font-(--font-dm-sans) divide-y divide-border/40 overflow-hidden"
              >
                {BILLING_FAQ_ITEMS.map((item, i) => (
                  <AccordionItem
                    key={item.question}
                    value={`billing-faq-${i}`}
                    className="border-0 px-4 sm:px-5"
                  >
                    <AccordionTrigger className="py-4 text-sm font-semibold text-foreground hover:no-underline sm:text-[0.9375rem] cursor-pointer text-left">
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

        <section className="px-6 py-16 sm:py-20">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mx-auto max-w-3xl text-center"
          >
            <motion.div variants={fadeIn}>
              <Link
                href="/sign-up"
                className="group inline-flex items-center justify-center rounded-2xl bg-gradient-primary px-10 py-4 text-base font-bold text-white transition-all hover:shadow-2xl hover:shadow-primary-blue/30 active:scale-[0.98] duration-300"
              >
                <span className="flex items-center">
                  Create account &amp; claim Elite
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1 duration-200" />
                </span>
              </Link>
              <p className="mt-4 text-sm text-muted-foreground font-(--font-dm-sans)">
                2 months free · Claim from Billing after sign-in
              </p>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
