import {
  ArrowRight,
  ArrowUp,
  BadgeCheck,
  Fingerprint,
  Ban,
  Gem,
  Globe,
  KeyRound,
  Megaphone,
  Network,
  Palette,
  RefreshCw,
  Search,
  Store,
  TrainFront,
  BookOpen,
  Building,
  Maximize2,
  ShieldCheck,
  UserCheck,
  Sparkles,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import { HOMEPAGE_ANSWER } from '@/lib/seo';
import { GLOBAL, type LandingRegion } from './landing-region';
import { Marquee } from './motion/marquee';
import { RotatingWords } from './motion/rotating-words';

/* ── Positioning ──────────────────────────────────────────────── */

/**
 * The positioning lines, picked for being true, short and searchable.
 * Review language is deliberately scoped: human review applies to AI Manager
 * calendar posts, not to everything created in SocioGenie.
 */
type Statement = {
  /** Wrap a word in [brackets] to paint it in `accent`; punctuation after
   *  the closing bracket stays neutral. */
  text: string;
  /** Semantic `--brand-*-text` token for the bracketed words. */
  accent: string;
};

const STATEMENT_ROWS: Statement[][] = [
  [
    {
      text: 'Keep your social media [running] without running it yourself.',
      accent: 'var(--brand-sky-text)',
    },
    {
      text: 'A [personalized,] [accurate] and [trustworthy] social presence — with much less ongoing effort.',
      accent: 'var(--brand-violet-text)',
    },
    {
      text: '[Human] [review] applies to the posts AI Manager plans and publishes for you.',
      accent: 'var(--brand-orchid-text)',
    },
  ],
  [
    {
      text: 'Your AI learns [your] [business] before it creates for you.',
      accent: 'var(--brand-pink-text)',
    },
    {
      text: 'You have a business to run. [Not] [a] [social] [calendar] to manage.',
      accent: 'var(--brand-coral-text)',
    },
    {
      text: 'Automate your social media [without] [handing] [your] [brand] over to AI.',
      accent: 'var(--brand-amber-text)',
    },
  ],
];

function StatementLine({ statement }: { statement: Statement }) {
  const words = statement.text.split(' ');
  return (
    <span className="statement-marquee__item">
      <span>
        {words.map((raw, i) => {
          const match = /^\[(.+)\](.*)$/.exec(raw);
          const space = i < words.length - 1 ? ' ' : '';
          return match ? (
            <span key={i}>
              <span style={{ color: statement.accent }}>{match[1]}</span>
              {match[2]}
              {space}
            </span>
          ) : (
            <span key={i}>
              {raw}
              {space}
            </span>
          );
        })}
      </span>
      <Sparkles
        className="statement-marquee__mark"
        style={{ color: statement.accent }}
        aria-hidden
      />
    </span>
  );
}

type Pillar = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
};

const PILLARS: Pillar[] = [
  {
    id: 'always-on',
    title: 'Always-on presence',
    description:
      'Planned, created and published on schedule — even in your busiest weeks.',
    icon: RefreshCw,
    accent: 'var(--brand-sky)',
  },
  {
    id: 'your-business',
    title: 'Your business, not generic AI',
    description:
      'It learns your products, voice and design before it writes a word.',
    icon: Fingerprint,
    accent: 'var(--brand-violet)',
  },
  {
    id: 'oversight',
    title: 'Automation with oversight',
    description:
      'AI Manager posts are cleared by you, or by our in-house team.',
    icon: UserCheck,
    accent: 'var(--brand-orchid)',
  },
];

/**
 * The "why" lines, as two display-size bands sliding in opposite directions.
 * Lives in the hero, directly under the H1. Full-bleed: render it outside
 * any `.expo-container` so the lines run edge to edge.
 */
export function LandingStatementMarquees() {
  return (
    <div id="why-sociogenie">
      {/* What it is, then why people hire it. The answer block is the same
          text the JSON-LD carries, so it stays in the hero for crawlers. */}
      <div className="expo-container text-center" id="what-is-sociogenie">
        <h2 className="text-eyebrow">What is SocioGenie</h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-secondary sm:text-base">
          {HOMEPAGE_ANSWER}
        </p>
      </div>

      <h2 className="mt-12 text-eyebrow text-center">
        Why businesses hire SocioGenie
      </h2>
      <div className="mt-6 flex flex-col gap-3 sm:gap-4">
        {STATEMENT_ROWS.map((row, i) => (
          <Marquee
            key={i}
            label="Why businesses hire SocioGenie"
            className="statement-marquee statement-marquee--hero"
            reverse={i % 2 === 1}
            duration={70}
            items={row.map((statement) => (
              <StatementLine key={statement.text} statement={statement} />
            ))}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The three pillars as plain static text, then the Studio / AI Manager line.
 */
export function LandingPositioning() {
  return (
    <section className="expo-section" id="pillars">
      <div className="expo-container">
        <div className="grid gap-4 md:grid-cols-3">
          {PILLARS.map((pillar) => (
            <article
              key={pillar.id}
              className="brand-card flex flex-col gap-4 p-6"
              style={{ '--card-accent': pillar.accent } as React.CSSProperties}
            >
              <span className="brand-chip">
                <pillar.icon className="size-5" strokeWidth={2} aria-hidden />
              </span>
              <h3 className="text-subsection text-default">{pillar.title}</h3>
              <p className="text-sm leading-relaxed text-secondary">
                {pillar.description}
              </p>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-secondary">
          <span className="font-semibold text-default">Studio</span> — you
          create. <span className="font-semibold text-default">AI Manager</span>{' '}
          — it runs your calendar.
        </p>
      </div>
    </section>
  );
}

/* ── How AI Manager runs the calendar ─────────────────────────── */

type LoopStep = { title: string; note: string; accent: string };

/** The cycle, in the order it runs. The review step is the only one with a
 *  person in it — you, or SocioGenie's in-house team. */
const LOOP_STEPS: LoopStep[] = [
  {
    title: 'Plans',
    note: 'What to post, and when.',
    accent: 'var(--brand-sky-text)',
  },
  {
    title: 'Creates',
    note: 'Each post, two days ahead.',
    accent: 'var(--brand-indigo-text)',
  },
  {
    title: 'Review',
    note: 'You approve — or our team does.',
    accent: 'var(--brand-violet-text)',
  },
  {
    title: 'Publishes',
    note: 'At your best hour.',
    accent: 'var(--brand-orchid-text)',
  },
  {
    title: 'Learns',
    note: 'From what performed.',
    accent: 'var(--brand-pink-text)',
  },
];

/**
 * How AI Manager operates, as a flow: one setup step you do once, then a
 * cycle that repeats on its own. Sits under the hero CTAs.
 *
 * Two motions carry the idea of a loop without words: a highlight that walks
 * the steps in order, and dashes flowing along the return path from the last
 * step back to the first. Both stop under reduced motion.
 */
export function AiManagerLoop() {
  return (
    <div className="mx-auto mt-12 max-w-5xl">
      <p className="text-eyebrow">How AI Manager runs your social media</p>

      <div className="mt-5 flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
        {/* Once */}
        <div className="rounded-2xl border border-default bg-element px-4 py-4 text-left lg:w-56 lg:shrink-0">
          <span className="inline-flex h-5 items-center rounded-full bg-[color-mix(in_srgb,var(--brand-amber)_16%,transparent)] px-2 font-mono text-[11px] font-medium uppercase tracking-[-0.5px] text-[var(--brand-amber-text)]">
            Once · 10 min
          </span>
          <p className="mt-2 text-sm font-semibold text-default">
            You set up your brand
          </p>
          <p className="mt-0.5 text-xs leading-snug text-tertiary">
            Website, products, style and accounts.
          </p>
        </div>

        <ArrowRight
          className="mx-auto size-4 shrink-0 rotate-90 text-tertiary lg:rotate-0"
          aria-hidden
        />

        {/* Every cycle */}
        <div className="flex-1 rounded-3xl border border-default p-3 sm:p-4">
          <p className="px-1 text-left text-eyebrow">
            Then it runs, every cycle
          </p>

          <ol className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-5 sm:gap-2">
            {LOOP_STEPS.map((step, i) => (
              <li
                key={step.title}
                className="loop-step flex items-baseline gap-2.5 rounded-xl border border-default bg-element px-3 py-2 text-left sm:block sm:rounded-2xl sm:py-3"
                style={
                  {
                    '--step-accent': step.accent,
                    '--step-delay': `${i * 1.6}s`,
                  } as React.CSSProperties
                }
              >
                <span
                  className="font-mono text-xs font-medium tabular-nums"
                  style={{ color: step.accent }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-sm font-semibold text-default sm:mt-1">
                  {step.title}
                </p>
                <p className="text-xs leading-snug text-tertiary sm:mt-0.5">
                  {step.note}
                </p>
              </li>
            ))}
          </ol>

          {/* Return path: from the last step back to the first. The line
              stretches with the row; the arrowhead is an icon so it never
              distorts. Desktop only — the stacked mobile list says it in
              words instead. */}
          <div
            className="loop-return relative mt-1 hidden h-10 sm:block"
            aria-hidden
          >
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 1000 40"
              preserveAspectRatio="none"
            >
              <path
                className="loop-return__path"
                d="M 900 0 V 24 H 100 V 6"
                fill="none"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <ArrowUp
              className="absolute left-[10%] top-0 size-3.5 -translate-x-1/2 -translate-y-1 text-[var(--brand-violet-text)]"
              strokeWidth={2.5}
            />
          </div>

          <p className="mt-1 flex items-center justify-center gap-1.5 text-xs font-medium text-secondary sm:-mt-3">
            <RefreshCw
              className="loop-spin size-3.5 text-[var(--brand-violet-text)]"
              aria-hidden
            />
            Repeats every cycle — your social media runs itself.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Who it's for ─────────────────────────────────────────────── */

/**
 * Two bands sliding in opposite directions: who it's for, and what it posts
 * about. The occasions row is the page's answer to "what would I even post?"
 */
export function LandingMarquees({
  region = GLOBAL,
}: {
  region?: LandingRegion;
}) {
  return (
    <section className="expo-section-compact">
      <div className="expo-container">
        <p className="text-eyebrow text-center">{region.audience}</p>
      </div>
      <div className="mt-8 flex flex-col gap-3">
        <Marquee
          label="Industries SocioGenie posts for"
          duration={45}
          items={region.industries.map((name) => (
            <span key={name} className="marquee-chip">
              <Gem className="size-3.5 text-tertiary" aria-hidden />
              {name}
            </span>
          ))}
        />
        <Marquee
          label="Festivals and occasions SocioGenie plans posts for"
          reverse
          duration={55}
          items={region.occasions.map((name) => (
            <span key={name} className="marquee-chip">
              <Sparkles
                className="size-3.5 text-[var(--brand-amber-text)]"
                aria-hidden
              />
              {name}
            </span>
          ))}
        />
      </div>
    </section>
  );
}

/* ── Agency cost ──────────────────────────────────────────────── */

/**
 * The real competitor is the agency retainer, not another app, so the page
 * puts the number next to it. Prices come from the region config and are
 * rendered on the server, so crawlers and AI assistants read the same price
 * a visitor does.
 */
export function LandingAgencyCost({
  region = GLOBAL,
}: {
  region?: LandingRegion;
}) {
  const { agencyCost } = region;
  return (
    <section className="expo-section" id="agency-cost">
      <div className="expo-container">
        <div className="max-w-3xl">
          <p className="text-eyebrow text-[var(--brand-violet-text)]">
            Social media agency vs software
          </p>
          <h2 className="mt-6 text-display-2 text-default">
            An agency charges{' '}
            <RotatingWords
              words={agencyCost.fees}
              colors={['var(--brand-coral-text)']}
              interval={2400}
              className="font-mono tracking-[-0.06em]"
            />{' '}
            a month.
            <br />
            <span className="text-gradient-brand">{agencyCost.startsAt}</span>
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-secondary">
            {agencyCost.body}
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {agencyCost.rows.map((row) => (
            <article
              key={row.id}
              className={
                row.highlight
                  ? 'brand-card flex flex-col gap-3 p-6'
                  : 'flex flex-col gap-3 rounded-2xl border border-default bg-element p-6'
              }
            >
              <p
                className={
                  row.highlight
                    ? 'text-eyebrow text-[var(--brand-violet-text)]'
                    : 'text-eyebrow'
                }
              >
                {row.label}
              </p>
              <p className="text-metric text-4xl">{row.price}</p>
              <p className="text-sm text-tertiary">{row.period}</p>
              <p className="text-sm leading-relaxed text-secondary">
                {row.note}
              </p>
            </article>
          ))}
        </div>

        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-tertiary">
          {agencyCost.footnote}
        </p>
      </div>
    </section>
  );
}

/* ── The moat: what AI Manager actually does ──────────────────── */

const NEVER = [
  'alter your product.',
  'invent a discount.',
  'guess your colors.',
  "use a partner's logo.",
];

type Capability = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
};

function capabilities(region: LandingRegion): Capability[] {
  return [
    {
      id: 'reads',
      title: 'Reads your website first',
      description:
        'Your story, exact brand colors and your own logo — pulled from your live site.',
      icon: Globe,
      accent: 'var(--brand-cyan)',
    },
    {
      id: 'design',
      title: 'Learns your design',
      description:
        'Typography, colors and layout — learned per platform from your existing posts.',
      icon: Palette,
      accent: 'var(--brand-indigo)',
    },
    {
      id: 'pixel-lock',
      title: 'Never alters your product',
      description: `Your real necklace, frame or ${region.productExample} stays untouched. Only the scene is generated.`,
      icon: Gem,
      accent: 'var(--brand-pink)',
    },
    {
      id: 'claims',
      title: "Won't invent an offer",
      description:
        'Promotions appear only when you have actually offered them.',
      icon: Ban,
      accent: 'var(--brand-coral)',
    },
    {
      id: 'research',
      title: 'Researches your market live',
      description:
        'Every post is grounded in current research, with sources cited.',
      icon: Search,
      accent: 'var(--brand-violet)',
    },
  ];
}

export function LandingAiManager({
  region = GLOBAL,
}: {
  region?: LandingRegion;
}) {
  return (
    <section className="brand-wash-section expo-section" id="ai-manager">
      <div className="expo-container">
        <div className="max-w-3xl">
          <p className="brand-pill">
            <Wand2 className="size-3.5" aria-hidden />
            AI Manager
          </p>
          <h2 className="mt-6 text-display-2 text-default">
            It will never
            <br />
            <RotatingWords
              words={NEVER}
              colors={[
                'var(--brand-pink-text)',
                'var(--brand-coral-text)',
                'var(--brand-sky-text)',
                'var(--brand-orchid-text)',
              ]}
              interval={2600}
            />
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-secondary">
            AI you can hand your Instagram to: it describes your product exactly
            and never promises what you didn&apos;t offer.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities(region).map((item) => (
            <article
              key={item.id}
              className="brand-card flex flex-col gap-4 p-6"
              style={{ '--card-accent': item.accent } as React.CSSProperties}
            >
              <span className="brand-chip">
                <item.icon className="size-5" strokeWidth={2} aria-hidden />
              </span>
              <h3 className="text-subsection text-default">{item.title}</h3>
              <p className="text-sm leading-relaxed text-secondary">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Marketing visuals ────────────────────────────────────────── */

const SURFACES = [
  'billboard.',
  'metro lightbox.',
  'magazine spread.',
  'storefront window.',
  'city skyline.',
];

type SceneTopic = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
};

/** The five topics in the Marketing Scenes catalog
 *  (`backend/packages/shared/src/ai/marketing-scenes.json`). */
const SCENE_TOPICS: SceneTopic[] = [
  {
    id: 'billboard',
    title: 'Billboard',
    description: 'Highway, rooftop or LED board — shot like the real thing.',
    icon: Building,
    accent: 'var(--brand-sky)',
  },
  {
    id: 'transit-lightbox',
    title: 'Transit lightbox',
    description: 'Backlit at a bus shelter, metro or airport.',
    icon: TrainFront,
    accent: 'var(--brand-cyan)',
  },
  {
    id: 'magazine-spread',
    title: 'Magazine spread',
    description: 'An editorial print page, styled with props.',
    icon: BookOpen,
    accent: 'var(--brand-orchid)',
  },
  {
    id: 'storefront-window',
    title: 'Storefront window',
    description: 'The hero of a shop window, day or night.',
    icon: Store,
    accent: 'var(--brand-pink)',
  },
  {
    id: 'scale-stunt',
    title: 'Scale stunt',
    description: 'Your product, giant-sized in the city.',
    icon: Maximize2,
    accent: 'var(--brand-coral)',
  },
];

/**
 * Marketing visuals replaced the five automatic campaign slots in AI Manager
 * (allocation v6). Each one takes a photo from the brand's own library and
 * stages the exact product inside a real-world ad placement.
 */
export function LandingMarketingVisuals({
  region = GLOBAL,
}: {
  region?: LandingRegion;
}) {
  return (
    <section className="expo-section" id="marketing-visuals">
      <div className="expo-container">
        <div className="max-w-3xl">
          <p className="brand-pill">
            <Megaphone className="size-3.5" aria-hidden />
            Marketing visuals
          </p>
          <h2 className="mt-6 text-display-2 text-default">
            Your product on a
            <br />
            <RotatingWords
              words={SURFACES}
              colors={[
                'var(--brand-sky-text)',
                'var(--brand-cyan-text)',
                'var(--brand-orchid-text)',
                'var(--brand-pink-text)',
                'var(--brand-coral-text)',
              ]}
              interval={2600}
            />
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-secondary">
            Big-brand ad looks, no media budget. Your exact product, staged in a
            real-world placement {region.sceneSetting}.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {SCENE_TOPICS.map((topic) => (
            <article
              key={topic.id}
              className="brand-card flex flex-col gap-4 p-6"
              style={{ '--card-accent': topic.accent } as React.CSSProperties}
            >
              <span className="brand-chip">
                <topic.icon className="size-5" strokeWidth={2} aria-hidden />
              </span>
              <h3 className="text-subsection text-default">{topic.title}</h3>
              <p className="text-sm leading-relaxed text-secondary">
                {topic.description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-default bg-element p-6">
            <p className="text-eyebrow">On AI Manager</p>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              <span className="font-semibold text-default">5 every cycle</span>,
              included in your plan.
            </p>
          </div>
          <div className="rounded-2xl border border-default bg-element p-6">
            <p className="text-eyebrow">On every plan</p>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              <span className="font-semibold text-default">
                Marketing Scenes
              </span>{' '}
              — pick the placement yourself. 2 credits per platform.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Official platform APIs ───────────────────────────────────── */

type TrustPoint = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
};

const TRUST_POINTS: TrustPoint[] = [
  {
    id: 'meta',
    title: 'Meta App Review approved',
    description:
      'Instagram and Facebook posts go through Meta’s official Graph API.',
    icon: BadgeCheck,
    accent: 'var(--brand-sky)',
  },
  {
    id: 'linkedin',
    title: 'Official LinkedIn API',
    description:
      'Posts and analytics for your Company Page, via LinkedIn’s API.',
    icon: Network,
    accent: 'var(--brand-cyan)',
  },
  {
    id: 'password',
    title: 'Your password stays yours',
    description:
      'Connect on Meta’s or LinkedIn’s own sign-in. Revoke any time.',
    icon: KeyRound,
    accent: 'var(--brand-violet)',
  },
  {
    id: 'no-bots',
    title: 'No bots logging in as you',
    description: 'No browser automation. No shared logins.',
    icon: ShieldCheck,
    accent: 'var(--brand-pink)',
  },
];

export function LandingOfficialApis() {
  return (
    <section className="expo-section" id="official-api">
      <div className="expo-container">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
          <div className="lg:sticky lg:top-32">
            <p className="text-eyebrow text-[var(--brand-violet-text)]">
              Official platform APIs
            </p>
            <h2 className="mt-6 text-display-2 text-default">
              Connected{' '}
              <span className="text-gradient-brand">the official way.</span>
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-secondary">
              The approved route for software to post for a business.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {TRUST_POINTS.map((point) => (
              <article
                key={point.id}
                className="brand-card flex flex-col gap-4 p-6"
                style={{ '--card-accent': point.accent } as React.CSSProperties}
              >
                <span className="brand-chip">
                  <point.icon className="size-5" strokeWidth={2} aria-hidden />
                </span>
                <h3 className="text-subsection text-default">{point.title}</h3>
                <p className="text-sm leading-relaxed text-secondary">
                  {point.description}
                </p>
              </article>
            ))}
          </div>
        </div>

        <p className="mt-10 text-xs leading-relaxed text-quaternary">
          Instagram, Facebook and Meta are trademarks of Meta Platforms, Inc.;
          LinkedIn of LinkedIn Corporation. SocioGenie (MAGNATEX LLP) is not
          affiliated with or endorsed by either.
        </p>
      </div>
    </section>
  );
}
