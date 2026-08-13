export const PREVIEW_IMAGE = '/landing/social-preview-placeholder.png';
/** @deprecated Prefer SHOWCASE_BRAND from showcase-data */
export const BRAND_NAME = 'Magnate Regalia';
export const BRAND_HANDLE = 'magnate_regalia';
export const SAMPLE_CAPTION =
  'Crafted eyewear cases where design meets durability — premium protection for the styles you love.';

export type PreviewPlatform = 'instagram' | 'facebook' | 'linkedin';

export const PLATFORM_OPTIONS: {
  id: PreviewPlatform;
  label: string;
  description: string;
}[] = [
  {
    id: 'facebook',
    label: 'Facebook',
    description: 'Page photos grid and feed posts',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    description: 'Browse the profile grid and open posts',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    description: 'Company posts grid and feed',
  },
];
