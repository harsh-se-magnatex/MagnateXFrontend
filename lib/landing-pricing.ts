export type PricingLine = { text: string; sub?: boolean };

export type PricingPlan = {
  name: string;
  subtitle: string;
  price: string;
  originalPrice?: string;
  discountLabel?: string;
  period: string;
  highlighted?: boolean;
  badge?: string;
  /** Prime & Legacy are view-only until launch */
  comingSoon?: boolean;
  lines: PricingLine[];
};

/** Elite-only first line on plan cards (landing + billing plan picker). */
export const PLAN_TRIAL_FEATURE_LINE: PricingLine = {
  text: '10-day free trial — full plan access; you are not charged until the trial ends',
  sub: true,
};

/**
 * Billing / checkout-style disclosure: Elite trial vs Prime/Legacy billing at start.
 */
export const PLAN_TRIAL_BILLING_NOTICE =
  'Elite includes a 10-day free trial with full plan access; you are not charged until the trial ends. Prime and Legacy subscriptions bill the monthly price when you start your subscription.';

/** One-line trial summary for page intros (e.g. public pricing hero). */
export const PLAN_TRIAL_HERO_LINE =
  'Elite includes a 10-day free trial — billing starts after day 10 at Elite’s monthly price. Prime and Legacy bill monthly from when you subscribe.';

/** Second line on plan CTAs (pricing page cards + billing upgrade modal). */
export const PLAN_TRIAL_BUTTON_SUBLABEL = '10 days free';

/** Title-case plan name for buttons (e.g. PRIME → Prime, elite → Elite). */
export function planButtonDisplayName(raw: string): string {
  const t = raw.trim();
  if (!t) return 'Plan';
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/** Prime & Legacy show “Coming soon”; Elite is the active promotional tier. */
export const PRICING_PLANS: PricingPlan[] = [
  {
    name: 'PRIME',
    subtitle: 'Best for businesses starting on one platform',
    price: '$24.99',
    period: '/month',
    comingSoon: false,
    lines: [
      { text: '1 Platform' },
      { text: 'Daily automated posts' },
      { text: 'Human-reviewed content' },
      {
        text: '50 credits/month — up to 12 product adverts, 25 instant generation posts, 25 festive posts',
      },
      { text: 'AI-powered analytics & recommendations' }
    ],
  },
  {
    name: 'ELITE',
    subtitle: 'Best for teams scaling on two platforms',
    price: '$39.99',
    // originalPrice: '₹3,499',
    period: '/month',
    highlighted: true,
    lines: [
      PLAN_TRIAL_FEATURE_LINE,
      { text: 'Up to 2 Platforms' },
      { text: 'Daily automated posts' },
      { text: 'Human-reviewed content' },
      {
        text: '120 credits/month — up to 30 product adverts, 60 instant generation posts, 60 festive posts',
      },
      { text: 'AI-powered analytics & recommendations' },
    ],
  },
  {
    name: 'LEGACY',
    subtitle: 'Best for established brands on all three platforms',
    price: '$59.99',
    period: '/month',
    comingSoon: false,
    lines: [
      { text: 'Up to 3 Platforms' },
      { text: 'Daily automated posts' },
      { text: 'Human-reviewed content' },
      {
        text: '260 credits/month — up to 65 product adverts, 130 instant generation posts, 130 festive posts',
      },
      { text: 'AI-powered analytics & recommendations' },
    ],
  },
];

/** Billing modal plan cards — same bullet copy as `PRICING_PLANS`. */
export const PLAN_COMPARISON_BULLETS: Record<
  string,
  { title: string; bullets: string[]; recommended?: boolean }
> = {
  prime: {
    title: 'Prime',
    bullets: PRICING_PLANS[0].lines.map((l) => l.text),
  },
  elite: {
    title: 'Elite',
    recommended: true,
    bullets: PRICING_PLANS[1].lines.map((l) => l.text),
  },
  legacy: {
    title: 'Legacy',
    bullets: PRICING_PLANS[2].lines.map((l) => l.text),
  },
};

export type CreditPackDisplay = {
  name: string;
  price: string;
  credits: string;
  comingSoon?: boolean;
};

export const CREDIT_TOPUP_PACKS = [
  { name: 'Starter', price: '$4.99', credits: '40 credits', comingSoon: false },
  { name: 'Basic', price: '$9.99', credits: '100 credits', comingSoon: false },
  { name: 'Growth', price: '$19.99', credits: '200 credits', comingSoon: false },
  { name: 'Business', price: '$39.99', credits: '600 credits', comingSoon: false },
] as const;
