/** Sidebar labels and matching routes — single source of truth for workspace navigation. */

export const WORKSPACE_NAV_HREFS = {
  quickCreate: '/create-post',
  productAdvert: '/product-posts',
  videoGeneration: '/videos',
  festivePost: '/occasion-posts',
  createCampaign: '/campaigns',
  carouselCreate: '/carousel-posts',
  schedulePost: '/schedule-post',
  postQueue: '/upcoming-posts',
  contentPlan: '/ai-plan',
  gallery: '/media-library',
  linkedProfiles: '/connected-accounts',
  analytics: '/analytics',
} as const;

/** Old app paths → current workspace routes (bookmarks, emails, stored `spendedOn`). */
export const WORKSPACE_LEGACY_PATH_REDIRECTS: Record<string, string> = {
  '/instant-generation': WORKSPACE_NAV_HREFS.quickCreate,
  '/content-studio': WORKSPACE_NAV_HREFS.quickCreate,
  '/product-advert': WORKSPACE_NAV_HREFS.productAdvert,
  '/product-ads': WORKSPACE_NAV_HREFS.productAdvert,
  '/video-generator': WORKSPACE_NAV_HREFS.videoGeneration,
  '/festive-post': WORKSPACE_NAV_HREFS.festivePost,
  '/event-studio': WORKSPACE_NAV_HREFS.festivePost,
  '/create-campaign': WORKSPACE_NAV_HREFS.createCampaign,
  '/create/carousel-generation': WORKSPACE_NAV_HREFS.carouselCreate,
  '/carousel-generation': WORKSPACE_NAV_HREFS.carouselCreate,
  '/post-scheduler': WORKSPACE_NAV_HREFS.schedulePost,
  '/scheduled-post': WORKSPACE_NAV_HREFS.postQueue,
  '/scheduled-posts': WORKSPACE_NAV_HREFS.postQueue,
  '/content-plan': WORKSPACE_NAV_HREFS.contentPlan,
  '/content-calendar': WORKSPACE_NAV_HREFS.contentPlan,
  '/social-media-integration': WORKSPACE_NAV_HREFS.linkedProfiles,
  '/batch-generation': WORKSPACE_NAV_HREFS.quickCreate,
  '/ai-engine': '/autopilot',
  '/template-dna': '/brand-dna',
};

export function resolveWorkspacePath(pathname: string): string {
  const base = pathname.split('?')[0]?.split('#')[0] ?? pathname;
  for (const [legacy, next] of Object.entries(WORKSPACE_LEGACY_PATH_REDIRECTS)) {
    if (base === legacy || base.startsWith(`${legacy}/`)) {
      return base.replace(legacy, next);
    }
  }
  return base;
}

export type WorkspaceNavHref =
  (typeof WORKSPACE_NAV_HREFS)[keyof typeof WORKSPACE_NAV_HREFS];

export type WorkspaceNavItem = {
  name: string;
  href: WorkspaceNavHref;
  match: (pathname: string | null) => boolean;
};

export const WORKSPACE_NAV: WorkspaceNavItem[] = [
  {
    name: 'Create Post',
    href: WORKSPACE_NAV_HREFS.quickCreate,
    match: (pathname) =>
      !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.quickCreate),
  },
  {
    name: 'Product Posts',
    href: WORKSPACE_NAV_HREFS.productAdvert,
    match: (pathname) =>
      !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.productAdvert),
  },
  {
    name: 'Videos',
    href: WORKSPACE_NAV_HREFS.videoGeneration,
    match: (pathname) =>
      !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.videoGeneration),
  },
  {
    name: 'Occasion Posts',
    href: WORKSPACE_NAV_HREFS.festivePost,
    match: (pathname) =>
      !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.festivePost),
  },
  {
    name: 'Campaigns',
    href: WORKSPACE_NAV_HREFS.createCampaign,
    match: (pathname) =>
      !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.createCampaign),
  },
  {
    name: 'Carousel Posts',
    href: WORKSPACE_NAV_HREFS.carouselCreate,
    match: (pathname) =>
      !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.carouselCreate),
  },
  {
    name: 'Schedule a Post',
    href: WORKSPACE_NAV_HREFS.schedulePost,
    match: (pathname) =>
      !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.schedulePost),
  },
  {
    name: 'AI Plan',
  href: WORKSPACE_NAV_HREFS.contentPlan,
  match: (pathname) =>
    !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.contentPlan),
  },
  {
    name: 'Upcoming Posts',
    href: WORKSPACE_NAV_HREFS.postQueue,
    match: (pathname) =>
      !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.postQueue),
  },
  {
    name: 'Media Library',
    href: WORKSPACE_NAV_HREFS.gallery,
    match: (pathname) =>
      !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.gallery),
  },
  {
    name: 'Connected Accounts',
    href: WORKSPACE_NAV_HREFS.linkedProfiles,
    match: (pathname) =>
      !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.linkedProfiles),
  },
  {
    name: 'Analytics',
    href: WORKSPACE_NAV_HREFS.analytics,
    match: (pathname) =>
      !!pathname &&
      (pathname === WORKSPACE_NAV_HREFS.analytics ||
        pathname.startsWith(`${WORKSPACE_NAV_HREFS.analytics}/`)),
  },
];


export function workspacePageTitle(href: WorkspaceNavHref): string {
  const item =
    WORKSPACE_NAV.find((entry) => entry.href === href);
  return item?.name ?? href;
}
