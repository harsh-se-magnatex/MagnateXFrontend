/**
 * Mirror of the backend `jobs/{jobId}` doc shape (one doc per (user, platform)).
 * Keep in sync with `backend/packages/shared/src/jobs/types.ts`.
 *
 * Per-platform: each generation request fans out one sibling job per platform
 * (and per date, for ai-engine batch). Siblings share `parentJobId`. The
 * frontend opens one `onSnapshot(doc(db, 'jobs', jobId))` per sibling.
 */
export type JobStatus = 'pending' | 'processing' | 'done' | 'failed';

export type Platform = 'instagram' | 'facebook' | 'linkedin' | 'x';

export type GenerationType =
  | 'instant'
  | 'ai-engine'
  | 'product-advert'
  | 'events-post'
  /** Create-campaign drafts. Own activeJobs slot so a campaign run never
   *  blocks (or shares progress UI with) a festive-post run. */
  | 'campaign-post'
  | 'memory-layer';

/**
 * Shape of `jobs/{jobId}.result` on a finished doc. The worker stitches feature
 * specific extras into this object (caption, copy, contentFormatLabel,
 * successCount, …). Treat unknown keys as feature-specific extras.
 */
export interface JobResult {
  url?: string | null;
  filePath?: string | null;
  caption?: string | null;
  postId?: string | null;
  scheduledPostId?: string | null;
  [extra: string]: unknown;
}

export interface JobError {
  message: string;
  code?: string;
}

export interface JobDoc {
  jobId: string;
  parentJobId: string;
  userId: string;
  type: GenerationType;
  platform: Platform | null;
  status: JobStatus;
  pct: number;
  stage: string;
  result: JobResult | null;
  error: JobError | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * One sibling in `users/{uid}.activeJobs.{type}.jobs[]`. Persisted by the API
 * controller alongside `parentJobId` so the frontend can rebuild listeners on
 * page reload without a Firestore query.
 */
export interface ActivePlatformJob {
  jobId: string;
  platform: Platform;
  /** Only set for ai-engine batch runs (one job per platform x date). */
  date?: string;
}

export interface ActiveJobEntry {
  parentJobId: string;
  jobs: ActivePlatformJob[];
  /**
   * Snapshot of dates the user picked when launching this run. Only set for
   * ai-engine batch runs. Pages prefer the in-memory zustand cache and fall
   * back to this (and to a job-doc lookup) on refresh.
   */
  selectedDates?: string[];
  /** Snapshot of platforms the user picked when launching this run. */
  selectedPlatforms?: Platform[];
}

/**
 * For ai-engine batch runs each platform has its own slot, so Instagram /
 * Facebook / LinkedIn batches can be in flight concurrently. All other
 * features remain single-slot per type.
 */
export type ActiveAiEngineSlots = Partial<
  Record<Extract<Platform, 'instagram' | 'facebook' | 'linkedin'>, ActiveJobEntry>
>;

/** Shape of `users/{uid}.activeJobs`. Missing keys = nothing in flight. */
export interface ActiveJobs {
  instant?: ActiveJobEntry;
  'product-advert'?: ActiveJobEntry;
  'events-post'?: ActiveJobEntry;
  'campaign-post'?: ActiveJobEntry;
  'memory-layer'?: ActiveJobEntry;
  'ai-engine'?: ActiveAiEngineSlots;
}
