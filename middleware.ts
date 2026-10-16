import { NextResponse, type NextRequest } from 'next/server';
import {
  AUTH_SESSION_COOKIE,
  idleTimeoutMs,
  type AuthSession,
} from '@/lib/auth/mock-users';
import { parseJsonCookieValue } from '@/lib/auth/cookie-json-parse';
import {
  COOKIE_HEADER_SOFT_LIMIT,
  expireCookies,
  planCookiePurge,
} from '@/lib/auth/cookie-budget';
import { normalizeRole, rolesForPath, type UserRole } from '@/lib/types';
import { postLoginPath } from '@/lib/auth/scope';

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

function touchSessionCookie(response: NextResponse, session: AuthSession): void {
  const next: AuthSession = { ...session, lastActiveAt: Date.now() };
  const maxAge = Math.ceil(idleTimeoutMs(next.role) / 1000);
  response.cookies.set(AUTH_SESSION_COOKIE, JSON.stringify(next), {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    maxAge,
  });
}

function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(AUTH_SESSION_COOKIE, '', { path: '/', maxAge: 0 });
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  let session = readSession(request);
  const now = Date.now();

  // Idle timeout: expire session if no activity within role window
  if (session) {
    const limit = idleTimeoutMs(session.role);
    const last = session.lastActiveAt ?? 0;
    if (last > 0 && now - last > limit) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      if (pathname !== '/login' && pathname !== '/') {
        url.searchParams.set('next', pathname);
      }
      url.searchParams.set('timeout', '1');
      const res = NextResponse.redirect(url);
      clearSessionCookie(res);
      return withCookieBudget(request, res);
    }
    // Legacy cookies without lastActiveAt — treat as fresh activity
    if (!last) {
      session = { ...session, lastActiveAt: now };
    }
  }

  const role: UserRole = session ? normalizeRole(session.role) : 'guest';

  // Authenticated visit to home or login → land on role home (dashboard for field)
  if (session && (pathname === '/' || pathname === '/login')) {
    const url = request.nextUrl.clone();
    url.pathname = postLoginPath(role);
    url.search = '';
    const res = NextResponse.redirect(url);
    touchSessionCookie(res, session);
    return withCookieBudget(request, res);
  }

  if (
    session?.mustChangePassword &&
    pathname !== '/change-password' &&
    pathname !== '/login'
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/change-password';
    const res = NextResponse.redirect(url);
    touchSessionCookie(res, session);
    return withCookieBudget(request, res);
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
    const res = NextResponse.redirect(url);
    if (session) touchSessionCookie(res, session);
    return withCookieBudget(request, res);
  }
  if (pathname === '/staff/calendar') {
    const url = request.nextUrl.clone();
    url.pathname = '/calendar';
    const res = NextResponse.redirect(url);
    if (session) touchSessionCookie(res, session);
    return withCookieBudget(request, res);
  }
  if (pathname === '/staff/reports') {
    const url = request.nextUrl.clone();
    url.pathname = '/reports';
    const res = NextResponse.redirect(url);
    if (session) touchSessionCookie(res, session);
    return withCookieBudget(request, res);
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
      url.pathname = postLoginPath(role);
      url.search = '';
      const res = NextResponse.redirect(url);
      touchSessionCookie(res, session);
      return withCookieBudget(request, res);
    }
  }

  const res = NextResponse.next();
  if (session) touchSessionCookie(res, session);
  return withCookieBudget(request, res);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|maplibre-dashboard).*)',
  ],
};
