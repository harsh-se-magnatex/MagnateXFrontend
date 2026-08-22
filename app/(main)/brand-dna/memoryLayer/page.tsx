import { redirect } from 'next/navigation';

/** Old URL — keep bookmarks working after rename to Business Data. */
export default function MemoryLayerRedirect() {
  redirect('/brand-dna/business-data');
}
