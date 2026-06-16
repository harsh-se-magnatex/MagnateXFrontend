export const PLATFORM_ORDER = ['instagram', 'facebook', 'linkedin'] as const;
export type SocialPlatform = (typeof PLATFORM_ORDER)[number];

export const PLAN_MAX_SOCIAL: Record<string, number> = {
  prime: 1,
  elite: 2,
  legacy: 3,
};

export function listEnabledPlatforms(
  selectedAccounts: Partial<Record<SocialPlatform, boolean>> | null | undefined
): SocialPlatform[] {
  if (!selectedAccounts) return [];
  return PLATFORM_ORDER.filter((platform) => selectedAccounts[platform] === true);
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
