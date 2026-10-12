import { NextResponse, type NextRequest } from 'next/server';
import {
  AUTH_SESSION_COOKIE,
  type AuthSession,
} from '@/lib/auth/mock-users';
import { parseJsonCookieValue } from '@/lib/auth/cookie-json-parse';
import {
  COOKIE_HEADER_SOFT_LIMIT,
  expireCookies,
  planCookiePurge,
} from '@/lib/auth/cookie-budget';
import { normalizeRole, rolesForPath, type UserRole } from '@/lib/types';

function readSession(request: NextRequest): AuthSession | null {
  const parsed = parseJsonCookieValue<AuthSession | null>(
    request.cookies.get(AUTH_SESSION_COOKIE)?.value,
    null
  );
  if (!parsed) return null;
  return { ...parsed, role: normalizeRole(parsed.role) };
}

function withCookieBudget(request: NextRequest, response: NextResponse): NextResponse {
  const header = request.headers.get('cookie');
  if ((header?.length ?? 0) <= COOKIE_HEADER_SOFT_LIMIT) return response;
  const toClear = planCookiePurge(header);
  if (toClear.length) {
    expireCookies(response.cookies, toClear);
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const session = readSession(request);
  const role: UserRole = session ? normalizeRole(session.role) : 'guest';

  if (
    session?.mustChangePassword &&
    pathname !== '/change-password' &&
    pathname !== '/login'
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/change-password';
    return withCookieBudget(request, NextResponse.redirect(url));
  }

  if (pathname === '/change-password' && !session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return withCookieBudget(request, NextResponse.redirect(url));
  }

  // Legacy redirects
  if (pathname === '/staff/dashboard' || pathname === '/overseer/progress') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return withCookieBudget(request, NextResponse.redirect(url));
  }
  if (pathname === '/staff/calendar') {
    const url = request.nextUrl.clone();
    url.pathname = '/calendar';
    return withCookieBudget(request, NextResponse.redirect(url));
  }
  if (pathname === '/staff/reports') {
    const url = request.nextUrl.clone();
    url.pathname = '/reports';
    return withCookieBudget(request, NextResponse.redirect(url));
  }

  const allowed = rolesForPath(pathname);
  if (allowed) {
    if (!session && pathname !== '/change-password') {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return withCookieBudget(request, NextResponse.redirect(url));
    }
    if (session && !allowed.includes(role)) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('denied', '1');
      url.searchParams.set('need', allowed.join(','));
      url.searchParams.set('role', role);
      return withCookieBudget(request, NextResponse.redirect(url));
    }
  }

  return withCookieBudget(request, NextResponse.next());
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|maplibre-dashboard).*)',
  ],
};
