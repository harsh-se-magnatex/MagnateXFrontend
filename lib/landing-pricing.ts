export type PricingLine = { text: string; sub?: boolean };

export type PlanTier = 'studio' | 'prime' | 'elite' | 'legacy';
export type PlanMode = 'AI' | 'Studio';
export type PlanId =
  | 'studio'
  | 'prime-AI'
  | 'elite-AI'
  | 'legacy-AI';

export type PricingPlan = {
  /** Marketing display name shown on the card header (e.g. "Prime Studio"). */
  name: string;
  /** Internal plan id; matches `users/{uid}.activePlan`. */
  id: PlanId;
  tier: PlanTier;
  mode: PlanMode;
  subtitle: string;
  price: string;
  originalPrice?: string;
  discountLabel?: string;
  period: string;
  highlighted?: boolean;
  badge?: string;
  /** Prime & Legacy currently show "Coming soon" on the public landing if true. */
  comingSoon?: boolean;
  lines: PricingLine[];
};

export const PLAN_MOST_POPULAR_BADGE = 'Most popular';

/** Title-case plan name for buttons (e.g. PRIME → Prime, elite → Elite). */
export function planButtonDisplayName(raw?: string | null): string {
  const t = typeof raw === 'string' ? raw.trim() : '';
  if (!t) return 'Plan';
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase().replace('ai', 'AI').replace('studio', 'Studio');
}

// ===== Per-plan pricing + credit math (source of truth) ===============
//
// Mirrors `PRICE_BY_TIER_MODE` + `CREDITS_BY_TIER_MODE` in
// `backend/apps/api/src/scripts/seed-plans.ts`. Update both in lockstep
// when pricing changes.
//
// Plan math (per-feature credit cost \u2014 see "Credit usage" on /billings):
//   Product Advert: 4   Campaign: 3   Quick: 2   Bulk: 2
//   AI engine (manual trigger): 2   Festive: 2   Regen: 1

const PRICE_BY_PLAN_ID: Record<PlanId, string> = {
  studio: '$14.99',
  'prime-AI': '$49.99',
  'elite-AI': '$69.99',
  'legacy-AI': '$84.99',
};

const CREDITS_BY_PLAN_ID: Record<PlanId, number> = {
  studio: 100,
  'prime-AI': 50,
  'elite-AI': 100,
  'legacy-AI': 150,
};

const AI_PLAN_PLATFORMS_BY_TIER: Record<Exclude<PlanTier, 'studio'>, string> = {
  prime: 'AI Plan automation for 1 selected platform',
  elite: 'AI Plan automation for up to 2 selected platforms',
  legacy: 'AI Plan automation for up to 3 selected platforms',
};

const DISPLAY_NAME_BY_PLAN_ID: Record<PlanId, string> = {
  studio: 'Studio',
  'prime-AI': 'Prime AI',
  'elite-AI': 'Elite AI',
  'legacy-AI': 'Legacy AI',
};

const SUBTITLE_BY_PLAN_ID: Record<PlanId, string> = {
  studio: 'Manual content creation and scheduling across every supported platform',
  'prime-AI': 'All-platform manual tools plus personalized AI Plan automation for one platform',
  'elite-AI': 'All-platform manual tools plus personalized AI Plan automation for up to two platforms',
  'legacy-AI': 'All-platform manual tools plus personalized AI Plan automation for up to three platforms',
};

/**
 * Build the per-card feature list. Math mirrors the per-feature credit
 * costs above:
 *   product adverts = floor(credits / 4)
 *   quick + festive = floor(credits / 2)
 *   campaign days   = floor(credits / 3)
 *   carousel posts  = floor(credits / 15)  // typical 5 slides × 3
 *   video generation = floor(credits / 15) // manual Veo only
 */
function buildFeatureLines(id: PlanId): PricingLine[] {
  const tier = (id === 'studio' ? 'studio' : id.split('-')[0]) as PlanTier;
  const mode: PlanMode = id === 'studio' ? 'Studio' : 'AI';
  const credits = CREDITS_BY_PLAN_ID[id];
  const lines: PricingLine[] = [];

  lines.push({ text: 'Manual creation and scheduling across Facebook, Instagram & LinkedIn' });
  if (mode === 'Studio') lines.push({ text: 'Create and schedule your own content' });
  if (mode === 'AI') {
    lines.push({ text: AI_PLAN_PLATFORMS_BY_TIER[tier as Exclude<PlanTier, 'studio'>] });
    lines.push({ text: 'Your personalized AI manages content for your selected AI Plan platforms' });
  }
  if (mode === 'AI') lines.push({ text: 'Human-reviewed content' });
  lines.push({ text: `${credits} credits per month for manual creation tools` });
  lines.push({ text: 'AI-powered analytics & recommendations' });
  return lines;
}

function buildPlan(id: PlanId): PricingPlan {
  const tier = (id === 'studio' ? 'studio' : id.split('-')[0]) as PlanTier;
  const mode: PlanMode = id === 'studio' ? 'Studio' : 'AI';
  return {
    id,
    tier,
    mode,
    name: DISPLAY_NAME_BY_PLAN_ID[id],
    subtitle: SUBTITLE_BY_PLAN_ID[id],
    price: PRICE_BY_PLAN_ID[id],
    period: '/month',
    highlighted: tier === 'elite',
    badge: tier === 'elite' ? PLAN_MOST_POPULAR_BADGE : undefined,
    comingSoon: false,
    lines: buildFeatureLines(id),
  };
}

/** All 6 plans (3 Studio \u00d7 3 AI) keyed by full plan id. */
export const PRICING_PLANS_BY_ID: Record<PlanId, PricingPlan> = {
  studio: buildPlan('studio'),
  'prime-AI': buildPlan('prime-AI'),
  'elite-AI': buildPlan('elite-AI'),
  'legacy-AI': buildPlan('legacy-AI'),
};  

/** 3 Studio (manual) plans in tier order. */
export const PRICING_PLANS_MANUAL: PricingPlan[] = [
  PRICING_PLANS_BY_ID.studio,
];

/** 3 AI (auto) plans in tier order. */
export const PRICING_PLANS_AUTO: PricingPlan[] = [
  PRICING_PLANS_BY_ID['prime-AI'],
  PRICING_PLANS_BY_ID['elite-AI'],
  PRICING_PLANS_BY_ID['legacy-AI'],
];

/**
 * Backward-compat default \u2014 returns the Studio (manual) trio. Existing
 * consumers that don't know about modes get the manual plans. New
 * consumers should import `PRICING_PLANS_MANUAL` / `PRICING_PLANS_AUTO`
 * directly or use `pricingPlansForMode(mode)`.
 */
export const PRICING_PLANS: PricingPlan[] = PRICING_PLANS_MANUAL;

export function pricingPlansForMode(mode: PlanMode): PricingPlan[] {
  return mode === 'AI' ? PRICING_PLANS_AUTO : PRICING_PLANS_MANUAL;
}
/**
 * Plan card metadata for the billing upgrade modal, keyed by full plan
 * id. The modal's mode toggle picks the right entry via
 * `PLAN_COMPARISON_BULLETS[${tier}-${mode}]`.
 */
export const PLAN_COMPARISON_BULLETS: Record<
  string,
  { title: string; bullets: string[]; recommended?: boolean }
> = (Object.keys(PRICING_PLANS_BY_ID) as PlanId[]).reduce(
  (acc, id) => {
    const plan = PRICING_PLANS_BY_ID[id];
    acc[id] = {
      title: plan.name,
      bullets: plan.lines.map((l) => l.text),
      recommended: plan.tier === 'elite',
    };
    return acc;
  },
  {} as Record<
    string,
    { title: string; bullets: string[]; recommended?: boolean }
  >
);

export type CreditPackDisplay = {
  name: string;
  price: string;
  credits: string;
  comingSoon?: boolean;
};

/**
 * Credit-pack catalog. Mirrors the `credit_packs/{id}` Firestore docs
 * (which must be created out-of-band \u2014 there's no seed script). Update
 * both whenever pricing changes.
 *
 * Validity: 30 days from purchase (enforced in payment fulfillment).
 */
export const CREDIT_TOPUP_PACKS: readonly CreditPackDisplay[] = [
  { name: 'Starter', price: '$6.99', credits: '40 credits', comingSoon: false },
  { name: 'Basic', price: '$14.99', credits: '100 credits', comingSoon: false },
  { name: 'Growth', price: '$28.99', credits: '200 credits', comingSoon: false },
  { name: 'Business', price: '$41.99', credits: '300 credits', comingSoon: false },
] as const;
