import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  COUNTRY_COOKIE,
  PREFERENCE_COOKIE_MAX_AGE,
} from '@/lib/geo-currency';

/**
 * Geo headers, in priority order. Which one exists depends on the CDN in front
 * of the app, and that is not settled in this repo — the legal docs name Google
 * Cloud for hosting while scoping Vercel to analytics only, and there is no
 * vercel.json. So we try all the common ones rather than assume a host. If none
 * is present the cookie is simply not written, and the client falls back to
 * time-zone inference (see `CurrencyAutoDetect`).
 */
const GEO_HEADERS = [
  'x-vercel-ip-country',
  'cf-ipcountry',
  'x-appengine-country',
  'x-client-geo-country',
  'x-country-code',
];

/**
 * Stamps an approximate country onto the response so Server Components can pick
 * the display currency during SSR (no price flash, correct for crawlers).
 *
 * Country-level only, never stored server-side, used solely to choose a display
 * currency — a "Preferences" cookie under cookie.md §3.2, which is always-active
 * and not consent-gated. Deliberately does not overwrite an existing value, so a
 * visitor's manual choice and their first-seen country both stick.
 */
function withCountry(res: NextResponse, req: NextRequest): NextResponse {
  if (req.cookies.get(COUNTRY_COOKIE)) return res;

  let country: string | undefined;
  for (const header of GEO_HEADERS) {
    const value = req.headers.get(header)?.trim();
    if (value && /^[A-Za-z]{2}$/.test(value)) {
      country = value.toUpperCase();
      break;
    }
  }
  if (!country || country === 'XX') return res;

  res.cookies.set(COUNTRY_COOKIE, country, {
    maxAge: PREFERENCE_COOKIE_MAX_AGE,
    sameSite: 'lax',
    path: '/',
    httpOnly: false,
  });
  return res;
}

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
    return withCountry(NextResponse.next(), req);
  }

  if (path.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
  }

  if (path === '/') {
    if (!session && !is.public)
      return NextResponse.redirect(new URL('/sign-in', req.url));

    return withCountry(NextResponse.next(), req);
  }

  if (is.protected && !session) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  return withCountry(NextResponse.next(), req);
}

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
