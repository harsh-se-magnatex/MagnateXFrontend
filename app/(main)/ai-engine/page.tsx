'use client';

import { useAuth } from '@/src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useCallback } from 'react';
import {
  Brain,
  Sparkles,
  DollarSign,
  BriefcaseBusiness,
  FacebookIcon,
  Instagram,
  Linkedin,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Share2,
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
  getUserAIenginePageContext,
  selectSocialPlatformApi,
} from '@/features/user/api';
import { Progress } from '@/components/ui/progress';
import { AnimatePresence, motion } from 'framer-motion';

const SUBSCRIPTION_ACK_KEY = 'magnatex-ai-engine-subscription-ack';

const PLAN_MAX_SOCIAL: Record<string, number> = {
  prime: 1,
  elite: 2,
  legacy: 3,
};

type SelectedPlatforms = {
  facebook: boolean;
  instagram: boolean;
  linkedin: boolean;
};

type UserData = {
  plan: 'non-subscribed' | 'prime' | 'elite' | 'legacy';
  onBoarded: boolean;
  socialAccounts: number;
  availableFBPages: {
    pageId: string;
    pageName: string;
    pageAccessToken: string;
  }[];
  selectedPageId: string | null;
  facebookConnected?: boolean;
  instagramConnected?: boolean;
  linkedinConnected?: boolean;
  instagramUserId?: string | null;
  selected: SelectedPlatforms;
};

type StepId =
  | 'plan'
  | 'business'
  | 'selectSocial'
  | 'ready';

type StepMeta = { id: StepId; label: string; icon: React.ElementType };

const BASE_STEP_IDS = new Set<StepId>(['plan', 'business', 'selectSocial']);

const STEP_META: StepMeta[] = [
  { id: 'plan', label: 'Plan', icon: DollarSign },
  { id: 'business', label: 'Business', icon: BriefcaseBusiness },
  { id: 'selectSocial', label: 'Select Accounts', icon: Share2 },
  { id: 'ready', label: 'Ready', icon: CheckCircle },
];

function readSubscriptionAck(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SUBSCRIPTION_ACK_KEY) === 'true';
}

function isStepComplete(
  stepId: StepId,
  data: UserData,
  subscriptionAck: boolean,
  skipped: Set<StepId>
): boolean {
  switch (stepId) {
    case 'plan':
      return data.plan !== 'non-subscribed' || subscriptionAck;
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
    case 'ready':
      return false;
    default:
      return false;
  }
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
    facebookConnected: false,
    instagramConnected: false,
    linkedinConnected: false,
    instagramUserId: null,
    selected: { facebook: false, instagram: false, linkedin: false },
  });
  const [dataLoading, setDataLoading] = React.useState(true);
  const [subscriptionAck, setSubscriptionAck] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [direction, setDirection] = React.useState(0);
  const [skipped, setSkipped] = React.useState<Set<StepId>>(new Set());
  const [localSelected, setLocalSelected] = React.useState<SelectedPlatforms>({
    facebook: false,
    instagram: false,
    linkedin: false,
  });
  const [savingSelection, setSavingSelection] = React.useState(false);
  const [confirmSelectionOpen, setConfirmSelectionOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    setSubscriptionAck(readSubscriptionAck());
  }, []);

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
      setData({
        socialAccounts: raw.socialAccounts,
        onBoarded: raw.onBoarded,
        plan: raw.plan,
        availableFBPages: raw.availableFBPages ?? [],
        selectedPageId: raw.selectedPageId,
        facebookConnected:
          raw.facebookConnected ?? raw.availableFBPages?.length > 0,
        instagramConnected: raw.instagramConnected ?? false,
        linkedinConnected: raw.linkedinConnected ?? false,
        instagramUserId: raw.instagramUserId ?? null,
        selected,
      });
      setLocalSelected(selected);
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Failed to fetch AI Engine Details';
      alert(msg);
    } finally {
      if (!opts?.silent) setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
    void getDetails();
  }, [loading, user, router, getDetails]);

  const stepMeta = STEP_META;

  const stepCompletions = useMemo(() => {
    return stepMeta.map((s) =>
      isStepComplete(s.id, data, subscriptionAck, skipped)
    );
  }, [stepMeta, data, subscriptionAck, skipped]);

  const firstStrictIncompleteIdx = useMemo(() => {
    for (let i = 0; i < stepMeta.length - 1; i++) {
      if (!stepCompletions[i]) return i;
    }
    return stepMeta.length - 1;
  }, [stepMeta, stepCompletions]);

  const progressPct = useMemo(() => {
    const totalCheckable = stepMeta.length - 1;
    if (totalCheckable <= 0) return 0;
    const done = stepCompletions
      .slice(0, totalCheckable)
      .filter(Boolean).length;
    return Math.round((done / totalCheckable) * 100);
  }, [stepMeta, stepCompletions]);

  const [stepPositionInitialized, setStepPositionInitialized] =
    React.useState(false);

  useEffect(() => {
    if (dataLoading) return;
    if (!stepPositionInitialized) {
      setCurrentStep(firstStrictIncompleteIdx);
      setStepPositionInitialized(true);
      return;
    }
    setCurrentStep((prev) => {
      return prev > firstStrictIncompleteIdx ? firstStrictIncompleteIdx : prev;
    });
  }, [dataLoading, firstStrictIncompleteIdx, stepPositionInitialized]);

  useEffect(() => {
    setCurrentStep((prev) => {
      if (prev >= stepMeta.length) return Math.max(0, stepMeta.length - 1);
      return prev;
    });
  }, [stepMeta.length]);

  useEffect(() => {
    const onFocus = () => {
      if (!user) return;
      void getDetails({ silent: true });
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, getDetails]);

  const canGoNext =
    currentStep < stepMeta.length - 1 && stepCompletions[currentStep];
  const isLastStep = currentStep === stepMeta.length - 1;
  const goNext = () => {
    if (!canGoNext) return;
    setDirection(1);
    setCurrentStep((s) => Math.min(stepMeta.length - 1, s + 1));
  };

  const goBack = () => {
    if (currentStep <= 0) return;
    setDirection(-1);
    setCurrentStep((s) => s - 1);
  };

  const goToStep = (index: number) => {
    if (index < 0 || index >= stepMeta.length) return;
    if (index > firstStrictIncompleteIdx) return;
    setDirection(index > currentStep ? 1 : -1);
    setCurrentStep(index);
  };

  const skipCurrentStep = () => {
    const currentId = stepMeta[currentStep]?.id;
    if (!currentId) return;
    setSkipped((prev) => new Set(prev).add(currentId));
  };

  const maxAllowed = PLAN_MAX_SOCIAL[data.plan] ?? 0;
  const localSelectedCount = [
    localSelected.facebook,
    localSelected.instagram,
    localSelected.linkedin,
  ].filter(Boolean).length;

  const togglePlatform = (key: keyof SelectedPlatforms) => {
    setLocalSelected((prev) => {
      const next = { ...prev };
      if (prev[key]) {
        next[key] = false;
        return next;
      }
      const currentCount = [prev.facebook, prev.instagram, prev.linkedin].filter(Boolean).length;
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
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Failed to save platform selection';
      alert(msg);
    } finally {
      setSavingSelection(false);
    }
  };

  const currentStepMeta = stepMeta[currentStep];
  const currentStepId = currentStepMeta?.id;

  if (loading || !user) return null;

  if (dataLoading)
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[40vh]">
        Loading...
      </div>
    );

  const slideX = direction >= 0 ? 24 : -24;

  return (
    <div className="max-w-2xl mx-auto page-enter pb-20">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-purple-400 text-white shadow-sm">
            <Brain className="h-5 w-5" />
          </div>
          AI Engine
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-purple/10 border border-primary-purple/20">
            <Sparkles className="w-3.5 h-3.5 text-primary-purple" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary-purple">
              Beta
            </span>
          </div>
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground leading-relaxed">
          Complete each step in order to activate AI-powered posting. Progress
          is checked against your account automatically.
        </p>
      </header>

      <div className="mb-8">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Setup progress
          </span>
          <span className="text-xs font-semibold text-foreground">
            {progressPct}%
          </span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {stepMeta
            .map((s, i) => ({ s, i }))
            .filter(({ s }) => BASE_STEP_IDS.has(s.id))
            .map(({ s, i }) => {
              const done = stepCompletions[i];
              const locked = i > firstStrictIncompleteIdx;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={locked}
                  onClick={() => goToStep(i)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all border',
                    i === currentStep &&
                      'bg-primary text-primary-foreground border-primary shadow-sm',
                    i !== currentStep &&
                      done &&
                      'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
                    i !== currentStep &&
                      !done &&
                      !locked &&
                      'bg-muted/50 text-muted-foreground border-border hover:bg-muted',
                    locked && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <s.icon className="h-3.5 w-3.5" />
                  {s.label}
                </button>
              );
            })}
          {stepMeta
            .map((s, i) => ({ s, i }))
            .filter(({ s }) => s.id === 'ready')
            .map(({ s, i }) => {
              const done = stepCompletions[i];
              const locked = i > firstStrictIncompleteIdx;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={locked}
                  onClick={() => goToStep(i)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all border',
                    i === currentStep &&
                      'bg-primary text-primary-foreground border-primary shadow-sm',
                    i !== currentStep &&
                      done &&
                      'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
                    i !== currentStep &&
                      !done &&
                      !locked &&
                      'bg-muted/50 text-muted-foreground border-border hover:bg-muted',
                    locked && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <s.icon className="h-3.5 w-3.5" />
                  {s.label}
                </button>
              );
            })}
        </div>
      </div>

      <div className="relative min-h-[320px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            initial={{ opacity: 0, x: slideX }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -slideX }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="glass-card rounded-2xl p-8 border border-border/40 shadow-sm"
          >
            {/* Step: Plan */}
            {currentStepId === 'plan' && (
              <div className="space-y-5">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-purple-400 text-white shadow-sm">
                  <DollarSign className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  Subscription
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Use a paid plan to unlock full AI engine features. Confirm
                  here once you are on Pro or Enterprise, or open billing to
                  upgrade.
                </p>
                {isStepComplete('plan', data, subscriptionAck, skipped) ? (
                  <p className="text-sm font-medium text-emerald-600 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    Subscription step satisfied.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    On record:{' '}
                    <span className="font-semibold text-foreground capitalize">
                      {data.plan}
                    </span>
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push('/settings/billings')}
                  >
                    Open billing
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Business */}
            {currentStepId === 'business' && (
              <div className="space-y-5">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-pink-500 to-rose-400 text-white shadow-sm">
                  <BriefcaseBusiness className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  Business data
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Fill in your business DNA so the AI can match your brand
                  voice, visuals, and positioning.
                </p>
                {data.onBoarded ? (
                  <p className="text-sm font-medium text-emerald-600 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    Business profile is on file.
                  </p>
                ) : skipped.has('business') ? (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Skipped for now. You can add your business DNA anytime from
                    Brand DNA.
                  </p>
                ) : (
                  <p className="text-sm text-amber-600">
                    Business onboarding is not complete yet.
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="flex-1"
                    onClick={() => router.push('/template-dna')}
                  >
                    {data.onBoarded
                      ? 'Review brand profile'
                      : 'Fill business data'}
                  </Button>
                  {!data.onBoarded && !skipped.has('business') && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex-1"
                      onClick={skipCurrentStep}
                    >
                      Later
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Step: Select Social Accounts */}
            {currentStepId === 'selectSocial' && (
              <div className="space-y-5">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-blue-400 text-white shadow-sm">
                  <Share2 className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  Select Social Accounts
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Choose which social platforms to use with the AI engine. Your{' '}
                  <span className="font-semibold text-foreground capitalize">
                    {data.plan}
                  </span>{' '}
                  plan allows up to{' '}
                  <span className="font-semibold text-foreground">
                    {maxAllowed}
                  </span>{' '}
                  platform{maxAllowed !== 1 ? 's' : ''}.
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-500/90 leading-relaxed rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                  After you confirm, your choice is saved permanently and cannot
                  be changed later.
                </p>

                <div className="grid gap-3">
                  {PLATFORM_OPTIONS.map((opt) => {
                    const isOn = localSelected[opt.key];
                    const Icon = opt.icon;
                    const disabledToggle =
                      !isOn && localSelectedCount >= maxAllowed;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        disabled={disabledToggle}
                        onClick={() => togglePlatform(opt.key)}
                        className={cn(
                          'flex items-center gap-4 rounded-xl border p-4 transition-all text-left',
                          isOn
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border hover:border-muted-foreground/30',
                          disabledToggle && 'opacity-40 cursor-not-allowed'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br text-white shadow-sm',
                            opt.gradient
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-semibold text-foreground flex-1">
                          {opt.label}
                        </span>
                        <div
                          className={cn(
                            'h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors',
                            isOn
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground/40'
                          )}
                        >
                          {isOn && (
                            <CheckCircle className="h-3.5 w-3.5 text-white" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs text-muted-foreground">
                  {localSelectedCount} of {maxAllowed} selected
                </p>

                <Button
                  className="w-full"
                  disabled={localSelectedCount !== maxAllowed || savingSelection}
                  onClick={() => setConfirmSelectionOpen(true)}
                >
                  Confirm selection…
                </Button>

                {isStepComplete(
                  'selectSocial',
                  data,
                  subscriptionAck,
                  skipped
                ) && (
                  <p className="text-sm font-medium text-emerald-600 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    Platforms selected.
                  </p>
                )}
              </div>
            )}

            {/* Step: Ready */}
            {currentStepId === 'ready' && (
              <div className="space-y-5 text-center sm:text-left">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-green-500 to-emerald-400 text-white shadow-md mx-auto sm:mx-0">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  You are ready
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                  All setup steps are complete. Open the dashboard to create and
                  schedule content with the AI engine.
                </p>
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => router.push('/home')}
                >
                  Go to home
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-3 mt-8">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          type="button"
          onClick={goNext}
          disabled={!canGoNext}
          className={`gap-2 ${isLastStep ? 'hidden' : ''}`}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={confirmSelectionOpen} onOpenChange={setConfirmSelectionOpen}>
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm social accounts</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  You are about to save these platforms for the AI Engine:
                </p>
                <ul className="list-disc pl-5 font-medium text-foreground">
                  {PLATFORM_OPTIONS.filter((o) => localSelected[o.key]).map(
                    (o) => (
                      <li key={o.key}>{o.label}</li>
                    )
                  )}
                </ul>
                <p className="text-amber-700 dark:text-amber-500/90">
                  This cannot be undone. You will not be able to change which
                  platforms you picked.
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
              {savingSelection ? 'Saving…' : 'Save permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
