'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { NonSubscribedFeatureBlock } from '@/components/shared/NonSubscribedFeatureBlock';
import { isPlanInactive } from '@/lib/plan-access';
import Link from 'next/link';
import {
  WORKSPACE_NAV_HREFS,
  workspacePageTitle,
} from '@/lib/workspace-nav';
import { useRouter } from 'next/navigation';
import { Check, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/show-error-toast';
import {
  disconnectSocialAccountApi,
  getSocialAccountsApi,
  selectFacebookPageApi,
  selectLinkedInPageApi,
} from '@/src/service/api/social.servce';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { workspacePageTitleClass } from '@/lib/workspace-ui';
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import { useTourDemo } from '@/src/stores/tourState';
import { AccountFrozenAlert } from '@/components/shared/AccountFrozenAlert';
import {
  countEnabledPlatforms,
  isMaxPlatformPlan,
  isPlatformSelectionComplete,
} from '@/lib/platform-selection';
import { buildBusinessSocialProfileUrl } from '@/lib/business-social-profile-url';

type PlatformId = 'instagram' | 'facebook' | 'linkedin';

type SocialAccountPage = {
  pageId: string;
  pageName: string;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

type SocialAccountRow = {
  platform: string;
  pageName?: string;
  expiresAt?: { _seconds: number; _nanoseconds?: number };
  availablePages?: SocialAccountPage[];
  selectedPageId?: string;
};



const ALL_PLATFORMS: {
  id: PlatformId;
  name: string;
  href: string;
  color: string;
  ringColor: string;
  icon: ReactNode;
}[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    href: `${BACKEND_URL}/auth/instagram`,
    color: 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
    ringColor: 'focus-visible:ring-[#DD2A7B]/40',
    icon: (
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    ),
  },
  {
    id: 'facebook',
    name: 'Facebook',
    href: `${BACKEND_URL}/auth/facebook`,
    color: 'bg-[#1877F2]',
    ringColor: 'focus-visible:ring-[#1877F2]/40',
    icon: (
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    ),
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    href: `${BACKEND_URL}/auth/linkedin`,
    color: 'bg-[#0A66C2]',
    ringColor: 'focus-visible:ring-[#0A66C2]/40',
    icon: (
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    ),
  },
];

type TroubleshootingTip = {
  text: string;
  href?: string;
  linkLabel?: string;
};

const PLATFORM_TROUBLESHOOTING: Record<
  PlatformId,
  { title: string; tips: TroubleshootingTip[] }
> = {
  facebook: {
    title: "Can't see your Facebook Page?",
    tips: [
      {
        text: 'Remove Sociogenie from your Facebook Business Integrations and submit a data deletion request from Facebook. Then try connecting again.',
        href: '/legal/facebook-data-deletion-instruction',
        linkLabel: 'Facebook data deletion steps',
      },
      {
        text: 'Make sure you have full admin access to the Facebook Page you want to connect.',
      },
      {
        text: 'If you just created the Facebook Page, wait a short while before connecting it to Sociogenie.',
      },
    ],
  },
  instagram: {
    title: "Can't see your Instagram business account?",
    tips: [
      {
        text: 'Remove Sociogenie from your Instagram / Meta Business Integrations and submit a data deletion request. Then try connecting again.',
        href: '/legal/instagram-data-deletion-instruction',
        linkLabel: 'Instagram data deletion steps',
      },
      {
        text: 'Make sure you have full access to the Instagram professional account you want to connect, and that it is linked to a Facebook Page when required.',
      },
      {
        text: 'If you just created or converted the Instagram account to a business/creator account, wait a short while before connecting it to Sociogenie.',
      },
    ],
  },
  linkedin: {
    title: "Can't see your LinkedIn organization Page?",
    tips: [
      {
        text: 'Remove Sociogenie from your LinkedIn authorized apps (Settings → Data privacy → Permitted services), then try connecting again.',
      },
      {
        text: 'Make sure you have admin access to the LinkedIn Company Page or organization you want to connect.',
      },
      {
        text: 'If you just created the LinkedIn organization Page, wait a short while before connecting it to Sociogenie.',
      },
    ],
  },
};

function isAccountConnected(
  accounts: SocialAccountRow[],
  platformId: PlatformId
): boolean {
  const acc = accounts.find((a) => a.platform === platformId);
  if (!acc?.expiresAt?._seconds) return false;
  return acc.expiresAt._seconds * 1000 > Date.now();
}

function getSelectedPageName(
  accounts: SocialAccountRow[],
  platformId: PlatformId
): string | null {
  const acc = accounts.find((a) => a.platform === platformId);
  if (platformId === 'instagram') {
    const name = acc?.pageName;
    return typeof name === 'string' && name.trim()
      ? name.trim()
      : null;
  }
  if (platformId !== 'facebook' && platformId !== 'linkedin') return null;
  const id = acc?.selectedPageId;
  const pages = acc?.availablePages;
  if (!id || !pages?.length) return null;
  const page = pages.find((p) => p.pageId === id);
  return page?.pageName ?? null;
}

function getAvailablePages(
  accounts: SocialAccountRow[],
  platformId: PlatformId
): SocialAccountPage[] {
  if (platformId !== 'facebook' && platformId !== 'linkedin') return [];
  const acc = accounts.find((a) => a.platform === platformId);
  return acc?.availablePages ?? [];
}

function getSelectedPageId(
  accounts: SocialAccountRow[],
  platformId: PlatformId
): string | null {
  if (platformId !== 'facebook' && platformId !== 'linkedin') return null;
  const acc = accounts.find((a) => a.platform === platformId);
  return acc?.selectedPageId ?? null;
}

function getAccountForPlatform(
  accounts: SocialAccountRow[],
  platformId: PlatformId
): SocialAccountRow | null {
  return accounts.find((a) => a.platform === platformId) ?? null;
}

function getSelectedProfileUrl(
  accounts: SocialAccountRow[],
  platformId: PlatformId
): string | null {
  const account = getAccountForPlatform(accounts, platformId);
  return buildBusinessSocialProfileUrl(platformId, account);
}

function getPageProfileUrl(
  platform: PageSelectablePlatform,
  page: SocialAccountPage | null | undefined
): string | null {
  if (!page) return null;
  return buildBusinessSocialProfileUrl(platform, {
    selectedPageId: page.pageId,
    pageName: page.pageName,
  });
}

type PageSelectablePlatform = 'facebook' | 'linkedin';

function TroubleshootingDialog({
  open,
  onOpenChange,
  platformId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platformId: PlatformId | null;
}) {
  const content = platformId ? PLATFORM_TROUBLESHOOTING[platformId] : null;
  if (!content) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>
            Follow these steps, then try connecting again.
          </DialogDescription>
        </DialogHeader>
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
          {content.tips.map((tip) => (
            <li key={tip.text} className="pl-1">
              <span>{tip.text}</span>
              {tip.href && tip.linkLabel ? (
                <>
                  {' '}
                  <Link
                    href={tip.href}
                    className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
                  >
                    {tip.linkLabel}
                  </Link>
                </>
              ) : null}
            </li>
          ))}
        </ol>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SelectPageModal({
  open,
  onOpenChange,
  platform,
  pages,
  initialSelectedPageId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: PageSelectablePlatform;
  pages: SocialAccountPage[];
  initialSelectedPageId: string | null;
  onSuccess: () => void;
}) {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(
    initialSelectedPageId
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedPageId(initialSelectedPageId);
    } else {
      setSubmitting(false);
    }
  }, [open, initialSelectedPageId]);

  const isFacebook = platform === 'facebook';
  const title = isFacebook ? 'Select Facebook Page' : 'Select LinkedIn Page';
  const description = isFacebook
    ? 'Select the Facebook page you want to use for your posts.'
    : 'Select the LinkedIn organization you want to use for your posts.';
  const placeholder = isFacebook
    ? 'Select a Facebook page'
    : 'Select a LinkedIn page';

  const selectedPage =
    selectedPageId == null
      ? null
      : (pages.find((p) => p.pageId === selectedPageId) ?? null);
  const selectedPageProfileUrl = getPageProfileUrl(platform, selectedPage);

  const handleConfirm = async () => {
    if (!selectedPage) return;
    try {
      setSubmitting(true);
      const res = isFacebook
        ? await selectFacebookPageApi(selectedPage.pageId)
        : await selectLinkedInPageApi(selectedPage.pageId);
      if (res?.success) {
        onOpenChange(false);
        onSuccess();
      }
    } catch (error: unknown) {
      showErrorToast(
        `Failed to select ${isFacebook ? 'Facebook' : 'LinkedIn'} page`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Select
          value={selectedPageId ?? ''}
          onValueChange={(value) => setSelectedPageId(value || null)}
        >
          <SelectTrigger className="w-full active:ring-0 active:ring-offset-0 active:border-0">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {pages.map((page) => (
              <SelectItem key={page.pageId} value={page.pageId}>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate">{page.pageName}</span>
                  {getPageProfileUrl(platform, page) ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {getPageProfileUrl(platform, page)}
                    </span>
                  ) : null}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedPage && selectedPageProfileUrl ? (
          <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-foreground">{selectedPage.pageName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {selectedPageProfileUrl}
              </p>
            </div>
            <a
              href={selectedPageProfileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Open
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            disabled={
              selectedPageId == null ||
              selectedPageId === initialSelectedPageId ||
              submitting
            }
            onClick={() => {
              if (!selectedPage) return;
              void handleConfirm();
            }}
          >
            {submitting
              ? 'Saving…'
              : `Confirm${selectedPage ? `: ${selectedPage.pageName}` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ConnectedPlatformsPage() {
  const router = useRouter();
  const { billing, loading: billingLoading } = useUserPlanCredits();
  const isTourDemo = useTourDemo();
  const [socialAccounts, setSocialAccounts] = useState<SocialAccountRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [pageModalPlatform, setPageModalPlatform] =
    useState<PageSelectablePlatform | null>(null);
  const [troubleshootingPlatform, setTroubleshootingPlatform] =
    useState<PlatformId | null>(null);

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const response = await getSocialAccountsApi();
      const rows = response?.data?.data;
      setSocialAccounts(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error(error);
      showErrorToast('Could not load connected platforms. Please try again later.');
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const activePlan = billing?.activePlan ?? 'non-subscribed';
  const maxPlatforms: number = activePlan !== 'non-subscribed' ? 3 : 0;

  /** Platforms the user explicitly selected during onboarding */
  const selectedPlatforms = useMemo(() => {
    const enabled = new Set(
      (['instagram', 'facebook', 'linkedin'] as const).filter(
        (id) => billing?.selected?.[id] === true
      )
    );
    return ALL_PLATFORMS.filter((p) => enabled.has(p.id));
  }, [billing?.selected]);

  const selectedCount = useMemo(
    () => countEnabledPlatforms(billing?.selected),
    [billing?.selected]
  );

  const connectedCount = useMemo(() => {
    return selectedPlatforms.filter((p) =>
      isAccountConnected(socialAccounts, p.id)
    ).length;
  }, [socialAccounts, selectedPlatforms]);

  /**
   * Layout matches plan slots (1 / 2 / 3) so we do not leave empty grid columns.
   * While billing is loading, default to the widest layout (three slots).
   */
  const platformLayoutTier = useMemo((): 1 | 2 | 3 => {
    if (
      !billingLoading &&
      activePlan !== 'non-subscribed' &&
      maxPlatforms >= 1
    ) {
      return Math.min(3, maxPlatforms) as 1 | 2 | 3;
    }
    return 3;
  }, [billingLoading, activePlan, maxPlatforms]);

  const platformListStyle = useMemo(() => {
    const tier3TwoSelected =
      platformLayoutTier === 3 &&
      selectedPlatforms.length === 2 &&
      hasLoadedOnce &&
      !billingLoading;

    switch (platformLayoutTier) {
      case 1:
        return {
          outer: 'mx-auto w-full max-w-xl',
          grid: 'grid grid-cols-1 gap-4',
        };
      case 2:
        return {
          outer: 'mx-auto w-full max-w-3xl',
          grid: 'grid grid-cols-1 gap-4 sm:grid-cols-2',
        };
      default:
        return {
          outer: cn(
            'mx-auto w-full',
            tier3TwoSelected ? 'max-w-4xl' : 'max-w-6xl'
          ),
          grid: cn(
            'grid grid-cols-1 gap-4 sm:grid-cols-2',
            tier3TwoSelected ? 'lg:grid-cols-2' : 'lg:grid-cols-3'
          ),
        };
    }
  }, [
    platformLayoutTier,
    selectedPlatforms.length,
    hasLoadedOnce,
    billingLoading,
  ]);

  /**
   * Show if the user hasn't finished selecting their platform slots
   * (i.e., fewer platforms selected than their plan allows).
   */
  const showSelectionIncompleteNotice =
    !billingLoading &&
    billing != null &&
    activePlan !== 'non-subscribed' &&
    !isPlatformSelectionComplete({ activePlan, selected: billing.selected });

  /**
   * Show if every allowed slot is already connected and they can't add more
   * without upgrading. Hide on legacy / 3-slot plans — there is no higher
   * platform tier to upgrade into.
   */
  const showPlanLimitNotice =
    !billingLoading &&
    !showSelectionIncompleteNotice &&
    activePlan !== 'non-subscribed' &&
    !isMaxPlatformPlan(activePlan) &&
    maxPlatforms > 0 &&
    connectedCount >= maxPlatforms;

  const [disconnectingPlatform, setDisconnectingPlatform] =
    useState<PlatformId | null>(null);

  const handleDisconnect = async (platform: PlatformId) => {
    if (disconnectingPlatform) return;
    setDisconnectingPlatform(platform);
    try {
      const response = await disconnectSocialAccountApi(platform);
      if (response.success) {
        await loadAccounts();
        toast.success(
          `${platform.charAt(0).toUpperCase() + platform.slice(1)} disconnected.`
        );
      }
    } catch (error) {
      console.error(error);
      showErrorToast('Could not disconnect. Please try again later.');
    } finally {
      setDisconnectingPlatform(null);
    }
  };

  if (billingLoading && !billing) {
    return <PageLoadingState message="Loading your account..." />;
  }

  if (
    !isTourDemo &&
    isPlanInactive(billing) &&
    billing?.isAccountFrozen !== true
  ) {
    return <NonSubscribedFeatureBlock />;
  }

  return (
    <div
      id="tour-lp-connect"
      className="w-full animate-in fade-in duration-500 pb-20"
    >
      <header className="mb-8">
        <h1 className={workspacePageTitleClass}>
          {workspacePageTitle(WORKSPACE_NAV_HREFS.linkedProfiles)}
        </h1>
        <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-2xl">
          Link your social accounts so Sociogenie can schedule and publish
          approved content automatically.
        </p>
      </header>

      <AccountFrozenAlert className="mb-6" />

      {/* ── Notices ───────────────────────────────────────── */}

      {showSelectionIncompleteNotice && (
        <div
          className="mb-6 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50/90 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-0.5 h-5 w-5 shrink-0 text-blue-600"
              aria-hidden
            />
            <p className="text-sm text-blue-900">
              Your{' '}
              <span className="font-semibold capitalize">{activePlan}</span>{' '}
              plan supports{' '}
              <span className="font-semibold">{maxPlatforms}</span> platform
              {maxPlatforms === 1 ? '' : 's'}, but you&apos;ve only selected{' '}
              <span className="font-semibold">{selectedCount}</span>. Complete
              your platform selection to unlock all your slots.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="shrink-0 self-start sm:self-auto"
            onClick={() => router.push('/autopilot')}
          >
            Select platforms
          </Button>
        </div>
      )}

      {showPlanLimitNotice && (
        <div
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50/90 px-5 py-4 text-sm text-amber-950"
          role="status"
        >
          Your current plan supports{' '}
          <span className="font-semibold tabular-nums">{maxPlatforms}</span>{' '}
          connected platform{maxPlatforms === 1 ? '' : 's'}. Upgrade to connect
          more.{' '}
          <Link
            href="/settings/billings"
            className="font-semibold underline underline-offset-2 hover:text-amber-950/80"
          >
            View Plans
          </Link>
        </div>
      )}

      {pageModalPlatform && (
        <SelectPageModal
          open={pageModalPlatform !== null}
          onOpenChange={(open) => {
            if (!open) setPageModalPlatform(null);
          }}
          platform={pageModalPlatform}
          pages={getAvailablePages(socialAccounts, pageModalPlatform)}
          initialSelectedPageId={getSelectedPageId(
            socialAccounts,
            pageModalPlatform
          )}
          onSuccess={() => {
            setPageModalPlatform(null);
            void loadAccounts();
            toast.success('Page selection saved.');
          }}
        />
      )}

      <TroubleshootingDialog
        open={troubleshootingPlatform !== null}
        onOpenChange={(open) => {
          if (!open) setTroubleshootingPlatform(null);
        }}
        platformId={troubleshootingPlatform}
      />

      {billing != null && (
        <div id="platform-list" className={platformListStyle.outer}>
          {billingLoading || !hasLoadedOnce ? (
            <PageLoadingState className="min-h-[40vh]" />
          ) : (
          <div className={platformListStyle.grid}>
              {selectedPlatforms.map((platform) => {
                  const connected = isAccountConnected(
                    socialAccounts,
                    platform.id
                  );
                  const selectedPageName = getSelectedPageName(
                    socialAccounts,
                    platform.id
                  );
                  const selectedProfileUrl = getSelectedProfileUrl(
                    socialAccounts,
                    platform.id
                  );
                  const isPageSelectable =
                    platform.id === 'facebook' || platform.id === 'linkedin';
                  const availablePages = isPageSelectable
                    ? getAvailablePages(socialAccounts, platform.id)
                    : [];
                  const selectedPageId = isPageSelectable
                    ? getSelectedPageId(socialAccounts, platform.id)
                    : null;
                  const needsPageSelection =
                    connected &&
                    isPageSelectable &&
                    availablePages.length > 0 &&
                    selectedPageId == null;
                  const showTroubleshooting =
                    connected && isPageSelectable && selectedPageId == null;
                  const n = selectedPlatforms.length;
                  const singleOffCenterTier2 =
                    platformLayoutTier === 2 && n === 1;
                  const singleOffCenterTier3 =
                    platformLayoutTier === 3 && n === 1;
                  const troubleshooting = PLATFORM_TROUBLESHOOTING[platform.id];

                  return (
                    <Card
                      key={platform.id}
                      className={cn(
                        'flex h-full flex-col border-border/60 py-0 shadow-sm transition-[box-shadow,ring-color] duration-200 hover:shadow-md hover:ring-border',
                        connected &&
                          'ring-1 ring-emerald-500/15 hover:ring-emerald-500/25',
                        singleOffCenterTier2 &&
                          'sm:col-span-2 sm:mx-auto sm:w-full sm:max-w-md',
                        singleOffCenterTier3 &&
                          'lg:col-span-3 sm:mx-auto sm:w-full sm:max-w-md lg:max-w-md'
                      )}
                    >
                      <CardHeader className="flex-1 gap-4 px-5 pb-4 pt-5">
                        <div className="flex gap-4">
                          <div
                            className={cn(
                              'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-white shadow-md ring-1 ring-black/5',
                              platform.color
                            )}
                          >
                            <svg
                              className="h-7 w-7"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden
                            >
                              {platform.icon}
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1 space-y-1 self-center">
                            <CardTitle className="text-base font-semibold text-foreground sm:text-lg">
                              {platform.name}
                            </CardTitle>
                            <CardDescription className="text-pretty leading-relaxed text-muted-foreground">
                              {connected
                                ? 'Scheduling and publishing are enabled for this channel.'
                                : 'Connect your account to allow automated posts from Sociogenie.'}
                            </CardDescription>
                            {connected && selectedPageName && (
                              <p className="text-sm font-medium text-foreground">
                                Selected:&nbsp;
                                {selectedProfileUrl ? (
                                  <a
                                    href={selectedProfileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
                                  >
                                    <span>{selectedPageName}</span>
                                    <ExternalLink
                                      className="h-3.5 w-3.5"
                                      aria-hidden
                                    />
                                  </a>
                                ) : (
                                  <span className="text-foreground">
                                    {selectedPageName}
                                  </span>
                                )}
                              </p>
                            )}
                            {needsPageSelection && (
                              <>
                                <p className="text-sm text-amber-700">
                                  No page selected yet. Pick one below to
                                  enable publishing.
                                </p>
                                <div className="pt-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-8"
                                    onClick={() =>
                                      setPageModalPlatform(
                                        platform.id as PageSelectablePlatform
                                      )
                                    }
                                  >
                                    Select {platform.name} page
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {showTroubleshooting ? (
                          <Button
                            type="button"
                            variant="link"
                            className="h-auto w-fit max-w-full justify-start px-0 py-0 text-left text-sm font-medium whitespace-normal text-primary"
                            onClick={() =>
                              setTroubleshootingPlatform(platform.id)
                            }
                          >
                            {troubleshooting.title}
                          </Button>
                        ) : null}
                      </CardHeader>
                      <CardFooter className="flex-col gap-2 border-t border-border/50 bg-muted/20 px-5 py-4 sm:flex-row sm:justify-end">
                        {connected ? (
                          <div className='w-full flex items-center justify-between'>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-2 text-xs font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/25">
                              <Check
                                className="h-3.5 w-3.5 text-emerald-400"
                                aria-hidden
                              />
                              Connected
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={disconnectingPlatform === platform.id}
                              aria-busy={disconnectingPlatform === platform.id}
                              className="w-full border-border text-foreground hover:bg-accent hover:text-foreground sm:w-auto sm:min-w-36"
                              onClick={() => void handleDisconnect(platform.id)}
                            >
                              {disconnectingPlatform === platform.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                              ) : null}
                              Remove connection
                            </Button>
                          </div>
                        ) : (
                          <Button
                            asChild
                            size="sm"
                            className={cn(
                              'h-9 w-full border-0 font-semibold text-white shadow-sm hover:opacity-95 sm:w-full',
                              platform.color,
                              platform.ringColor,
                              'focus-visible:ring-2 focus-visible:ring-offset-2'
                            )}
                          >
                            <a href={platform.href}>Connect {platform.name}</a>
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
          </div>
          )}
        </div>
      )}
    </div>
  );
}
