import type { TourId, TourRequest } from '@/src/stores/tourState';
import { WORKSPACE_NAV_HREFS } from '@/lib/workspace-nav';

export type TourStep = {
  /** CSS selector for the target element. */
  element: string;
  /** The route this step belongs to (used to drive cross-page navigation). */
  path: string;
  title: string;
  /** Plain text; rendered into driver.js's description element. */
  description: string;
  /** Tooltip side relative to the target. driver.js side. */
  side?: 'top' | 'right' | 'bottom' | 'left' | 'over';
  align?: 'start' | 'center' | 'end';
  /** Shows a "Paid plan" pill in the popover footer. */
  paid?: boolean;
  /**
   * Last step in the tour. Renders a "See plans" primary action that pushes
   * `/pricing` instead of advancing.
   */
  finalCta?: {
    label: string;
    route: string;
  };
};

/** Final upgrade CTA shared by all locales. */
const FINAL_STEP: TourStep = {
  element: '#tour-upgrade-cta',
  path: '/home',
  side: 'bottom',
  align: 'end',
  title: 'Ready to start creating?',
  description:
    'Almost everything you just saw needs a plan. Pick one to unlock generation — cancel anytime.',
  finalCta: { label: 'See plans', route: '/settings/billings?upgrade=1' },
};

/** Tour A — onboarding (3 steps, single page) */
const ONBOARDING_STEPS: TourStep[] = [
  {
    element: '#tour-onb-card',
    path: '/onBoarding',
    side: 'bottom',
    title: 'Welcome to SocioGenie',
    description:
      "Let's get your brand set up in ~2 minutes. Your answers power every AI post we generate for you.",
  },
  {
    element: '#tour-onb-controls',
    path: '/onBoarding',
    side: 'top',
    title: 'Move at your pace',
    description:
      'Hit Next to advance. Skip any question — you can always edit it later in Brand DNA.',
  },
  {
    element: '#tour-onb-progress',
    path: '/onBoarding',
    side: 'bottom',
    title: "What's next",
    description:
      "When the counter hits the end, we'll take you to your Business Data to fine-tune your brand voice with a few questions and reference photos.",
  },
];

/** Tour B — brand-memory / Business Data (1 step, single page).
 *  Originally 2 steps; collapsed because the photo-upload area only renders
 *  in the second phase of the form, so a single welcome step is cleaner. */
const BRAND_MEMORY_STEPS: TourStep[] = [
  {
    element: '#tour-bm-card',
    path: '/brand-memory',
    side: 'over',
    title: 'Train your brand voice',
    description:
      'Answer a few quick questions so the AI understands your tone, products, and audience. After the questions, you can upload a handful of brand reference photos that the AI will mimic in every future post.',
  },
];

/** Tour C — platform walkthrough (17 steps, cross-page) */
const PLATFORM_STEPS: TourStep[] = [
  // 8a. Home → Content Studio (2 steps)
  {
    element: '#tour-home-command',
    path: '/home',
    side: 'bottom',
    title: 'Your launchpad',
    description:
      'Welcome to your dashboard — credits, scheduled posts, and a one-shot prompt box all live here.',
  },
  {
    element: '#tour-nav-content-studio',
    path: '/home',
    side: 'right',
    title: 'Content Studio',
    description:
      "Let's start with single, on-demand posts. Click Next to take a look inside.",
  },
  // 8b. Content Studio (3 steps)
  {
    element: '#tour-qc-prompt',
    path: WORKSPACE_NAV_HREFS.quickCreate,
    side: 'bottom',
    title: 'Your prompt goes here',
    description:
      'Describe the post — product, audience, vibe. You can also drop in a reference image.',
    paid: true,
  },
  {
    element: '#tour-qc-platforms',
    path: WORKSPACE_NAV_HREFS.quickCreate,
    side: 'top',
    title: 'Pick the platform',
    description:
      'Choose Instagram, Facebook, LinkedIn, or all three — we generate one post per platform.',
    paid: true,
  },
  {
    element: '#tour-qc-generate',
    path: WORKSPACE_NAV_HREFS.quickCreate,
    side: 'top',
    title: 'Generate, then schedule',
    description:
      "Hit Generate (one credit per platform). The Schedule panel on the right unlocks the moment a post appears — pick a date and time and you're done.",
    paid: true,
  },
  // 8d. Product Ads (3 steps)
  {
    element: '#tour-pa-upload',
    path: WORKSPACE_NAV_HREFS.productAdvert,
    side: 'bottom',
    title: 'Upload + pick a mode',
    description:
      'Drop a PNG of your product, then choose what we generate. There are two modes — let me show you.',
    paid: true,
  },
  {
    element: '#tour-pa-mode-advert',
    path: WORKSPACE_NAV_HREFS.productAdvert,
    side: 'right',
    title: 'Mode 1 — Advert image',
    description:
      'Generates only the ad creative (background, lighting, logo placement). Use it when you already have your own caption.',
    paid: true,
  },
  {
    element: '#tour-pa-mode-social',
    path: WORKSPACE_NAV_HREFS.productAdvert,
    side: 'right',
    title: 'Mode 2 — Full social post',
    description:
      'Generates the ad image AND a complete caption, headline, CTA, and hashtags — ready to publish. Costs more credits but saves you the writing.',
    paid: true,
  },
  // 8e. Event Studio (1 step)
  {
    element: '#tour-fp-events',
    path: WORKSPACE_NAV_HREFS.festivePost,
    side: 'right',
    title: 'Auto-celebrate festivals',
    description:
      'Pick from pre-loaded festivals or add your own. Each selected event becomes a generated post, scheduled for that day.',
    paid: true,
  },
  // 8f. Post Scheduler (1 step)
  {
    element: '#tour-ps-form',
    path: '/post-scheduler',
    side: 'bottom',
    title: 'Manual posts too',
    description:
      'Beyond AI generation, you can compose a post from scratch right here — image, caption, platform, date, time. Everything we publish for you flows through this page.',
    paid: true,
  },
  // 8g. Scheduled Posts (1 step)
  {
    element: '#tour-pq-list',
    path: WORKSPACE_NAV_HREFS.postQueue,
    side: 'top',
    title: 'Your scheduled posts',
    description:
      "Everything you've scheduled lives here. Edit, reschedule, or cancel before it publishes.",
    paid: true,
  },
  // 8h. Media Library (1 step)
  {
    element: '#tour-gl-grid',
    path: '/media-library',
    side: 'top',
    title: 'Your media library',
    description:
      "Every post you've ever generated — scheduled or not — lives here. Reuse, download, or send any of them back to the scheduler anytime.",
  },
  // 8i. Connected Accounts (1 step, FREE)
  {
    element: '#tour-lp-connect',
    path: WORKSPACE_NAV_HREFS.linkedProfiles,
    side: 'bottom',
    title: 'Connect your accounts (free)',
    description:
      'Link Facebook, Instagram, and LinkedIn here. This is free and required before anything we generate can actually publish.',
  },
  // 8j. Campaigns (2 steps)
  {
    element: '#tour-campaign-builder',
    path: WORKSPACE_NAV_HREFS.createCampaign,
    side: 'bottom',
    title: 'Plan a full campaign',
    description:
      'Start by generating a few campaign ideas around a goal like a product launch, brand story, or lifestyle spotlight.',
    paid: true,
  },
  {
    element: '#tour-campaign-confirm',
    path: WORKSPACE_NAV_HREFS.createCampaign,
    side: 'left',
    title: 'Confirm and generate drafts',
    description:
      'Choose platforms, review credits, then generate the full set of campaign drafts for the selected days.',
    paid: true,
  },
  // 8k. Top Nav back on /home (1 step)
  {
    element: '#tour-topnav-wrapper',
    path: '/home',
    side: 'bottom',
    title: 'Quick jumps up top',
    description:
      'From any page: Home for the dashboard, AI Engine to tune prompts, Brand DNA to edit everything you set up in onboarding and Business Data, Contact Us for support — and the sign-out button on the right.',
  },
  // 8l. Final CTA
  FINAL_STEP,
];

export const TOUR_STEPS: Record<TourId, TourStep[]> = {
  onboarding: ONBOARDING_STEPS,
  'brand-memory': BRAND_MEMORY_STEPS,
  platform: PLATFORM_STEPS,
};

export function getPageTourRequest(pathname: string): TourRequest | null {
  if (pathname === '/onBoarding') {
    return { tour: 'onboarding', startIndex: 0 };
  }

  if (pathname === '/brand-memory') {
    return { tour: 'brand-memory', startIndex: 0 };
  }

  const startIndex = PLATFORM_STEPS.findIndex(
    (step) => step.path === pathname && !step.finalCta
  );

  if (startIndex === -1) {
    return null;
  }

  let endIndex = startIndex;
  while (endIndex + 1 < PLATFORM_STEPS.length) {
    const next = PLATFORM_STEPS[endIndex + 1];
    if (next.path !== pathname || next.finalCta) break;
    endIndex += 1;
  }

  return {
    tour: 'platform',
    startIndex,
    endIndex,
  };
}
