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

export type LeadMagnetJobStatus = 'processing' | 'ready' | 'failed';

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
 * Step 3 — enqueue generation on the worker (Cloud Tasks).
 * Returns `jobId` immediately; client polls `/status` for the finished post.
 * May return `status: 'ready'` with `post` if the job already finished.
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
      status: 'processing' | 'ready';
      jobId: string;
      post?: LeadMagnetPost;
    }>
  >(
    '/api/v1/lead-magnet/generate',
    {
      email: args.email.trim(),
      website: normalizeWebsiteUrl(args.website),
      platform: args.platform,
      dna: args.dna,
    },
    { timeout: 30_000 }
  );
  if (!res?.data?.jobId) {
    throw new Error(res?.message || 'Generate failed — no job returned');
  }
  return res.data;
}

/** Poll worker-persisted job until ready / failed. */
export async function pollLeadMagnetStatus(args: {
  email: string;
  jobId: string;
}) {
  const res = await apiPost<
    ApiEnvelope<{
      status: LeadMagnetJobStatus;
      email: string;
      domainKey?: string;
      platform?: LeadMagnetPlatform;
      jobId: string;
      post?: LeadMagnetPost;
      error?: string;
    }>
  >(
    '/api/v1/lead-magnet/status',
    {
      email: args.email.trim(),
      jobId: args.jobId.trim(),
    },
    { timeout: 20_000 }
  );
  if (!res?.data?.status) {
    throw new Error(res?.message || 'Status check failed');
  }
  return res.data;
}
