'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { useUploadStore } from '@/src/stores/photoState';

export function ClearPendingOnNavigation() {
  const pathname = usePathname();

  const clearImages = useUploadStore((state) => state.clearImages);

  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      void clearImages();
      previousPathname.current = pathname;
    }
  }, [pathname, clearImages]);

  return null;
}
