import {
  generateProductAdvertVideoApi,
  type ProductAdvertVideoGenerateResponse,
} from '@/src/service/api/product-advert.service';
import { getProfile } from '@/src/service/api/userService';

/** Fetches the saved assets and opt-in state used by the Video Generator. */
export async function fetchVideoGeneratorProfile(): Promise<{
  logoUrl: string | null;
  avatarUrl: string | null;
  useVideoAvatar: boolean;
}> {
  const response = await getProfile();
  const profile = response?.data?.profile ?? {};
  const logo = String(profile.logo ?? '').trim();
  const avatar = String(profile.videoAvatarUrl ?? '').trim();
  return {
    logoUrl: logo || null,
    avatarUrl: avatar || null,
    useVideoAvatar: profile.useVideoAvatar === true,
  };
}

/** Starts standalone video generation. */
export async function startVideoGeneration(args: {
  referencePrompt?: string;
  referenceImages?: Array<{ file: File; source: 'upload' | 'gallery' }>;
  logoFramePosition: 'first' | 'last';
}): Promise<ProductAdvertVideoGenerateResponse> {
  return generateProductAdvertVideoApi(args);
}

/** Resolves a frame slot to a File (fetches DB logo URLs when needed). */
export async function resolveFrameFile(
  slot: { previewUrl: string | null; file: File | null; isLogoFromDb: boolean },
  label: string
): Promise<File> {
  if (slot.file) return slot.file;
  const previewUrl = String(slot.previewUrl ?? '').trim();
  if (!previewUrl) {
    throw new Error(`Missing ${label} image.`);
  }
  const response = await fetch(previewUrl);
  if (!response.ok) {
    throw new Error(`Could not load the ${label} image.`);
  }
  const blob = await response.blob();
  const type = blob.type?.startsWith('image/') ? blob.type : 'image/png';
  const ext = type.split('/')[1] || 'png';
  return new File([blob], `${label}-image.${ext}`, { type });
}
