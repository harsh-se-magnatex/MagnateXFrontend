/** Sidebar labels and matching routes — single source of truth for workspace navigation. */

export const WORKSPACE_NAV_HREFS = {
  quickCreate: '/instant-generation',
  bulkCreate: '/batch-generation',
  productAdvert: '/product-advert',
  videoGeneration: '/video-generation',
  festivePost: '/festive-post',
  createCampaign: '/create-campaign',
  carouselCreate: '/create/carousel-generation',
  schedulePost: '/post-scheduler',
  postQueue: '/scheduled-post',
  contentPlan: '/content-plan',
  gallery: '/media-library',
  linkedProfiles: '/social-media-integration',
  analytics: '/analytics',
} as const;

export type WorkspaceNavHref =
  (typeof WORKSPACE_NAV_HREFS)[keyof typeof WORKSPACE_NAV_HREFS];

export type WorkspaceNavItem = {
  name: string;
  href: WorkspaceNavHref;
  match: (pathname: string | null) => boolean;
};

export const WORKSPACE_NAV: WorkspaceNavItem[] = [
  {
    name: 'Content Studio',
    href: WORKSPACE_NAV_HREFS.quickCreate,
    match: (pathname) =>
      !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.quickCreate),
  },
  {
    name: 'Bulk Creator',
    href: WORKSPACE_NAV_HREFS.bulkCreate,
    match: (pathname) =>
      !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.bulkCreate),
  },
  {
    name: 'Product Ads',
    href: WORKSPACE_NAV_HREFS.productAdvert,
    match: (pathname) =>
      !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.productAdvert),
  },
  {
    name: 'Video Generator',
    href: WORKSPACE_NAV_HREFS.videoGeneration,
    match: (pathname) =>
      !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.videoGeneration),
  },
  {
    name: 'Holiday & Festival Posts',
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
    name: 'Post Scheduler',
    href: WORKSPACE_NAV_HREFS.schedulePost,
    match: (pathname) =>
      !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.schedulePost),
  },
  {
    name: 'Scheduled Posts',
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

/** Auto-mode only — appended in the sidebar from `UserPlanCreditsProvider`. */
export const CONTENT_PLAN_NAV_ITEM: WorkspaceNavItem = {
  name: 'Content Calendar',
  href: WORKSPACE_NAV_HREFS.contentPlan,
  match: (pathname) =>
    !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.contentPlan),
};

export function workspacePageTitle(href: WorkspaceNavHref): string {
  const item =
    WORKSPACE_NAV.find((entry) => entry.href === href) ??
    (href === WORKSPACE_NAV_HREFS.contentPlan ? CONTENT_PLAN_NAV_ITEM : null);
  return item?.name ?? href;
}
