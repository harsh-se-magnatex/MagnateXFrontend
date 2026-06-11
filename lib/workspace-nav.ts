/** Sidebar labels and matching routes — single source of truth for workspace navigation. */

export const WORKSPACE_NAV_HREFS = {
  quickCreate: '/instant-generation',
  bulkCreate: '/batch-generation',
  productAdvert: '/product-advert',
  festivePost: '/festive-post',
  createCampaign: '/create-campaign',
  schedulePost: '/post-scheduler',
  postQueue: '/scheduled-post',
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
    name: 'Quick Create',
    href: WORKSPACE_NAV_HREFS.quickCreate,
    match: (pathname) =>
      !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.quickCreate),
  },
  {
    name: 'Bulk Create',
    href: WORKSPACE_NAV_HREFS.bulkCreate,
    match: (pathname) =>
      !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.bulkCreate),
  },
  {
    name: 'Product Advert',
    href: WORKSPACE_NAV_HREFS.productAdvert,
    match: (pathname) =>
      !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.productAdvert),
  },
  {
    name: 'Festive Post',
    href: WORKSPACE_NAV_HREFS.festivePost,
    match: (pathname) =>
      !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.festivePost),
  },
  {
    name: 'Create Campaign',
    href: WORKSPACE_NAV_HREFS.createCampaign,
    match: (pathname) =>
      !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.createCampaign),
  },
  {
    name: 'Schedule Post',
    href: WORKSPACE_NAV_HREFS.schedulePost,
    match: (pathname) =>
      !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.schedulePost),
  },
  {
    name: 'Post Queue',
    href: WORKSPACE_NAV_HREFS.postQueue,
    match: (pathname) =>
      !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.postQueue),
  },
  {
    name: 'Gallery',
    href: WORKSPACE_NAV_HREFS.gallery,
    match: (pathname) =>
      !!pathname && pathname.startsWith(WORKSPACE_NAV_HREFS.gallery),
  },
  {
    name: 'Linked Profiles',
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
  const item = WORKSPACE_NAV.find((entry) => entry.href === href);
  return item?.name ?? href;
}
