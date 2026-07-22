import { getSocialAccountsApi } from '@/src/service/api/social.servce';

export type ShareSocialPlatform = 'facebook' | 'instagram' | 'linkedin';

export type SocialAccountShareFields = {
  platform?: string;
  selectedPageId?: string | null;
  pageName?: string | null;
};

type CachedAccounts = {
  at: number;
  accounts: SocialAccountShareFields[];
};

let accountsCache: CachedAccounts | null = null;
let accountsInflight: Promise<SocialAccountShareFields[]> | null = null;
const ACCOUNTS_TTL_MS = 60_000;

export function normalizeSharePlatform(
  raw: unknown
): ShareSocialPlatform | null {
  const p = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '');
  if (p === 'facebook' || p === 'fb') return 'facebook';
  if (p === 'instagram' || p === 'ig') return 'instagram';
  if (p === 'linkedin' || p === 'li') return 'linkedin';
  return null;
}

/**
 * Build a public profile URL for the user's selected business page/account.
 * fb → https://facebook.com/{selectedPageId}
 * ig → https://instagram.com/{pageName}
 * li → https://linkedin.com/{selectedPageId.split(':').at(-1)}
 */
export function buildBusinessSocialProfileUrl(
  platform: ShareSocialPlatform,
  account: SocialAccountShareFields | null | undefined
): string | null {
  if (!account) return null;

  if (platform === 'facebook') {
    const id = String(account.selectedPageId ?? '').trim();
    return id ? `https://facebook.com/${id}` : null;
  }

  if (platform === 'instagram') {
    const name = String(account.pageName ?? '')
      .trim()
      .replace(/^@+/, '');
    return name ? `https://instagram.com/${name}` : null;
  }

  const raw = String(account.selectedPageId ?? '').trim();
  if (!raw) return null;
  const id = raw.split(':').at(-1)?.trim();
  return id ? `https://linkedin.com/${id}` : null;
}

/** Append the business social URL to caption text for share / copy. */
export function appendSocialProfileLink(
  caption: string | null | undefined,
  profileUrl: string | null | undefined
): string {
  const text = String(caption ?? '').trim();
  const url = String(profileUrl ?? '').trim();
  if (!url) return text;
  if (!text) return url;
  if (text.includes(url)) return text;
  return `${text}\n\n${url}`;
}

async function loadSocialAccounts(): Promise<SocialAccountShareFields[]> {
  const now = Date.now();
  if (accountsCache && now - accountsCache.at < ACCOUNTS_TTL_MS) {
    return accountsCache.accounts;
  }
  if (accountsInflight) return accountsInflight;

  accountsInflight = (async () => {
    try {
      const response = await getSocialAccountsApi();
      const rows = response?.data?.data;
      const accounts = Array.isArray(rows)
        ? (rows as SocialAccountShareFields[])
        : [];
      accountsCache = { at: Date.now(), accounts };
      return accounts;
    } catch {
      return accountsCache?.accounts ?? [];
    } finally {
      accountsInflight = null;
    }
  })();

  return accountsInflight;
}

/** Resolve the selected business page URL for a post platform (if connected). */
export async function resolveBusinessSocialProfileUrl(
  platformRaw: string | null | undefined
): Promise<string | null> {
  const platform = normalizeSharePlatform(platformRaw);
  if (!platform) return null;
  const accounts = await loadSocialAccounts();
  const account =
    accounts.find(
      (a) => normalizeSharePlatform(a.platform) === platform
    ) ?? null;
  return buildBusinessSocialProfileUrl(platform, account);
}
