'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { handleSameHashLinkClick } from '@/lib/scroll-to-hash';

type HashLinkProps = ComponentProps<typeof Link>;

function hrefToString(href: HashLinkProps['href']): string {
  if (typeof href === 'string') return href;
  if (typeof href === 'object' && href !== null) {
    const path = href.pathname ?? '';
    const hash = href.hash ?? '';
    return `${path}${hash}`;
  }
  return '';
}

export function HashLink({ href, onClick, ...props }: HashLinkProps) {
  return (
    <Link
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          handleSameHashLinkClick(event, hrefToString(href));
        }
      }}
      {...props}
    />
  );
}
