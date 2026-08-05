'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { useAuth } from '@/src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useCallback } from 'react';
import {
  DollarSign,
  BriefcaseBusiness,
  FacebookIcon,
  Instagram,
  Linkedin,
  Check,
  ChevronDown,
  Share2,
  Bot,
  CheckCircle,
  Lock,
  Sparkles,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  WORKSPACE_NAV_HREFS,
  workspacePageTitle,
} from '@/lib/workspace-nav';
import {
  workspacePageDescriptionClass,
  workspacePageTitleClass,
  workspaceSectionCardClass,
} from '@/lib/workspace-ui';
import { showErrorToast } from '@/lib/show-error-toast';
import {
  ImagePreviewButton,
  ImagePreviewOverlay,
  useImagePreview,
} from '@/components/image-preview';
import {
  generateExamplePostsApi,
  getUserAIenginePageContext,
  selectSocialPlatformApi,
  updateAiEngineSetup,
  type ExamplePostItem,
  type ExamplePostsMeta,
} from '@/features/user/api';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  selectFacebookPageApi,
  selectLinkedInPageApi,
} from '@/src/service/api/social.servce';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

const PLAN_MAX_SOCIAL: Record<string, number> = {
  'prime-AI': 1,
  'prime-Studio': 1,
  'elite-AI': 2,
  'elite-Studio': 2,
  'legacy-AI': 3,
  'legacy-Studio': 3,
};

type SelectedPlatforms = {
  facebook: boolean;
  instagram: boolean;
  linkedin: boolean;
};

type UserData = {
  plan:
    | 'non-subscribed'
    | 'legacy-AI'
    | 'legacy-Studio'
    | 'elite-AI'
    | 'elite-Studio'
    | 'prime-AI'
    | 'prime-Studio';
  onBoarded: boolean;
  socialAccounts: number;
  availableFBPages: {
    pageId: string;
    pageName: string;
    pageAccessToken: string;
  }[];
  selectedPageId: string | null;
  availableLinkedInPages: {
    pageId: string;
    pageName: string;
  }[];
  selectedLinkedInPageId: string | null;
  facebookConnected?: boolean;
  instagramConnected?: boolean;
  linkedinConnected?: boolean;
  instagramUserId?: string | null;
  selected: SelectedPlatforms;
  selectedPlatformsLocked?: boolean;
  campaignSeedPendingPlatformConfirm?: boolean;
  aiEngineSetup?: {
    automationDone?: boolean;
    businessDone?: boolean;
  };
  examplePostsMeta?: ExamplePostsMeta;
  examplePosts?: ExamplePostItem[];
};

type StepId =
  | 'plan'
  | 'business'
  | 'selectSocial'
  | 'automation'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'ready';

type StepMeta = { id: StepId; label: string; icon: React.ElementType };

/** Connect steps; user may open them without finishing each link. */
const CONNECT_STEP_IDS = new Set<StepId>(['facebook', 'instagram', 'linkedin']);

function isSubscribedPlan(plan: string | undefined | null): boolean {
  return typeof plan === 'string' && plan.length > 0 && plan !== 'non-subscribed';
}

function buildStepMeta(selected: SelectedPlatforms): StepMeta[] {
  const steps: StepMeta[] = [
    { id: 'plan', label: 'Plan', icon: DollarSign },
    { id: 'business', label: 'Business', icon: BriefcaseBusiness },
    { id: 'selectSocial', label: 'Select platforms', icon: Share2 },
    { id: 'automation', label: 'Automation', icon: Bot },
  ];

  if (selected.facebook)
    steps.push({ id: 'facebook', label: 'Facebook', icon: FacebookIcon });
  if (selected.instagram)
    steps.push({ id: 'instagram', label: 'Instagram', icon: Instagram });
  if (selected.linkedin)
    steps.push({ id: 'linkedin', label: 'LinkedIn', icon: Linkedin });

  steps.push({ id: 'ready', label: 'Ready', icon: CheckCircle });
  return steps;
}

function isStepComplete(
  stepId: StepId,
  data: UserData,
  skipped: Set<StepId>
): boolean {
  switch (stepId) {
    case 'plan':
      return isSubscribedPlan(data.plan);
    case 'business':
      if (skipped.has('business')) return true;
      return data.onBoarded === true;
    case 'selectSocial': {
      const count = [
        data.selected.facebook,
        data.selected.instagram,
        data.selected.linkedin,
      ].filter(Boolean).length;
      return count > 0;
    }
    case 'automation':
      return skipped.has('automation');
    case 'facebook':
      return (
        (data.facebookConnected ?? data.availableFBPages.length > 0) &&
        data.selectedPageId != null
      );
    case 'instagram':
      return data.instagramConnected === true;
    case 'linkedin':
      return (
        (data.linkedinConnected ?? data.availableLinkedInPages.length > 0) &&
        data.selectedLinkedInPageId != null
      );
    case 'ready':
      return false;
    default:
      return false;
  }
}

function stepStatusLabel(
  stepId: StepId,
  data: UserData,
  skipped: Set<StepId>,
  done: boolean
): string {
  if (stepId === 'ready') {
    return done ? "You're set" : 'Almost there';
  }
  if (done) {
    if (stepId === 'business' && skipped.has('business') && !data.onBoarded) {
      return 'Done';
    }
    if (stepId === 'automation' && skipped.has('automation')) {
      return 'Done';
    }
    if (stepId === 'plan') return 'Active plan';
    if (stepId === 'business') return 'Profile ready';
    if (stepId === 'selectSocial') return 'Platforms selected';
    if (CONNECT_STEP_IDS.has(stepId)) return 'Connected';
    return 'Done';
  }
  switch (stepId) {
    case 'plan':
      return 'Subscribe to continue';
    case 'business':
      return 'Add brand details';
    case 'selectSocial':
      return 'Choose platforms';
    case 'automation':
      return 'Set preferences';
    case 'facebook':
    case 'instagram':
    case 'linkedin':
      return 'Connect account';
    default:
      return 'Action needed';
  }
}

function SelectFacebookPageModal({
  open,
  onOpenChange,
  data,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: UserData['availableFBPages'];
  onSuccess: () => void;
}) {
  const [selectedFacebookPage, setSelectedFacebookPage] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    if (!open) setSelectedFacebookPage(null);
  }, [open]);

  const selectedPage =
    selectedFacebookPage == null
      ? null
      : (data.find((p) => p.pageId === selectedFacebookPage) ?? null);

  const handleSelectFacebookPage = async () => {
    if (!selectedPage) return;
    try {
      const res = await selectFacebookPageApi(selectedPage.pageId);
      if (res.success) {
        onOpenChange(false);
        onSuccess();
      }
    } catch {
      showErrorToast('Failed to select Facebook page');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Facebook Page</DialogTitle>
          <DialogDescription>
            Choose the Facebook page to use for your posts.
          </DialogDescription>
        </DialogHeader>
        <Select
          value={selectedFacebookPage ?? ''}
          onValueChange={(value) => setSelectedFacebookPage(value || null)}
        >
          <SelectTrigger className="w-full active:ring-0 active:ring-offset-0 active:border-0">
            <SelectValue placeholder="Select a Facebook page" />
          </SelectTrigger>
          <SelectContent>
            {data.map((page) => (
              <SelectItem key={page.pageId} value={page.pageId}>
                {page.pageName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={selectedFacebookPage == null}
            onClick={() => {
              if (!selectedPage) return;
              void handleSelectFacebookPage();
            }}
          >
            Confirm{selectedPage ? `: ${selectedPage.pageName}` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SelectLinkedInPageModal({
  open,
  onOpenChange,
  data,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: UserData['availableLinkedInPages'];
  onSuccess: () => void;
}) {
  const [selectedLinkedInPage, setSelectedLinkedInPage] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    if (!open) setSelectedLinkedInPage(null);
  }, [open]);

  const selectedPage =
    selectedLinkedInPage == null
      ? null
      : (data.find((p) => p.pageId === selectedLinkedInPage) ?? null);

  const handleSelectLinkedInPage = async () => {
    if (!selectedPage) return;
    try {
      const res = await selectLinkedInPageApi(selectedPage.pageId);
      if (res.success) {
        onOpenChange(false);
        onSuccess();
      }
    } catch {
      showErrorToast('Failed to select LinkedIn page');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select LinkedIn Page</DialogTitle>
          <DialogDescription>
            Choose the LinkedIn organization to use for your posts.
          </DialogDescription>
        </DialogHeader>
        <Select
          value={selectedLinkedInPage ?? ''}
          onValueChange={(value) => setSelectedLinkedInPage(value || null)}
        >
          <SelectTrigger className="w-full active:ring-0 active:ring-offset-0 active:border-0">
            <SelectValue placeholder="Select a LinkedIn page" />
          </SelectTrigger>
          <SelectContent>
            {data.map((page) => (
              <SelectItem key={page.pageId} value={page.pageId}>
                {page.pageName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={selectedLinkedInPage == null}
            onClick={() => {
              if (!selectedPage) return;
              void handleSelectLinkedInPage();
            }}
          >
            Confirm{selectedPage ? `: ${selectedPage.pageName}` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const PLATFORM_OPTIONS: {
  key: keyof SelectedPlatforms;
  label: string;
  icon: React.ElementType;
  gradient: string;
}[] = [
  {
    key: 'facebook',
    label: 'Facebook',
    icon: FacebookIcon,
    gradient: 'from-blue-500 to-cyan-400',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    icon: Instagram,
    gradient: 'from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    icon: Linkedin,
    gradient: 'from-[#0A66C2] to-[#004182]',
  },
];

export default function AIEnginePage() {
  const { user, loading } = useAuth();
  const [data, setData] = React.useState<UserData>({
    plan: 'non-subscribed',
    onBoarded: false,
    socialAccounts: 0,
    availableFBPages: [],
    selectedPageId: null,
    availableLinkedInPages: [],
    selectedLinkedInPageId: null,
    facebookConnected: false,
    instagramConnected: false,
    linkedinConnected: false,
    instagramUserId: null,
    selected: { facebook: false, instagram: false, linkedin: false },
    selectedPlatformsLocked: false,
    campaignSeedPendingPlatformConfirm: false,
  });
  const [dataLoading, setDataLoading] = React.useState(true);
  const [openStepId, setOpenStepId] = React.useState<StepId | null>(null);
  const [selectFacebookPageModalOpen, setSelectFacebookPageModalOpen] =
    React.useState(false);
  const [selectLinkedInPageModalOpen, setSelectLinkedInPageModalOpen] =
    React.useState(false);
  const [skipped, setSkipped] = React.useState<Set<StepId>>(new Set());
  const [localSelected, setLocalSelected] = React.useState<SelectedPlatforms>({
    facebook: false,
    instagram: false,
    linkedin: false,
  });
  const [savingSelection, setSavingSelection] = React.useState(false);
  const [confirmSelectionOpen, setConfirmSelectionOpen] = React.useState(false);
  const [stepPositionInitialized, setStepPositionInitialized] =
    React.useState(false);
  const [examplePosts, setExamplePosts] = React.useState<ExamplePostItem[]>(
    []
  );
  const [examplePostsMeta, setExamplePostsMeta] =
    React.useState<ExamplePostsMeta | null>(null);
  const [exampleGenerating, setExampleGenerating] = React.useState(false);
  const [examplesOpen, setExamplesOpen] = React.useState(true);
  const imagePreview = useImagePreview();
  const router = useRouter();

  const getDetails = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setDataLoading(true);
      const res = await getUserAIenginePageContext();
      const raw = res.data as UserData;
      const selected = raw.selected ?? {
        facebook: false,
        instagram: false,
        linkedin: false,
      };
      const aiEngineSetup = {
        automationDone: raw.aiEngineSetup?.automationDone === true,
        businessDone: raw.aiEngineSetup?.businessDone === true,
      };
      const nextExampleMeta = raw.examplePostsMeta ?? null;
      const nextExamplePosts = Array.isArray(raw.examplePosts)
        ? raw.examplePosts
        : [];
      setExamplePostsMeta(nextExampleMeta);
      setExamplePosts(nextExamplePosts);
      setData({
        socialAccounts: raw.socialAccounts,
        onBoarded: raw.onBoarded,
        plan: isSubscribedPlan(raw.plan) ? raw.plan : 'non-subscribed',
        availableFBPages: raw.availableFBPages ?? [],
        selectedPageId: raw.selectedPageId,
        availableLinkedInPages: raw.availableLinkedInPages ?? [],
        selectedLinkedInPageId: raw.selectedLinkedInPageId ?? null,
        facebookConnected:
          raw.facebookConnected ?? raw.availableFBPages?.length > 0,
        instagramConnected: raw.instagramConnected ?? false,
        linkedinConnected:
          raw.linkedinConnected ?? raw.availableLinkedInPages?.length > 0,
        instagramUserId: raw.instagramUserId ?? null,
        selected,
        selectedPlatformsLocked: raw.selectedPlatformsLocked === true,
        campaignSeedPendingPlatformConfirm:
          raw.campaignSeedPendingPlatformConfirm === true,
        aiEngineSetup,
        examplePostsMeta: nextExampleMeta ?? undefined,
        examplePosts: nextExamplePosts,
      });
      setLocalSelected(selected);
      setSkipped((prev) => {
        let next: Set<StepId> | null = null;
        const ensure = (id: StepId) => {
          if (prev.has(id) || (next && next.has(id))) return;
          if (!next) next = new Set(prev);
          next.add(id);
        };
        if (aiEngineSetup.automationDone) ensure('automation');
        if (aiEngineSetup.businessDone) ensure('business');
        return next ?? prev;
      });
    } catch {
      showErrorToast('Failed to fetch AI Engine Details');
    } finally {
      if (!opts?.silent) setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
    void getDetails();
  }, [loading, user, router, getDetails]);

  const stepMeta = useMemo(
    () => buildStepMeta(data.selected),
    [data.selected]
  );

  const stepCompletions = useMemo(() => {
    return stepMeta.map((s) => isStepComplete(s.id, data, skipped));
  }, [stepMeta, data, skipped]);

  const firstStrictIncompleteIdx = useMemo(() => {
    for (let i = 0; i < stepMeta.length - 1; i++) {
      if (!stepCompletions[i]) return i;
    }
    return stepMeta.length - 1;
  }, [stepMeta, stepCompletions]);

  const firstBlockingIncompleteIdx = useMemo(() => {
    for (let i = 0; i < stepMeta.length - 1; i++) {
      if (stepCompletions[i]) continue;
      if (CONNECT_STEP_IDS.has(stepMeta[i].id)) continue;
      return i;
    }
    return stepMeta.length - 1;
  }, [stepMeta, stepCompletions]);

  const completedCount = useMemo(() => {
    const totalCheckable = stepMeta.length - 1;
    if (totalCheckable <= 0) return 0;
    return stepCompletions.slice(0, totalCheckable).filter(Boolean).length;
  }, [stepMeta, stepCompletions]);

  const totalCheckable = Math.max(0, stepMeta.length - 1);
  const progressPct =
    totalCheckable <= 0
      ? 0
      : Math.round((completedCount / totalCheckable) * 100);

  const allSetupDone =
    totalCheckable > 0 && completedCount === totalCheckable;

  useEffect(() => {
    if (dataLoading) return;
    if (!stepPositionInitialized) {
      const id = stepMeta[firstStrictIncompleteIdx]?.id ?? null;
      setOpenStepId(id);
      setStepPositionInitialized(true);
      return;
    }
    setOpenStepId((prev) => {
      if (prev != null) {
        const prevIdx = stepMeta.findIndex((s) => s.id === prev);
        const prevDone =
          prevIdx >= 0 &&
          (stepMeta[prevIdx].id === 'ready'
            ? allSetupDone
            : stepCompletions[prevIdx] === true);
        if (prevDone) {
          return stepMeta[firstStrictIncompleteIdx]?.id ?? null;
        }
      }
      if (prev == null) return stepMeta[firstBlockingIncompleteIdx]?.id ?? null;
      const prevIdx = stepMeta.findIndex((s) => s.id === prev);
      if (prevIdx < 0) {
        return stepMeta[firstBlockingIncompleteIdx]?.id ?? null;
      }
      if (prevIdx > firstBlockingIncompleteIdx) {
        return stepMeta[firstBlockingIncompleteIdx]?.id ?? null;
      }
      return prev;
    });
  }, [
    dataLoading,
    firstStrictIncompleteIdx,
    firstBlockingIncompleteIdx,
    stepPositionInitialized,
    stepMeta,
    stepCompletions,
    allSetupDone,
  ]);

  useEffect(() => {
    const onFocus = () => {
      if (!user) return;
      void getDetails({ silent: true });
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, getDetails]);

  useEffect(() => {
    if (examplePostsMeta?.status !== 'running') return;
    const id = window.setInterval(() => {
      void getDetails({ silent: true });
    }, 5000);
    return () => window.clearInterval(id);
  }, [examplePostsMeta?.status, getDetails]);

  // Auto-open when generation starts or posts arrive.
  useEffect(() => {
    if (
      examplePostsMeta?.status === 'running' ||
      exampleGenerating ||
      examplePosts.length > 0
    ) {
      setExamplesOpen(true);
    }
  }, [
    examplePostsMeta?.status,
    exampleGenerating,
    examplePosts.length,
  ]);

  const handleGenerateExamples = async () => {
    if (!data.onBoarded || examplePostsMeta?.used || exampleGenerating) return;
    try {
      setExampleGenerating(true);
      const res = await generateExamplePostsApi();
      const payload = res.data;
      setExamplePostsMeta({
        status: 'running',
        used: true,
        expectedCount: payload.expectedCount,
        completedCount: 0,
        platforms: payload.platforms,
        postsPerPlatform: payload.postsPerPlatform,
      });
      void getDetails({ silent: true });
    } catch (err: unknown) {
      showErrorToast(
        err instanceof Error && err.message
          ? err.message
          : 'Failed to start example generation'
      );
    } finally {
      setExampleGenerating(false);
    }
  };

  const markAutomationDone = () => {
    setSkipped((prev) => new Set(prev).add('automation'));
    setData((prev) => ({
      ...prev,
      aiEngineSetup: {
        ...prev.aiEngineSetup,
        automationDone: true,
        businessDone: prev.aiEngineSetup?.businessDone === true,
      },
    }));
    void updateAiEngineSetup({ automationDone: true }).catch(() => {
      showErrorToast('Could not save automation step');
    });
  };

  const markBusinessDone = () => {
    setSkipped((prev) => new Set(prev).add('business'));
    setData((prev) => ({
      ...prev,
      aiEngineSetup: {
        ...prev.aiEngineSetup,
        businessDone: true,
        automationDone: prev.aiEngineSetup?.automationDone === true,
      },
    }));
    void updateAiEngineSetup({ businessDone: true }).catch(() => {
      showErrorToast('Could not save business step');
    });
  };

  const maxAllowed = PLAN_MAX_SOCIAL[data.plan] ?? 0;
  const localSelectedCount = [
    localSelected.facebook,
    localSelected.instagram,
    localSelected.linkedin,
  ].filter(Boolean).length;

  const selectionUnchanged = useMemo(
    () =>
      localSelected.facebook === data.selected.facebook &&
      localSelected.instagram === data.selected.instagram &&
      localSelected.linkedin === data.selected.linkedin,
    [localSelected, data.selected]
  );

  const platformsLocked =
    data.selectedPlatformsLocked === true &&
    data.campaignSeedPendingPlatformConfirm !== true;

  const canSaveSelection =
    maxAllowed > 0 &&
    localSelectedCount >= 1 &&
    localSelectedCount <= maxAllowed &&
    !selectionUnchanged &&
    !platformsLocked;

  const togglePlatform = (key: keyof SelectedPlatforms) => {
    if (platformsLocked) return;
    setLocalSelected((prev) => {
      const next = { ...prev };
      if (prev[key]) {
        next[key] = false;
        return next;
      }
      const currentCount = [
        prev.facebook,
        prev.instagram,
        prev.linkedin,
      ].filter(Boolean).length;
      if (currentCount >= maxAllowed) return prev;
      next[key] = true;
      return next;
    });
  };

  const performSaveSelection = async () => {
    try {
      setSavingSelection(true);
      await selectSocialPlatformApi(localSelected);
      setConfirmSelectionOpen(false);
      await getDetails({ silent: true });
    } catch (err: unknown) {
      const status =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { status?: number; data?: { message?: string } } })
              .response?.status
          : undefined;
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      if (status === 409) {
        showErrorToast(
          message || 'Platforms are locked for this billing period.'
        );
        await getDetails({ silent: true });
      } else {
        showErrorToast(message || 'Failed to save platform selection');
      }
    } finally {
      setSavingSelection(false);
    }
  };

  const facebookHref = `${BACKEND_URL}/auth/facebook`;
  const instagramHref = `${BACKEND_URL}/auth/instagram`;
  const linkedinHref = `${BACKEND_URL}/auth/linkedin`;

  const openStep = (index: number) => {
    if (index < 0 || index >= stepMeta.length) return;
    if (index > firstBlockingIncompleteIdx) return;
    const id = stepMeta[index].id;
    const done =
      id === 'ready' ? allSetupDone : stepCompletions[index] === true;
    if (done) return;
    setOpenStepId((prev) => (prev === id ? null : id));
  };

  const renderDoneRowCta = (stepId: StepId) => {
    switch (stepId) {
      case 'plan':
        return (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => router.push('/settings/billings')}
          >
            Open billing
          </Button>
        );
      case 'business':
        return (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => router.push('/template-dna')}
          >
            {data.onBoarded ? 'Review brand profile' : 'Add brand details'}
          </Button>
        );
      case 'selectSocial':
        return (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            disabled={
              !canSaveSelection || savingSelection || platformsLocked
            }
            onClick={() => {
              if (platformsLocked) return;
              setConfirmSelectionOpen(true);
            }}
          >
            {platformsLocked ? 'Selection locked' : 'Save selection'}
          </Button>
        );
      case 'automation':
        return (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => router.push('/settings/automation')}
          >
            Set preferences
          </Button>
        );
      case 'facebook':
      case 'instagram':
      case 'linkedin':
        return (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => router.push(WORKSPACE_NAV_HREFS.linkedProfiles)}
          >
            {workspacePageTitle(WORKSPACE_NAV_HREFS.linkedProfiles)}
          </Button>
        );
      case 'ready':
        return (
          <Button
            size="sm"
            className="shrink-0"
            disabled={!allSetupDone}
            onClick={() => router.push('/home')}
          >
            Go to home
          </Button>
        );
      default:
        return null;
    }
  };

  if (loading) return <PageLoadingState />;
  if (!user) return null;
  if (dataLoading) return <PageLoadingState />;

  return (
    <div className="mx-auto max-w-2xl page-enter pb-20">
      <header className="mb-8">
        <h1 className={workspacePageTitleClass}>AI Engine</h1>
        <p className={workspacePageDescriptionClass}>
          Finish these steps to turn on AI posting.
        </p>
      </header>

      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Setup progress
          </span>
          <span className="text-xs font-semibold text-foreground tabular-nums">
            {completedCount} of {totalCheckable} complete
            {progressPct > 0 ? ` · ${progressPct}%` : ''}
          </span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      {data.onBoarded && (
        <div
          className={cn(workspaceSectionCardClass, 'mb-6 divide-y divide-border p-0')}
        >
          <div
            className={cn(
              'flex w-full items-center gap-3 px-5 py-4',
              examplesOpen && 'bg-muted/30'
            )}
          >
            <button
              type="button"
              onClick={() => setExamplesOpen((open) => !open)}
              className="flex w-full min-w-0 items-center gap-3 text-left transition-colors hover:opacity-90"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground"
                aria-hidden
              >
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">
                  Free example posts
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {examplePostsMeta?.status === 'running' || exampleGenerating
                    ? 'Generating…'
                    : examplePosts.length > 0
                      ? `${examplePosts.length} example${examplePosts.length === 1 ? '' : 's'} ready`
                      : examplePostsMeta?.used ||
                          examplePostsMeta?.status === 'completed'
                        ? 'One-time examples used'
                        : 'One free preview — no credits, not scheduled'}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                  examplesOpen && 'rotate-180'
                )}
                aria-hidden
              />
            </button>
          </div>

          {examplesOpen && (
            <div className="space-y-4 border-t border-border/60 bg-background/50 px-5 pb-5 pt-4">
              <p className="text-sm text-muted-foreground">
                See how the AI Engine writes for your brand — one post each for
                Facebook, Instagram, and LinkedIn (with captions). One-time
                only, no credits, and nothing gets scheduled.
              </p>

              {examplePostsMeta?.status === 'running' || exampleGenerating ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating examples
                  {examplePostsMeta?.expectedCount
                    ? ` · ${examplePosts.length} of ${examplePostsMeta.expectedCount}`
                    : ''}
                  …
                </div>
              ) : examplePostsMeta?.used ||
                examplePostsMeta?.status === 'completed' ? (
                <p className="text-sm text-muted-foreground">
                  {examplePosts.length > 0
                    ? 'Your free examples are ready. These were never scheduled.'
                    : 'Free examples already used.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {examplePostsMeta?.status === 'failed' && (
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      The last attempt failed before any posts were saved. You
                      can try again.
                    </p>
                  )}
                  <Button
                    type="button"
                    onClick={() => void handleGenerateExamples()}
                    disabled={exampleGenerating}
                  >
                    Generate example posts
                  </Button>
                </div>
              )}

              {examplePosts.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {examplePosts.map((post) => (
                    <article
                      key={post.id}
                      className="overflow-hidden rounded-xl border border-border bg-background"
                    >
                      {post.imageUrl ? (
                        <div className="relative aspect-square w-full">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={post.imageUrl}
                            alt={`${post.platform} example`}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute bottom-2 right-2">
                            <ImagePreviewButton
                              variant="overlay-icon"
                              stopPropagation
                              onClick={() =>
                                imagePreview.open(
                                  post.imageUrl as string,
                                  `${post.platform} example`
                                )
                              }
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex aspect-square w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                          Image unavailable
                        </div>
                      )}
                      <div className="space-y-2 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {post.platform}
                        </p>
                        <p className="whitespace-pre-wrap text-sm text-foreground">
                          {post.caption || 'No caption'}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className={cn(workspaceSectionCardClass, 'divide-y divide-border p-0')}>
        {stepMeta.map((step, index) => {
          const done =
            step.id === 'ready' ? allSetupDone : stepCompletions[index];
          const locked = index > firstBlockingIncompleteIdx;
          const isOpen = !done && openStepId === step.id;
          const status = stepStatusLabel(step.id, data, skipped, done);
          const Icon = step.icon;

          return (
            <div key={step.id} className="overflow-hidden">
              <div
                className={cn(
                  'flex w-full items-center gap-3 px-5 py-4',
                  isOpen && 'bg-muted/30'
                )}
              >
                {done ? (
                  <>
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/15 text-sm font-semibold text-emerald-700"
                      aria-hidden
                    >
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground">
                          {step.label}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs text-emerald-700 dark:text-emerald-400">
                        {status}
                      </span>
                    </span>
                    <div className="ml-auto flex shrink-0 justify-end">
                      {renderDoneRowCta(step.id)}
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => openStep(index)}
                    className={cn(
                      'flex w-full min-w-0 items-center gap-3 text-left transition-colors',
                      !locked && 'hover:opacity-90',
                      locked && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
                        !locked &&
                          'border-border bg-background text-muted-foreground',
                        locked && 'border-border bg-muted text-muted-foreground'
                      )}
                      aria-hidden
                    >
                      {locked ? (
                        <Lock className="h-3.5 w-3.5" />
                      ) : (
                        index + 1
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground">
                          {step.label}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {status}
                      </span>
                    </span>

                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                        isOpen && 'rotate-180'
                      )}
                      aria-hidden
                    />
                  </button>
                )}
              </div>

              {isOpen && !locked && (
                <div className="border-t border-border/60 bg-background/50 px-5 pb-5 pt-4">
                  {step.id === 'plan' && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {done
                          ? `You're on ${data.plan}.`
                          : 'A paid plan unlocks AI Engine features.'}
                      </p>
                      <Button
                        variant={done ? 'outline' : 'default'}
                        onClick={() => router.push('/settings/billings')}
                      >
                        Open billing
                      </Button>
                    </div>
                  )}

                  {step.id === 'business' && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {data.onBoarded
                          ? 'Your brand profile is on file.'
                          : skipped.has('business')
                            ? 'Marked done. Add Brand DNA anytime from Template DNA.'
                            : 'Add brand details so AI matches your voice.'}
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Button onClick={() => router.push('/template-dna')}>
                          {data.onBoarded
                            ? 'Review brand profile'
                            : 'Add brand details'}
                        </Button>
                        {!data.onBoarded && !skipped.has('business') && (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={markBusinessDone}
                          >
                            Done
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {step.id === 'selectSocial' && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Your plan allows up to {maxAllowed} platform
                        {maxAllowed !== 1 ? 's' : ''}.
                        {platformsLocked
                          ? ' Selection is locked for this billing period.'
                          : ' Saving locks platforms until a plan change alters your limit.'}
                      </p>
                      {maxAllowed === 0 && (
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                          Subscribe to a plan first.
                        </p>
                      )}

                      <div className="grid gap-2">
                        {PLATFORM_OPTIONS.map((opt) => {
                          const isOn = localSelected[opt.key];
                          const OptIcon = opt.icon;
                          const disabledToggle =
                            platformsLocked ||
                            (!isOn && localSelectedCount >= maxAllowed);
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              disabled={disabledToggle}
                              onClick={() => togglePlatform(opt.key)}
                              className={cn(
                                'flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                                isOn
                                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                  : 'border-border hover:border-muted-foreground/30',
                                disabledToggle &&
                                  'cursor-not-allowed opacity-40'
                              )}
                            >
                              <div
                                className={cn(
                                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br text-white shadow-sm',
                                  opt.gradient
                                )}
                              >
                                <OptIcon className="h-4 w-4" />
                              </div>
                              <span className="flex-1 text-sm font-semibold text-foreground">
                                {opt.label}
                              </span>
                              <div
                                className={cn(
                                  'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
                                  isOn
                                    ? 'border-primary bg-primary'
                                    : 'border-muted-foreground/40'
                                )}
                              >
                                {isOn && (
                                  <Check
                                    className="h-3 w-3 text-white"
                                    strokeWidth={3}
                                  />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <p className="text-xs text-muted-foreground tabular-nums">
                        {localSelectedCount} of {maxAllowed} selected
                      </p>

                      <Button
                        className="w-full sm:w-auto"
                        disabled={
                          !canSaveSelection ||
                          savingSelection ||
                          platformsLocked
                        }
                        onClick={() => setConfirmSelectionOpen(true)}
                      >
                        {platformsLocked
                          ? 'Selection locked'
                          : 'Save selection'}
                      </Button>
                    </div>
                  )}

                  {step.id === 'automation' && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {skipped.has('automation')
                          ? 'Marked done. Fine-tune anytime in Settings → Automation.'
                          : 'Set tone, cadence, and posting preferences.'}
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Button
                          onClick={() => router.push('/settings/automation')}
                        >
                          Set preferences
                        </Button>
                        {!skipped.has('automation') && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={markAutomationDone}
                          >
                            Done
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {step.id === 'facebook' && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Connect Facebook and choose the page to post to.
                      </p>
                      {!(
                        data.facebookConnected ??
                        data.availableFBPages.length > 0
                      ) ? (
                        <Button className="w-full sm:w-auto mx-2" asChild>
                          <a href={facebookHref}>Connect Facebook</a>
                        </Button>
                      ) : data.selectedPageId == null ? (
                        <Button
                          className="w-full sm:w-auto"
                          onClick={() => setSelectFacebookPageModalOpen(true)}
                        >
                          Choose page
                        </Button>
                      ) : (
                        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                          <CheckCircle className="h-4 w-4 shrink-0" />
                          {data.availableFBPages.find(
                            (p) => p.pageId === data.selectedPageId
                          )?.pageName ?? data.selectedPageId}
                        </p>
                      )}
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() =>
                          router.push(WORKSPACE_NAV_HREFS.linkedProfiles)
                        }
                      >
                        {workspacePageTitle(WORKSPACE_NAV_HREFS.linkedProfiles)}
                      </Button>
                    </div>
                  )}

                  {step.id === 'instagram' && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Connect Instagram for publishing.
                      </p>
                      {!data.instagramConnected ? (
                        <Button className="w-full sm:w-auto mx-2" asChild>
                          <a href={instagramHref}>Connect Instagram</a>
                        </Button>
                      ) : (
                        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                          <CheckCircle className="h-4 w-4 shrink-0" />
                          Instagram connected
                        </p>
                      )}
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() =>
                          router.push(WORKSPACE_NAV_HREFS.linkedProfiles)
                        }
                      >
                        {workspacePageTitle(WORKSPACE_NAV_HREFS.linkedProfiles)}
                      </Button>
                    </div>
                  )}

                  {step.id === 'linkedin' && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Connect LinkedIn and choose the organization to post to.
                      </p>
                      {!(
                        data.linkedinConnected ??
                        data.availableLinkedInPages.length > 0
                      ) ? (
                        <Button className="w-full sm:w-auto mx-2" asChild>
                          <a href={linkedinHref}>Connect LinkedIn</a>
                        </Button>
                      ) : data.selectedLinkedInPageId == null ? (
                        <Button
                          className="w-full sm:w-auto"
                          onClick={() => setSelectLinkedInPageModalOpen(true)}
                        >
                          Choose page
                        </Button>
                      ) : (
                        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                          <CheckCircle className="h-4 w-4 shrink-0" />
                          {data.availableLinkedInPages.find(
                            (p) => p.pageId === data.selectedLinkedInPageId
                          )?.pageName ?? data.selectedLinkedInPageId}
                        </p>
                      )}
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() =>
                          router.push(WORKSPACE_NAV_HREFS.linkedProfiles)
                        }
                      >
                        {workspacePageTitle(WORKSPACE_NAV_HREFS.linkedProfiles)}
                      </Button>
                    </div>
                  )}

                  {step.id === 'ready' && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {allSetupDone
                          ? 'Setup is complete. Head to Home to create and schedule content.'
                          : 'Finish the steps above to unlock AI posting.'}
                      </p>
                      {data.onBoarded &&
                        !examplePostsMeta?.used &&
                        examplePostsMeta?.status !== 'running' && (
                          <p className="text-sm text-muted-foreground">
                            Want a preview first? Use Free example posts above —
                            one free run, captions included, nothing scheduled.
                          </p>
                        )}
                      <Button
                        disabled={!allSetupDone}
                        onClick={() => router.push('/home')}
                      >
                        Go to home
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={confirmSelectionOpen} onOpenChange={setConfirmSelectionOpen}>
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm platforms</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>You are about to save these platforms:</p>
                <ul className="list-disc pl-5 font-medium text-foreground">
                  {PLATFORM_OPTIONS.filter((o) => localSelected[o.key]).map(
                    (o) => (
                      <li key={o.key}>{o.label}</li>
                    )
                  )}
                </ul>
                <p className="text-amber-700 dark:text-amber-500/90">
                  Your plan allows up to {maxAllowed} platform
                  {maxAllowed !== 1 ? 's' : ''}. Saving updates which accounts
                  the AI Engine uses.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="space-x-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmSelectionOpen(false)}
              disabled={savingSelection}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void performSaveSelection()}
              disabled={savingSelection}
            >
              {savingSelection ? 'Saving…' : 'Save selection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SelectFacebookPageModal
        open={selectFacebookPageModalOpen}
        onOpenChange={setSelectFacebookPageModalOpen}
        data={data.availableFBPages}
        onSuccess={() => void getDetails({ silent: true })}
      />
      <SelectLinkedInPageModal
        open={selectLinkedInPageModalOpen}
        onOpenChange={setSelectLinkedInPageModalOpen}
        data={data.availableLinkedInPages}
        onSuccess={() => void getDetails({ silent: true })}
      />
      <ImagePreviewOverlay
        src={imagePreview.previewUrl}
        alt={imagePreview.previewAlt}
        onClose={imagePreview.close}
      />
    </div>
  );
}
