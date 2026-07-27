export const PREVIEW_IMAGE = '/landing/social-preview-placeholder.png';
export const BRAND_NAME = 'Your Brand';
export const BRAND_HANDLE = 'your_brand';
export const SAMPLE_CAPTION =
  'Crafted eyewear cases where design meets durability — premium protection for the styles you love.';

export type PreviewPlatform = 'instagram' | 'facebook' | 'linkedin';

export const PLATFORM_OPTIONS: {
  id: PreviewPlatform;
  label: string;
  description: string;
}[] = [
  {
    id: 'instagram',
    label: 'Instagram',
    description: 'Feed posts, stories, and profile grid',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    description: 'Page feed and community posts',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    description: 'Company page and professional feed',
  },
];
