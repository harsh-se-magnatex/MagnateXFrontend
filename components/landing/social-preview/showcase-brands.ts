/**
 * Frontend registry of How-It-Looks showcase brands.
 * Add a brand here after exporting with:
 *   pnpm export-how-it-looks -- --brand=<id>
 */
export type ShowcaseBrandId = 'magnate-regalia' | 'sunglasses' | 'clothing' | 'cafe' | 'jewelry';

export type ShowcaseBrandOption = {
  id: ShowcaseBrandId;
  label: string;
  description: string;
};

export const SHOWCASE_BRAND_OPTIONS: ShowcaseBrandOption[] = [
  {
    id: 'jewelry',
    label: 'Jewelry',
    description: 'Jewelry',
  },
  {
    id: 'magnate-regalia',
    label: 'Magnate Regalia',
    description: 'Real estate lifestyle',
  },
  {
    id: 'cafe',
    label: 'Cafe',
    description: 'Food & Beverage',
  },
  {
    id: 'clothing',
    label: 'Clothing',
    description: 'Fashion clothing',
  },
  {
    id: 'sunglasses',
    label: 'SunGlasses',
    description: 'Fashion eyewear',
  },
];

export const DEFAULT_SHOWCASE_BRAND_ID: ShowcaseBrandId = 'jewelry';

export function isShowcaseBrandId(value: string): value is ShowcaseBrandId {
  return SHOWCASE_BRAND_OPTIONS.some((b) => b.id === value);
}
