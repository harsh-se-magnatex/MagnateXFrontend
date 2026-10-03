// Public API values. Keep in sync with backend/packages/shared/src/business/types.ts.
export const BUSINESS_TYPES = [
  'digital_product',
  'physical_product',
  'service',
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];
export function isBusinessType(value: unknown): value is BusinessType {
  return (
    typeof value === 'string' && BUSINESS_TYPES.includes(value as BusinessType)
  );
}
export const businessLabels: Record<BusinessType, string> = {
  digital_product: 'Digital product / SaaS',
  physical_product: 'Physical product',
  service: 'Service',
};
