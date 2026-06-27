'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calloutOpacity, pageScroll01 } from '@/lib/landing-scroll';

type Callout = {
  id: string;
  step: string;
  tag: string;
  title: string;
  description: string;
  scrollStart: number;
  scrollEnd: number;
  position: 'left' | 'right';
};

const CALLOUTS: Callout[] = [
  {
    id: 'researcher',
    step: '01',
    tag: 'AI Researcher',
    title: 'Always watching your market',
    description:
      'Continuously monitors your industry, competitors, trending conversations and market opportunities — so your content is never a step behind.',
    scrollStart: 0.05,
    scrollEnd: 0.16,
    position: 'left',
  },
  {
    id: 'strategist',
    step: '02',
    tag: 'AI Strategist',
    title: 'A plan before a single word',
    description:
      'Decides what your audience actually wants to see and builds a content plan focused on long-term growth — not random posting.',
    scrollStart: 0.17,
    scrollEnd: 0.28,
    position: 'right',
  },
  {
    id: 'copywriter',
    step: '03',
    tag: 'AI Copywriter',
    title: 'Writes in your brand voice',
    description:
      'Captions, hooks, stories, educational posts and promotional campaigns — crafted to sound like your business, never generic AI.',
    scrollStart: 0.29,
    scrollEnd: 0.4,
    position: 'left',
  },
  {
    id: 'creative',
    step: '04',
    tag: 'AI Creative Director',
    title: 'Visuals that match your brand',
    description:
      'Generates professional creatives aligned to your branding and colours — designed to stop the scroll and lift engagement.',
    scrollStart: 0.41,
    scrollEnd: 0.52,
    position: 'right',
  },
  {
    id: 'reviewer',
    step: '05',
    tag: 'Human Reviewer',
    title: 'Quality, checked by a human',
    description:
      'Every post is reviewed by a real person before publishing to guarantee quality and brand consistency. No surprises, ever.',
    scrollStart: 0.53,
    scrollEnd: 0.64,
    position: 'left',
  },
  {
    id: 'publisher',
    step: '06',
    tag: 'AI Publisher',
    title: 'Published at the perfect time',
    description:
      'Finds the best posting time for every platform and publishes automatically across Instagram, Facebook & LinkedIn.',
    scrollStart: 0.65,
    scrollEnd: 0.74,
    position: 'right',
  },
  {
    id: 'analyst',
    step: '07',
    tag: 'AI Growth Analyst',
    title: 'Learns from every post',
    description:
      'Tracks performance, measures engagement and continuously improves future content. Every cycle makes your AI smarter.',
    scrollStart: 0.75,
    scrollEnd: 0.85,
    position: 'left',
  },
];

const CTA_START = 0.9;

const POSITION_CLASS: Record<Callout['position'], string> = {
  left: 'left-5 sm:left-12 md:left-20 lg:left-32',
  right: 'right-5 sm:right-12 md:right-20 lg:right-32',
};

export function LandingScrollCallouts() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function onScroll() {
      setProgress(pageScroll01());
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const ctaOpacity = Math.min(1, Math.max(0, (progress - CTA_START) / 0.05));

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[25] overflow-hidden"
      aria-live="polite"
    >
      {CALLOUTS.map((callout) => {
        const opacity = calloutOpacity(
          progress,
          callout.scrollStart,
          callout.scrollEnd
        );
        if (opacity < 0.02) return null;

        const dir = callout.position === 'left' ? -1 : 1;
        const slideX = (1 - opacity) * dir * 120;

        return (
          <article
            key={callout.id}
            className={cn(
              'landing-scroll-callout pointer-events-auto absolute top-1/2 w-[min(480px,calc(100vw-2.5rem))]',
              POSITION_CLASS[callout.position]
            )}
            style={{
              opacity,
              transform: `translateY(-50%) translateX(${slideX}px)`,
            }}
          >
            <div className="landing-callout-card">
              <div className="flex items-start gap-5">
                <span className="landing-callout-step">{callout.step}</span>
                <div className="min-w-0">
                  <p className="landing-eyebrow !text-[10px] !tracking-[0.28em]">
                    {callout.tag}
                  </p>
                  <h2 className="landing-display mt-2 text-[clamp(1.35rem,2.8vw,1.75rem)] leading-[1.15] tracking-[-0.02em] text-white">
                    {callout.title}
                  </h2>
                  <p className="landing-body mt-3 text-[15px] leading-[1.7] text-white/68 sm:text-base">
                    {callout.description}
                  </p>
                </div>
              </div>
            </div>
          </article>
        );
      })}

      {ctaOpacity > 0.02 && (
        <article
          className="landing-scroll-callout pointer-events-auto absolute left-1/2 top-1/2 w-[min(580px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2"
          style={{
            opacity: ctaOpacity,
            transform: `translate(-50%, calc(-50% + ${(1 - ctaOpacity) * 32}px)) scale(${0.95 + ctaOpacity * 0.05})`,
          }}
        >
          <div className="landing-cta-panel">
            <p className="landing-eyebrow">Focus on your business</p>
            <h2 className="landing-display mt-4 text-[clamp(2rem,5vw,2.75rem)] leading-[1.08] tracking-[-0.03em] text-white">
              We&apos;ll handle
              <br />
              <span className="landing-accent">your growth.</span>
            </h2>
            <p className="landing-body mx-auto mt-5 max-w-md text-[15px] leading-[1.7] text-white/65 sm:text-base">
              Your AI researches, creates, publishes, and learns — so you can
              focus on serving customers while your social media grows
              automatically.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/sign-up" className="landing-btn-primary group w-full sm:w-auto">
                Start Free — 10-Day Elite Trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="/product" className="landing-btn-secondary w-full sm:w-auto">
                Explore features
              </Link>
            </div>
            <p className="landing-body mt-5 text-xs text-white/40">
              No credit card · Cancel anytime
            </p>
          </div>
        </article>
      )}
    </div>
  );
}
