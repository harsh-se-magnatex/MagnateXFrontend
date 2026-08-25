'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { AnimatePresence, LayoutGroup, motion, type Variants } from 'framer-motion';
import Link from 'next/link';
import { ArrowDown, ArrowRight, Check } from 'lucide-react';
import { GuestAuthLink } from '@/components/auth/GuestAuthLink';

type Callout = {
  id: string;
  step: string;
  tag: string;
  title: string;
  description: string;
};

const CALLOUTS: Callout[] = [
  {
    id: 'researcher',
    step: '01',
    tag: 'Researcher',
    title: 'Always watching your market',
    description:
      'Continuously monitors your industry, competitors, trending conversations and market opportunities — so your content is never a step behind.',
  },
  {
    id: 'strategist',
    step: '02',
    tag: 'Strategist',
    title: 'A plan before a single word',
    description:
      'Decides what to make next — a campaign, a carousel, a timely event post — and builds toward long-term growth, not random posting.',
  },
  {
    id: 'copywriter',
    step: '03',
    tag: 'Copywriter',
    title: 'Writes in your brand voice',
    description:
      'Captions, hooks, carousels and campaign copy — written in your brand voice, at the length and tone you set, never generic AI.',
  },
  {
    id: 'creative',
    step: '04',
    tag: 'Creative Director',
    title: 'Visuals that match your brand',
    description:
      'Builds every visual in your chosen style and brand colors — product ads, carousels, 8-second videos, event greetings — designed to stop the scroll.',
  },
  {
    id: 'reviewer',
    step: '05',
    tag: 'Human Reviewer',
    title: 'Quality, checked by a human',
    description:
      'Your call: review every post yourself, or let our in-house team clear it for you. Either way, nothing goes out unchecked.',
  },
  {
    id: 'publisher',
    step: '06',
    tag: 'Publisher',
    title: 'Published at the perfect time',
    description:
      "Publishes at your platform's proven best hour — learned from your own analytics once you've posted enough, your preferred time until then.",
  },
  {
    id: 'analyst',
    step: '07',
    tag: 'Growth Analyst',
    title: 'Learns from every post',
    description:
      "Grades your last three weeks across seven areas, flags your best and worst posts, and hands you two ready-to-run ideas for what's next.",
  },
];

/** Index CALLOUTS.length (7) is the trailing CTA — one linear progression
 *  of 8 beats: 7 personas, then the close. */
const STEP_COUNT = CALLOUTS.length + 1;
const VH_PER_STEP = 78;

/** Shared easing for every motion in this component — one signature curve
 *  so a step never feels like it's moving on a different clock. */
const EASE = [0.22, 1, 0.36, 1] as const;

const lineVariants: Variants = {
  hidden: { scaleY: 0, opacity: 0 },
  visible: {
    scaleY: 1,
    opacity: 1,
    transition: { duration: 0.5, ease: EASE },
  },
};

const arrowVariants: Variants = {
  hidden: { opacity: 0, y: -6, scale: 0.7 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: EASE, delay: 0.3 },
  },
};

/** Optical focus-in used across the whole site — resolves out of the
 *  scene rather than sliding in. Plays once, when a step first becomes
 *  the active (full-size, read-in-full) card. */
const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 1.04, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: EASE, delay: 0.45 },
  },
};

const firstCardVariants: Variants = {
  hidden: { opacity: 0, scale: 1.04, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.8, ease: EASE },
  },
};

/** How the outgoing card leaves when a step advances — a quick soft
 *  dissolve so the swap crossfades instead of the old card cutting out
 *  the instant the new one is decided. */
const cardExitVariants: Variants = {
  exit: {
    opacity: 0,
    scale: 0.97,
    filter: 'blur(6px)',
    transition: { duration: 0.35, ease: EASE },
  },
};

/** A row that just joined the compacted history — eases in from just
 *  above its resting spot instead of popping into existence. */
const rowVariants: Variants = {
  hidden: { opacity: 0, y: -10, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: EASE },
  },
};

function StepConnector() {
  return (
    <div className="flex flex-col items-center py-2" aria-hidden>
      <motion.span
        variants={lineVariants}
        className="block h-7 w-px origin-top bg-gradient-to-b from-violet-300/5 via-violet-300/55 to-violet-300/80 sm:h-9"
      />
      <motion.span
        variants={arrowVariants}
        className="-mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-primary text-white shadow-[0_0_20px_rgba(124,58,237,0.75)] ring-1 ring-white/25"
      >
        <ArrowDown className="h-3.5 w-3.5" strokeWidth={3} />
      </motion.span>
    </div>
  );
}

/**
 * A step that's been superseded — collapsed to a single readable line so
 * the growing history stays on screen instead of taking the room a full
 * card needs. `layout` on the parent element is what makes the
 * full → compact transition an actual shrink animation rather than a cut.
 */
function CompactRow({ callout }: { callout: Callout }) {
  return (
    <div className="landing-history-row flex w-full items-center gap-3 px-5 py-3">
      <span className="font-mono text-[11px] font-bold tracking-wide text-violet-300">
        {callout.step}
      </span>
      <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-white/90 sm:text-[15px]">
        {callout.title}
      </p>
      <Check className="h-3.5 w-3.5 shrink-0 text-violet-300" strokeWidth={2.5} aria-hidden />
    </div>
  );
}

function FullCard({ callout, isFirst }: { callout: Callout; isFirst: boolean }) {
  return (
    <motion.div
      variants={isFirst ? firstCardVariants : cardVariants}
      className="landing-callout-card w-full"
    >
      <div className="flex items-start gap-5">
        <span className="landing-callout-step">{callout.step}</span>
        <div className="min-w-0">
          <p className="landing-eyebrow !text-[10px] !tracking-[0.28em]">{callout.tag}</p>
          <h2 className="landing-display landing-heading-highlight mt-2 inline-block text-[clamp(1.3rem,2.6vw,1.65rem)] leading-[1.15] tracking-[-0.02em] text-white">
            {callout.title}
          </h2>
          <p className="landing-body mt-3 text-[14px] leading-[1.65] text-white/78 sm:text-[15px]">
            {callout.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Drives which beat is "active" from real scroll geometry — not
 * IntersectionObserver crossing-detection, and not `position: sticky`.
 *
 * Sticky was the obvious first choice, but `.landing-3d-root` sets
 * `overflow-x: hidden`, and per the CSS overflow spec that computes the
 * *other* axis to `auto` on that ancestor — which breaks `sticky` against
 * the viewport in the browsers that follow the spec here. `position:
 * fixed` doesn't have that problem (proven already by this same page's
 * background layer), so the panel is fixed and this hook manually decides
 * when it should be visible and which index is current.
 *
 * Same lesson as the last round: don't rely solely on 'scroll' events.
 * They fire reliably for real user input, but some programmatic scroll
 * paths don't dispatch one — so this also re-checks on a low-frequency
 * poll. Cheap (one bounding-rect read) and it's what makes this correct
 * for every input method rather than "correct assuming events behave."
 */
function useStoryProgress(sectionRef: RefObject<HTMLDivElement | null>) {
  const [state, setState] = useState({ visible: false, index: 0 });
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let raf = 0;

    function compute() {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const scrollable = rect.height - vh;

      let next: { visible: boolean; index: number };
      if (scrollable <= 0) {
        next = { visible: rect.top < vh && rect.bottom > 0, index: STEP_COUNT - 1 };
      } else {
        const into = -rect.top;
        if (into < 0) {
          next = { visible: false, index: 0 };
        } else {
          const progress = Math.min(into / scrollable, 1);
          const index = Math.min(Math.floor(progress * STEP_COUNT), STEP_COUNT - 1);
          next = { visible: true, index };
        }
      }

      const prev = stateRef.current;
      if (next.visible !== prev.visible || next.index !== prev.index) {
        setState(next);
      }
    }

    function onScrollOrResize() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    }

    compute();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    const poll = window.setInterval(compute, 350);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(poll);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [sectionRef]);

  return state;
}

export function LandingScrollCallouts() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { visible, index: activeIndex } = useStoryProgress(sectionRef);
  const ctaActive = activeIndex === CALLOUTS.length;

  return (
    // Tall spacer providing the scroll distance the fixed panel below
    // reads from — not rendered content itself, just room to scroll
    // through 8 beats at a comfortable pace.
    <div ref={sectionRef} className="relative w-full" style={{ height: `${STEP_COUNT * VH_PER_STEP}vh` }}>
      {visible && (
        <div className="pointer-events-none fixed inset-0 z-[26] flex items-center justify-center px-5 sm:px-0">
          <LayoutGroup>
            <motion.div
              layout
              transition={{ duration: 0.5, ease: EASE }}
              className="pointer-events-auto flex w-full max-w-2xl flex-col items-center"
            >
              {activeIndex > 0 && !ctaActive && (
                <motion.div layout transition={{ duration: 0.5, ease: EASE }} className="flex w-full flex-col gap-2.5">
                  <AnimatePresence>
                    {CALLOUTS.slice(0, Math.min(activeIndex, CALLOUTS.length)).map((callout) => (
                      <motion.div
                        key={callout.id}
                        layout
                        variants={rowVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.3, ease: EASE } }}
                        transition={{ duration: 0.5, ease: EASE }}
                      >
                        <CompactRow callout={callout} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}

              <AnimatePresence mode="popLayout">
                {!ctaActive && (
                  <motion.div
                    key={CALLOUTS[activeIndex].id}
                    layout
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={cardExitVariants}
                    transition={{ duration: 0.5, ease: EASE }}
                    className="w-full"
                  >
                    {activeIndex > 0 && <StepConnector />}
                    <FullCard callout={CALLOUTS[activeIndex]} isFirst={activeIndex === 0} />
                  </motion.div>
                )}

                {ctaActive && (
                  <motion.div
                    key="cta"
                    layout
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={cardExitVariants}
                    transition={{ duration: 0.5, ease: EASE }}
                    className="w-full"
                  >
                    <motion.div
                      layout
                      variants={rowVariants}
                      initial="hidden"
                      animate="visible"
                      className="landing-final-history-row mb-2.5"
                    >
                      <CompactRow callout={CALLOUTS[CALLOUTS.length - 1]} />
                    </motion.div>
                    <StepConnector />
                    <motion.div
                      variants={cardVariants}
                      className="landing-cta-panel animated-border w-full text-center"
                    >
                      <p className="landing-eyebrow">Focus on your business</p>
                      <h2 className="landing-display landing-heading-highlight mt-3 inline-block text-[clamp(1.5rem,4vw,2.25rem)] leading-[1.1] tracking-[-0.03em] text-white sm:mt-4">
                        We&apos;ll handle{' '}
                        <span className="landing-accent">your growth.</span>
                      </h2>
                      <p className="landing-body mx-auto mt-4 max-w-md text-[14px] leading-[1.65] text-white/78 sm:mt-5 sm:text-[15px] sm:leading-[1.7]">
                        SocioGenie creates, reviews, schedules and publishes — so you
                        can focus on customers while your social media runs on
                        autopilot with AI, or exactly the way you run it with Studio.
                      </p>
                      <div className="landing-cta-actions mt-6 justify-center sm:mt-7">
                        <GuestAuthLink href="/sign-up" className="landing-btn-primary group">
                          Get started
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </GuestAuthLink>
                        <Link href="/product" className="landing-btn-secondary">
                          Explore features
                        </Link>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </LayoutGroup>
        </div>
      )}
    </div>
  );
}
