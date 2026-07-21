import { redirect } from 'next/navigation';

/** Old URL — keep bookmarks working after rename to Business Data. */
export default function MemoryLayerRedirect() {
  redirect('/template-dna/business-data');
}
