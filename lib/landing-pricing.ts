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

/** Prime & Legacy show “Coming soon”; Elite is the active promotional tier. */
export const PRICING_PLANS: PricingPlan[] = [
  {
    name: 'PRIME',
    subtitle: 'Best for businesses starting on one platform',
    price: '₹1,999',
    period: '/month',
    comingSoon: true,
    lines: [
      { text: '1 Platform' },
      { text: 'Daily automated posts' },
      { text: 'Human-reviewed content' },
      {
        text: '50 credits/month — up to 12 product adverts, 25 instant generation posts, 25 festive posts',
      },
      { text: 'Smart Campaigns' },
      { text: 'Custom prompt-based posts' },
    ],
  },
  {
    name: 'ELITE',
    subtitle: 'Full Elite access — complimentary for your first two months',
    price: '₹0',
    originalPrice: '₹3,499',
    discountLabel: '2 MONTHS FREE',
    period: 'for 2 months',
    highlighted: true,
    badge: 'LIMITED OFFER',
    lines: [
      { text: 'Up to 2 Platforms' },
      { text: 'Daily automated posts' },
      { text: 'Human-reviewed content' },
      {
        text: '120 credits/month — up to 30 product adverts, 60 instant generation posts, 60 festive posts',
      },
      { text: 'Basic analytics dashboard' },
    ],
  },
  {
    name: 'LEGACY',
    subtitle: 'Best for established brands on all three platforms',
    price: '₹5,999',
    period: '/month',
    comingSoon: true,
    lines: [
      { text: 'Up to 3 Platforms' },
      { text: 'Daily automated posts' },
      { text: 'Human-reviewed content' },
      {
        text: '260 credits/month — up to 65 product adverts, 130 instant generation posts, 130 festive posts',
      },
      { text: 'AI-powered analytics & recommendations' },
      { text: 'Priority content generation' },
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
  { name: 'Starter', price: '₹499', credits: '40 credits', comingSoon: false },
  { name: 'Basic', price: '₹999', credits: '100 credits', comingSoon: false },
  { name: 'Growth', price: '₹1,999', credits: '250 credits', comingSoon: false },
  { name: 'Business', price: '₹3,999', credits: '600 credits', comingSoon: false },
] as const;
