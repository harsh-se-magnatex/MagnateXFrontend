import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Building2,
  Clock,
  ListTodo,
  PenLine,
  Radar,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { GuestAuthLink } from '@/components/auth/GuestAuthLink';

type Agent = {
  id: string;
  step: string;
  tag: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Drives the card's chip gradient, tint and border via `--card-accent`. */
  accent: string;
};

/**
 * The seven roles, with the same copy they have always had.
 *
 * Each one carries its own accent hue. That is the whole point: a marketing
 * grid where every card is the same neutral rectangle reads as a spec sheet,
 * and this product's job is making colourful things. Running the cards across
 * the brand sweep — blue at the start, coral at the end — also gives the
 * section a direction, so the seven steps feel like a sequence rather than a
 * bag of features.
 *
 * The hue lives on the chip, the border and a 9% wash. It never touches the
 * body copy, which stays neutral step-11 and readable.
 */
const AGENTS: Agent[] = [
  {
    id: 'researcher',
    step: '01',
    tag: 'Researcher',
    title: 'Always watching your market',
    description:
      'Continuously monitors your industry, competitors, trending conversations and market opportunities — so your content is never a step behind.',
    icon: Radar,
    accent: 'var(--brand-cyan)',
  },
  {
    id: 'strategist',
    step: '02',
    tag: 'Strategist',
    title: 'A plan before a single word',
    description:
      'Decides what to make next — a campaign, a carousel, a timely event post — and builds toward long-term growth, not random posting.',
    icon: Target,
    accent: 'var(--brand-sky)',
  },
  {
    id: 'copywriter',
    step: '03',
    tag: 'Copywriter',
    title: 'Writes in your brand voice',
    description:
      'Captions, hooks, carousels and campaign copy — written in your brand voice, at the length and tone you set, never generic AI.',
    icon: PenLine,
    accent: 'var(--brand-indigo)',
  },
  {
    id: 'creative',
    step: '04',
    tag: 'Creative Director',
    title: 'Visuals that match your brand',
    description:
      'Builds every visual in your chosen style and brand colors — product ads, carousels, 8-second videos, event greetings — designed to stop the scroll.',
    icon: Sparkles,
    accent: 'var(--brand-violet)',
  },
  {
    id: 'reviewer',
    step: '05',
    tag: 'Human Reviewer',
    title: 'Quality, checked by a human',
    description:
      'On Prime, Elite and Legacy: choose Manual Review and clear every post yourself, or Auto Approve and let our in-house team clear it for you. On Studio you create each post and see it before it publishes.',
    icon: ShieldCheck,
    accent: 'var(--brand-orchid)',
  },
  {
    id: 'publisher',
    step: '06',
    tag: 'Publisher',
    title: 'Published at the perfect time',
    description:
      "Publishes at your platform's proven best hour — learned from your own analytics once you've posted enough, your preferred time until then.",
    icon: Clock,
    accent: 'var(--brand-pink)',
  },
  {
    id: 'analyst',
    step: '07',
    tag: 'Growth Analyst',
    title: 'Learns from every post',
    description:
      "Grades your last three weeks across seven areas, flags your best and worst posts, and hands you two ready-to-run ideas for what's next.",
    icon: BarChart3,
    accent: 'var(--brand-coral)',
  },
];

function AgentCard({ agent }: { agent: Agent }) {
  const Icon = agent.icon;
  return (
    <article
      className="brand-card flex flex-col gap-4 p-6"
      style={{ '--card-accent': agent.accent } as React.CSSProperties}
    >
      <div className="flex items-center gap-4">
        <span className="brand-chip">
          <Icon className="size-5" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0">
          <span className="font-mono text-xs font-medium tabular-nums tracking-[-0.5px] text-quaternary">
            {agent.step}
          </span>
          <p
            className="text-eyebrow mt-1"
            style={{ color: 'var(--card-accent)' }}
          >
            {agent.tag}
          </p>
        </div>
      </div>
      <h3 className="text-subsection text-default">{agent.title}</h3>
      <p className="text-sm leading-relaxed text-secondary">
        {agent.description}
      </p>
    </article>
  );
}

type Alternative = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const ALTERNATIVES: Alternative[] = [
  {
    id: 'agency',
    title: 'An agency retainer',
    description:
      "Priced like a full-time hire that works your account part time. Revisions take days, and campaigns get planned around their calendar, not yours.",
    icon: Building2,
  },
  {
    id: 'freelancer',
    title: 'A freelancer',
    description:
      "Great some weeks, off-brand the next. When they're busy or unavailable, your feed just goes quiet.",
    icon: UserRound,
  },
  {
    id: 'scheduler',
    title: 'A scheduling tool',
    description:
      "Automates the publish button. You're still the one writing every caption, designing every visual, and deciding what goes out and when.",
    icon: ListTodo,
  },
];

/**
 * The named-enemy section. Sits right after the hero, before the roles grid
 * — a skeptical small-business owner already has an opinion about these
 * three options, so agreeing with them first earns the rest of the page a
 * hearing.
 */
export function LandingChallenge() {
  return (
    <section className="expo-section">
      <div className="expo-container">
        <div className="max-w-2xl">
          <p className="text-eyebrow text-[var(--brand-violet-text)]">
            The alternative
          </p>
          <h2 className="mt-6 text-display-2 text-default">
            What you&apos;re probably doing instead
          </h2>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {ALTERNATIVES.map((item) => (
            <article
              key={item.id}
              className="flex flex-col gap-3 rounded-2xl border border-default bg-element p-6"
            >
              <item.icon
                className="size-5 text-tertiary"
                strokeWidth={2}
                aria-hidden
              />
              <h3 className="text-subsection text-default">{item.title}</h3>
              <p className="text-sm leading-relaxed text-secondary">
                {item.description}
              </p>
            </article>
          ))}
        </div>

        <p className="mt-8 max-w-2xl text-base leading-relaxed text-secondary">
          SocioGenie does the research, writing, design and scheduling —
          reviewed before anything goes live, and it never takes a week off.
        </p>
      </div>
    </section>
  );
}

const AI_PLAN_STATS: { qty: string; label: string }[] = [
  { qty: '5', label: 'Campaigns' },
  { qty: '7', label: 'Automated posts' },
  { qty: '3', label: 'Quick-create posts' },
  { qty: '2', label: 'Videos' },
  { qty: '2', label: 'Carousels' },
];

/**
 * The moat section, described through the product's real vocabulary —
 * "AI Manager," the customer-facing automation feature.
 * customer-facing anywhere in the app. States the real 19-item/cycle
 * breakdown; the full table lives on /product#plans, this just teases it.
 */
export function LandingAutomation() {
  return (
    <section className="brand-wash-section expo-section">
      <div className="expo-container">
        <div className="max-w-2xl">
          <p className="brand-pill">
            <Sparkles className="size-3.5" aria-hidden />
            AI Manager
          </p>
          <h2 className="mt-6 text-display-2 text-default">
            A full month,{' '}
            <span className="text-gradient-brand">planned before you ask.</span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-secondary">
            AI Manager builds your month, writes and designs each post, clears it through review, and publishes at your best hour. On Prime, Elite and Legacy, SocioGenie researches your industry and
            competitors, plans content two days ahead of every post, writes
            and designs it in your brand voice, routes it through the review
            mode you choose, and publishes at the time your own analytics say
            works best.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {AI_PLAN_STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-default bg-element px-4 py-5 text-center"
            >
              <p className="font-mono text-3xl font-semibold tabular-nums text-default">
                {stat.qty}
              </p>
              <p className="mt-1 text-xs leading-snug text-tertiary">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-tertiary">
          19 pieces of content every cycle, plus a varying number of seasonal
          posts for the festivals and occasions you pick — all of it running
          on your subscription. Automation never touches your credit balance.
        </p>

        <Link
          href="/product#plans"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-violet-text)] underline-offset-4 transition-expo hover:underline"
        >
          See the full breakdown
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

export function LandingAgents() {
  return (
    <section className="brand-wash-section expo-section">
      <div className="expo-container">
        <div className="max-w-2xl">
          <p className="brand-pill">
            <Sparkles className="size-3.5" aria-hidden />
            How it works
          </p>
          <h2 className="mt-6 text-display-2 text-default">
            Seven roles,{' '}
            <span className="text-gradient-brand">one subscription.</span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-secondary">
            Every step a social team runs — research, strategy, copy, design,
            review, publishing and analysis — handled end to end.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AGENTS.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * The close. A full-bleed accent panel rather than another neutral card —
 * the last thing on the page should be the loudest, and this is where the
 * gradient does its most useful work.
 */
export function LandingClose() {
  return (
    <section className="expo-section">
      <div className="expo-container">
        <div className="brand-wash-hero overflow-hidden rounded-[32px] border border-[color-mix(in_srgb,var(--brand-violet)_28%,var(--border-default))] bg-default px-6 py-16 text-center sm:px-12 sm:py-24">
          <p className="brand-pill">
            <Sparkles className="size-3.5" aria-hidden />
            Focus on your business
          </p>
          <h2 className="mx-auto mt-6 max-w-3xl text-display-2 text-default">
            We&apos;ll handle{' '}
            <span className="text-gradient-brand-warm">your growth.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-secondary">
            SocioGenie creates, reviews, schedules and publishes — so you can
            focus on customers while your social media runs on autopilot with
            AI, or exactly the way you run it with Studio.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <GuestAuthLink href="/sign-up" className="btn-brand group">
              Get started
              <ArrowRight className="size-4 transition-expo-transform group-hover:translate-x-0.5" />
            </GuestAuthLink>
            <Link href="/product" className="landing-btn-secondary">
              Explore features
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
