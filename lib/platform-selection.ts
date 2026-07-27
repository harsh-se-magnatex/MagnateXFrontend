export const PLATFORM_ORDER = ['instagram', 'facebook', 'linkedin'] as const;
export type SocialPlatform = (typeof PLATFORM_ORDER)[number];

/**
 * Per-plan platform cap. Auto and Manual modes within the same tier share the
 * same cap (prime=1, elite=2, legacy=3) — the mode suffix only changes
 * automation behavior, not the platform allowance.
 */
export const PLAN_MAX_SOCIAL: Record<string, number> = {
  'prime-AI': 1,
  'prime-Studio': 1,
  'elite-AI': 2,
  'elite-Studio': 2,
  'legacy-AI': 3,
  'legacy-Studio': 3,
};

export function listEnabledPlatforms(
  selectedAccounts: Partial<Record<SocialPlatform, boolean>> | null | undefined
): SocialPlatform[] {
  if (!selectedAccounts || typeof selectedAccounts !== 'object') return [];
  return PLATFORM_ORDER.filter((platform) => selectedAccounts[platform] === true);
}

export function countEnabledPlatforms(
  selectedAccounts: Partial<Record<SocialPlatform, boolean>> | null | undefined
): number {
  return listEnabledPlatforms(selectedAccounts).length;
}

/** True when the user has chosen every platform slot their plan allows. */
export function isPlatformSelectionComplete(args: {
  activePlan: string;
  selected: Partial<Record<SocialPlatform, boolean>> | null | undefined;
}): boolean {
  const maxAllowed = PLAN_MAX_SOCIAL[args.activePlan] ?? 0;
  if (maxAllowed <= 0) return true;
  return countEnabledPlatforms(args.selected) >= maxAllowed;
}

/** Plans that already include all three platforms — no upgrade path for more slots. */
export function isMaxPlatformPlan(activePlan: string): boolean {
  return (PLAN_MAX_SOCIAL[activePlan] ?? 0) >= 3;
}

export function validateGenerationPlatformSelection(args: {
  selected: SocialPlatform[];
  enabled: SocialPlatform[];
  activePlan?: string | null;
}): { ok: true } | { ok: false; error: string } {
  const { selected, enabled, activePlan = 'non-subscribed' } = args;

  if (selected.length === 0) {
    return { ok: false, error: 'Select at least one platform' };
  }

  for (const platform of selected) {
    if (!enabled.includes(platform)) {
      return { ok: false, error: `${platform} is not available on your account` };
    }
  }

  const maxAllowed = PLAN_MAX_SOCIAL[activePlan ?? ''];
  if (maxAllowed !== undefined && selected.length > maxAllowed) {
    return {
      ok: false,
      error: `Your ${activePlan} plan allows up to ${maxAllowed} platform(s) per run`,
    };
  }

  return { ok: true };
}

export function togglePlatformSelection(
  current: SocialPlatform[],
  platform: SocialPlatform
): SocialPlatform[] {
  if (current.includes(platform)) {
    return current.filter((item) => item !== platform);
  }
  return [...current, platform];
}

export function areAllEnabledSelected(
  selected: SocialPlatform[],
  enabled: SocialPlatform[]
): boolean {
  return (
    enabled.length > 0 &&
    enabled.every((platform) => selected.includes(platform)) &&
    selected.length === enabled.length
  );
}

export function allPlatformsSelectionLabel(enabledCount: number): string {
  if (enabledCount === 2) return 'Both platforms';
  return 'All platforms';
}
