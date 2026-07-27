import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC = ['/api/sign-in', '/api/sign-up', '/'];
const AUTH = ['/sign-in', '/sign-up'];
const PROTECTED = [
  '/home',
  '/brand-memory',
  '/support',
  '/onBoarding',
  '/profile',
  '/connected-accounts',
  '/automated-post',
  '/schedule-post',
  '/approval',
];

export async function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;

  const session = (await cookies()).get('session');
  
  const is = {
    auth: AUTH.includes(path),
    public: PUBLIC.some((r) => path.startsWith(r)),
    protected: PROTECTED.some((r) => path.startsWith(r)),
  };

  if (is.auth) {
    // Do not bounce /sign-in → /home on cookie presence alone.
    // A stale/invalid session fights the client 401 → /sign-in redirect
    // and causes an infinite reload loop. Auth pages verify via /auth/me.
    return NextResponse.next();
  }

  if (path.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
  }

  if (path === '/') {
    if (!session && !is.public)
      return NextResponse.redirect(new URL('/sign-in', req.url));

    return NextResponse.next();
  }

  if (is.protected && !session) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
