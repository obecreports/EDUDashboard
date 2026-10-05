import { NextResponse, type NextRequest } from 'next/server';
import {
  AUTH_SESSION_COOKIE,
  type AuthSession,
} from '@/lib/auth/mock-users';
import { rolesForPath, type UserRole } from '@/lib/types';

function readSession(request: NextRequest): AuthSession | null {
  const raw = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as AuthSession;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const session = readSession(request);
  const role: UserRole = session?.role ?? 'global';

  // Force password change before any area except change-password / login
  if (
    session?.mustChangePassword &&
    pathname !== '/change-password' &&
    pathname !== '/login'
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/change-password';
    return NextResponse.redirect(url);
  }

  if (pathname === '/change-password' && !session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  const allowed = rolesForPath(pathname);
  if (allowed) {
    if (!session && pathname !== '/change-password') {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    if (session && !allowed.includes(role)) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('denied', '1');
      url.searchParams.set('need', allowed.join(','));
      url.searchParams.set('role', role);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|maplibre-dashboard).*)',
  ],
};
