/**
 * Frontend registry of How-It-Looks showcase brands.
 * Add a brand here after exporting with:
 *   pnpm export-how-it-looks -- --brand=<id>
 */
export type ShowcaseBrandId =
  | 'magnate-regalia'
  | 'sunglasses'
  | 'clothing'
  | 'cafe'
  | 'jewelry';

export type ShowcaseBrandOption = {
  id: ShowcaseBrandId;
  label: string;
  description: string;
};

/** Labels are the brand names as they appear in the exported fixtures, so the
 *  switcher matches the profile the mockup actually renders. */
export const SHOWCASE_BRAND_OPTIONS: ShowcaseBrandOption[] = [
  {
    id: 'jewelry',
    label: 'Neon Luxe',
    description: 'Jewellery',
  },
  {
    id: 'magnate-regalia',
    label: 'Magnate Regalia',
    description: 'Real estate',
  },
  {
    id: 'cafe',
    label: 'Neon Cafe',
    description: 'Food & beverage',
  },
  {
    id: 'clothing',
    label: 'Neon Clothes',
    description: 'Fashion',
  },
  {
    id: 'sunglasses',
    label: 'Neon Ray Co.',
    description: 'Eyewear',
  },
];

export const DEFAULT_SHOWCASE_BRAND_ID: ShowcaseBrandId = 'jewelry';

export function isShowcaseBrandId(value: string): value is ShowcaseBrandId {
  return SHOWCASE_BRAND_OPTIONS.some((b) => b.id === value);
}
