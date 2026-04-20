'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

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
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Features', href: '/#features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/#faq' },
] as const;

const COMPARE_LINKS = [
 
  {label:"vs Scheduling Tools", href:"/#compare"},
  { label: 'vs Agencies', href: '/#compare' },
  { label: 'vs Freelancers', href: '/#compare' },
] as const;

const COMPANY_LINKS = [
  { label: 'About', href: '/#about' },
  { label: 'Contact', href: '/contact-us' },
  { label: 'Privacy Policy', href: '/legal/privacy' },
  { label: 'Terms of Service', href: '/legal/terms' },
] as const;

const LINK_COLUMNS = [
  { heading: 'Product', links: PRODUCT_LINKS },
  { heading: 'Compare', links: COMPARE_LINKS },
  { heading: 'Company', links: COMPANY_LINKS },
] as const;

export function Footer() {
  return (
    <footer className="relative border-t border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
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
                className="h-10 w-10 rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-200"
              />
              <span className="text-xl font-bold bg-gradient-primary-text">
                SocioGenie
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              {TAGLINE}
            </p>
          </motion.div>

          {LINK_COLUMNS.map(({ heading, links }) => (
            <motion.div variants={fadeUp} key={heading}>
              <h4 className="text-xs font-bold text-foreground mb-5 uppercase tracking-[0.15em]">
                {heading}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="group flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                    >
                      {link.label}
                      <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.div
          variants={fadeUp}
          className="pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 text-center sm:text-left"
        >
          <p className="text-xs text-muted-foreground font-(--font-dm-sans)">
            Plans from ₹1,999/month · No contracts · Cancel anytime
          </p>
          <p className="text-xs text-muted-foreground font-(--font-dm-sans)">
            © {new Date().getFullYear()} Sociogenie. All rights reserved.
          </p>
        </motion.div>
      </motion.div>
    </footer>
  );
}
