'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSafeAppReturnTo } from '@/lib/safeAppReturnTo';

type AuthMode = 'login' | 'sign-up';

export function AuthFormTabs({ mode }: { mode: AuthMode }) {
  const [signInHref, setSignInHref] = useState('/sign-in');

  useEffect(() => {
    const returnTo = getSafeAppReturnTo(
      new URLSearchParams(window.location.search).get('returnTo')
    );
    setSignInHref(
      returnTo && !returnTo.startsWith('/sign-in')
        ? `/sign-in?returnTo=${encodeURIComponent(returnTo)}`
        : '/sign-in'
    );
  }, []);

  return (
    <Tabs value={mode} className="w-full">
      <TabsList className="grid h-auto w-full grid-cols-2 gap-1">
        <TabsTrigger value="login" asChild>
          <Link href={signInHref}>Login</Link>
        </TabsTrigger>
        <TabsTrigger value="sign-up" asChild>
          <Link href="/sign-up">Sign up</Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
