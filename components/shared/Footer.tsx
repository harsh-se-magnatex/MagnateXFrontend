'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { HashLink } from '@/components/shared/HashLink';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const TAGLINE =
  'Sociogenie is an AI-powered social media management system for small businesses — combining automated content generation with human review and publishing across Instagram, Facebook, and LinkedIn.';

const PRODUCT_LINKS = [
  { label: 'How It Works', href: '/product#how-it-works' },
  { label: 'Features', href: '/product#features' },
  { label: 'How It Looks', href: '/how-it-looks' },
  { label: 'Try It Free', href: '/try-it' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/product#faq' },
] as const;

const COMPANY_LINKS = [
  { label: 'Experience', href: '/' },
  { label: 'Contact', href: '/settings/support-legal' },
] as const;

const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '/legal/privacy' },
  { label: 'Terms of Service', href: '/legal/terms' },
  { label: 'Refund Policy', href: '/legal/refund' },
  { label: 'Cookie Policy', href: '/legal/cookie' },
  { label: 'Acceptable Use', href: '/legal/acceptable-use' },
  { label: 'AI Disclosure', href: '/legal/ai-disclosure' },
  { label: 'Sub-processors', href: '/legal/sub-processors' },
  { label: 'Open-Source Licenses', href: '/legal/licenses' },
] as const;

const DATA_DELETION_LINKS = [
  {
    label: 'Facebook Data Deletion',
    href: '/legal/facebook-data-deletion-instruction',
    accent: 'facebook' as const,
  },
  {
    label: 'Instagram Data Deletion',
    href: '/legal/instagram-data-deletion-instruction',
    accent: 'instagram' as const,
  },
] as const;

const LINK_COLUMNS = [
  { heading: 'Product', links: PRODUCT_LINKS },
  { heading: 'Company', links: COMPANY_LINKS },
  { heading: 'Legal', links: LEGAL_LINKS },
] as const;

export function Footer() {
  return (
    <footer className="relative border-t border-default bg-default backdrop-blur-sm overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary-blue/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-primary-purple/5 blur-[100px] rounded-full pointer-events-none" />

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        variants={stagger}
        className="relative z-10 mx-auto max-w-7xl px-6 pt-16 pb-8"
      >
        <div className="grid gap-10 md:grid-cols-5 mb-12">
          <motion.div variants={fadeUp} className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4 group">
              <img
                src="/logo.png"
                alt="SocioGenie"
                className="h-10 w-10 rounded-xl transition-transform duration-200"
              />
              <span className="text-xl font-bold bg-gradient-primary-text">
                SocioGenie
              </span>
            </Link>
            <p className="text-sm text-secondary leading-relaxed max-w-md">
              {TAGLINE}
            </p>
          </motion.div>

          {LINK_COLUMNS.map(({ heading, links }) => (
            <motion.div variants={fadeUp} key={heading}>
              <h4 className="text-xs font-bold text-default mb-5 uppercase tracking-[0.15em]">
                {heading}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.href.includes('#') ? (
                      <HashLink
                        href={link.href}
                        className="group flex items-center gap-1 text-sm text-secondary hover:text-default transition-expo"
                      >
                        {link.label}
                        <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-expo" />
                      </HashLink>
                    ) : (
                      <Link
                        href={link.href}
                        className="group flex items-center gap-1 text-sm text-secondary hover:text-default transition-expo"
                      >
                        {link.label}
                        <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-expo" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.div
          variants={fadeUp}
          className="mb-12 rounded-2xl border border-default bg-element p-6 sm:p-8"
        >
          <h4 className="text-xs font-bold text-default mb-2 uppercase tracking-[0.15em]">
            Data Deletion
          </h4>
          <p className="text-sm text-secondary mb-5 max-w-2xl">
            Remove Facebook or Instagram data stored by SocioGenie, including
            connection tokens and platform-linked analytics.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            {DATA_DELETION_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  link.accent === 'facebook'
                    ? 'group inline-flex items-center justify-center gap-2 rounded-xl border border-info bg-info px-5 py-3 text-sm font-semibold text-info transition-expo hover:border-info hover:bg-info'
                    : 'group inline-flex items-center justify-center gap-2 rounded-xl border border-preview bg-preview px-5 py-3 text-sm font-semibold text-preview transition-expo hover:border-preview hover:bg-preview'
                }
              >
                {link.label}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="pt-8 border-t border-default flex flex-col gap-4 text-xs text-secondary font-(--font-dm-sans) leading-relaxed"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p>
              © {new Date().getFullYear()} MAGNATEX LLP. All rights reserved.
            </p>
          </div>
          <div className="text-[11px] text-secondary/80 leading-relaxed">
            <p>
              <span className="font-semibold text-secondary">MAGNATEX LLP</span>{' '}
              · LLPIN: ACU-5689 · GSTIN: 24ACGFM3028C1ZQ · Registered office:
              111, Fortune Business Hub, Sola, Nr. Satyamev Elysium, Ahmedabad,
              Gujarat 380060, India.
            </p>
            <p className="mt-1">
              Grievance Officer: Naman Patel ·{' '}
              <a
                href="mailto:founder@magnatex.co"
                className="underline decoration-dotted underline-offset-2 hover:text-default"
              >
                founder@magnatex.co
              </a>{' '}
              · Mon–Fri 10:00–19:00 IST.
            </p>
            <p className="mt-2">
              Payments are processed by Dodo Payments Inc. (Merchant of Record)
              and billed in USD. SocioGenie is not affiliated with, endorsed by,
              or sponsored by Meta Platforms, Inc. or LinkedIn Corporation.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </footer>
  );
}
