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
  '/social-media-integration',
  '/automated-post',
  '/schedule-post',
  '/approval',
];

export async function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;

  const session = (await cookies()).get('session');
  const isAdmin = (await cookies()).get('role')?.value === 'admin';

  const is = {
    auth: AUTH.includes(path),
    public: PUBLIC.some((r) => path.startsWith(r)),
    protected: PROTECTED.some((r) => path.startsWith(r)),
  };

  if (is.auth) {
    return session
      ? NextResponse.redirect(new URL('/home', req.url))
      : NextResponse.next();
  }

  if (path.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }

    if (!isAdmin) {
      return NextResponse.redirect(new URL('/home', req.url));
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
