import axiosClient from '@/lib/axios';
import type { Platform } from '@/src/types/job';
import {
  readJobMetadata,
  useJobMetadataCache,
  type JobMetadata,
} from '@/src/stores/jobMetadataCache';

export type JobMetadataResponse = {
  parentJobId: string;
  type: string | null;
  selectedDates: string[];
  selectedPlatforms: Platform[];
};

/**
 * Pure API call — reads `payload.selectedDates` + `payload.selectedPlatforms`
 * off one sibling job under `parentJobId`. Always hits the server; for the
 * cache-first version use `getJobMetadata()`.
 */
export async function fetchJobMetadataApi(
  parentJobId: string
): Promise<JobMetadataResponse> {
  const response = await axiosClient.get<{
    success: boolean;
    data: JobMetadataResponse;
    message?: string;
  }>(`/api/v1/jobs/metadata/${encodeURIComponent(parentJobId)}`);
  return response.data.data;
}

/**
 * Zustand-first metadata lookup. Returns immediately when the in-memory cache
 * has an entry, otherwise hits the API once and writes the result back into
 * the cache for future callers in this tab session.
 *
 * Network failures resolve to whatever (possibly empty) snapshot the cache
 * already had — callers should treat a missing field as "not yet known"
 * rather than as a hard error.
 */
export async function getJobMetadata(
  parentJobId: string
): Promise<JobMetadata> {
  if (!parentJobId) return {};
  const cached = readJobMetadata(parentJobId);
  if (cached) return cached;

  try {
    const fresh = await fetchJobMetadataApi(parentJobId);
    const meta: JobMetadata = {
      selectedDates: fresh.selectedDates,
      selectedPlatforms: fresh.selectedPlatforms,
    };
    useJobMetadataCache.getState().setMetadata(parentJobId, meta);
    return meta;
  } catch {
    return cached ?? {};
  }
}
