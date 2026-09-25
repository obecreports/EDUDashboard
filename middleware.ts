import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { rolesForPath, type UserRole } from '@/lib/types';

const DEMO_ROLE_COOKIE = 'coned-demo-role';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: UserRole = 'global';

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.role) role = profile.role as UserRole;
  } else {
    const demo = request.cookies.get(DEMO_ROLE_COOKIE)?.value;
    if (demo === 'staff' || demo === 'overseer' || demo === 'admin' || demo === 'global') {
      role = demo;
    }
  }

  const pathname = request.nextUrl.pathname;
  const allowed = rolesForPath(pathname);

  if (allowed && !allowed.includes(role)) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('denied', '1');
    url.searchParams.set('need', allowed.join(','));
    url.searchParams.set('role', role);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/staff/:path*',
    '/overseer/:path*',
    '/admin/:path*',
    '/manage-schools',
    '/manage-schools/:path*',
  ],
};
