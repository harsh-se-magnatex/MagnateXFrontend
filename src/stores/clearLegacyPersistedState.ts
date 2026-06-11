/** Keys previously used by zustand/persist — removed after moving to in-memory stores. */
const LEGACY_GENERATION_STORE_KEYS = [
  'instant-generated-state',
  'batch-generation-state',
  'festive-post-state',
  'product-advert-state',
] as const;

let cleared = false;

export function clearLegacyPersistedGenerationState(): void {
  if (cleared || typeof window === 'undefined') return;
  cleared = true;
  for (const key of LEGACY_GENERATION_STORE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore quota / private mode errors
    }
  }
}

clearLegacyPersistedGenerationState();
