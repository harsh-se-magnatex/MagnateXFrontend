import {
  generateProductAdvertVideoApi,
  type ProductAdvertVideoGenerateResponse,
} from '@/src/service/api/product-advert.service';
import { getProfile } from '@/src/service/api/userService';

/** Fetches the user's saved brand logo URL for the default first frame. */
export async function fetchDefaultLogoFrameUrl(): Promise<string | null> {
  const response = await getProfile();
  const logo = String(response?.data?.profile?.logo ?? '').trim();
  return logo.length > 0 ? logo : null;
}

/** Starts standalone Veo video generation. */
export async function startVideoGeneration(args: {
  platform: string;
  referencePrompt?: string;
  firstFrame: File;
  lastFrame: File;
}): Promise<ProductAdvertVideoGenerateResponse> {
  return generateProductAdvertVideoApi(args);
}

/** Resolves a frame slot to a File (fetches DB logo URLs when needed). */
export async function resolveFrameFile(
  slot: { previewUrl: string | null; file: File | null; isLogoFromDb: boolean },
  label: 'first' | 'last'
): Promise<File> {
  if (slot.file) return slot.file;
  const previewUrl = String(slot.previewUrl ?? '').trim();
  if (!previewUrl) {
    throw new Error(`Missing image for the ${label} frame.`);
  }
  const response = await fetch(previewUrl);
  if (!response.ok) {
    throw new Error(`Could not load the ${label} frame image.`);
  }
  const blob = await response.blob();
  const type = blob.type?.startsWith('image/') ? blob.type : 'image/png';
  const ext = type.split('/')[1] || 'png';
  return new File([blob], `${label}-frame.${ext}`, { type });
}
