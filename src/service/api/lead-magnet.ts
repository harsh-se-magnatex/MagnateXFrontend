import { apiPost } from '@/lib/api-client';
import { normalizeWebsiteUrl } from '@/utils/normalizeWebsiteUrl';

export type LeadMagnetPlatform = 'instagram' | 'facebook' | 'linkedin';

export type LeadMagnetDna = {
  website: string;
  businessName: string;
  industry: string;
  brandDescription: string;
  logo: string;
  location: string;
  hashtags: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
};

export type LeadMagnetPost = {
  caption: string;
  imageUrl: string;
  imageFilePath?: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

export const LEAD_MAGNET_CONSENT_FALLBACK =
  "We'll send you the post plus occasional tips. Unsubscribe anytime.";

/** Step 1 — validate email has not already claimed a free post. */
export async function claimLeadMagnetEmail(email: string) {
  const res = await apiPost<
    ApiEnvelope<{
      email: string;
      consentText?: string;
    }>
  >('/api/v1/lead-magnet/claim-email', {
    email: email.trim(),
  });
  if (!res?.data) throw new Error(res?.message || 'Could not verify email');
  return res.data;
}

/** Step 2 — scrape website DNA (requires email). */
export async function previewLeadMagnet(args: {
  email: string;
  website: string;
}) {
  const res = await apiPost<
    ApiEnvelope<{
      domainKey: string;
      dna: LeadMagnetDna;
      consentText?: string;
    }>
  >(
    '/api/v1/lead-magnet/preview',
    {
      email: args.email.trim(),
      website: normalizeWebsiteUrl(args.website),
    },
    { timeout: 90_000 }
  );
  if (!res?.data) throw new Error(res?.message || 'Preview failed');
  return res.data;
}

/**
 * Step 3 — generate synchronously via API → worker HTTP POST.
 * Waits for the finished post in the same response (no poll / no queue).
 */
export async function generateLeadMagnet(args: {
  email: string;
  website: string;
  platform: LeadMagnetPlatform;
  dna?: LeadMagnetDna;
}) {
  const res = await apiPost<
    ApiEnvelope<{
      email: string;
      domainKey: string;
      platform: LeadMagnetPlatform;
      status: 'ready';
      post: LeadMagnetPost;
    }>
  >(
    '/api/v1/lead-magnet/generate',
    {
      email: args.email.trim(),
      website: normalizeWebsiteUrl(args.website),
      platform: args.platform,
      dna: args.dna,
    },
    { timeout: 16 * 60_000 }
  );
  if (!res?.data?.post) {
    throw new Error(res?.message || 'Generate failed — no post returned');
  }
  return res.data;
}
