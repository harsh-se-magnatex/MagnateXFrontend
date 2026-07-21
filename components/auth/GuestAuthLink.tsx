'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { useServerSession } from '@/hooks/useServerSession';

type GuestAuthLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  /** Destination for signed-out users. */
  href: string;
  /** Destination when a valid session exists. Defaults to `/home`. */
  signedInHref?: string;
};

/**
 * Link that sends signed-in users to the app instead of auth pages.
 * Session is checked via `/auth/me` so stale cookies do not count.
 */
export function GuestAuthLink({
  href,
  signedInHref = '/home',
  children,
  ...rest
}: GuestAuthLinkProps) {
  const hasSession = useServerSession();
  const target = hasSession === true ? signedInHref : href;

  return (
    <Link href={target} {...rest}>
      {children}
    </Link>
  );
}
