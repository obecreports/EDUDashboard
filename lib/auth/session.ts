import { cookies } from 'next/headers';
import type { UserProfile, UserRole } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';

const DEMO_ROLE_COOKIE = 'coned-demo-role';

/**
 * Resolve active role:
 * 1) Authenticated user_profiles.role
 * 2) Demo cookie (for local RBAC testing without Auth)
 * 3) Fallback 'global'
 */
export async function getSessionProfile(): Promise<{
  profile: UserProfile | null;
  role: UserRole;
  isDemo: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      return {
        profile: profile as UserProfile,
        role: (profile.role as UserRole) || 'global',
        isDemo: false,
      };
    }

    return {
      profile: {
        id: user.id,
        email: user.email ?? null,
        full_name: user.email ?? 'User',
        position: null,
        role: 'global',
        assigned_zone: null,
        avatar_url: null,
      },
      role: 'global',
      isDemo: false,
    };
  }

  const jar = cookies();
  const demo = jar.get(DEMO_ROLE_COOKIE)?.value as UserRole | undefined;
  const role: UserRole =
    demo === 'staff' || demo === 'overseer' || demo === 'admin' || demo === 'global'
      ? demo
      : 'global';

  return {
    profile: {
      id: 'demo',
      email: null,
      full_name: role === 'global' ? 'ผู้เยี่ยมชม' : `Demo ${role}`,
      position: null,
      role,
      assigned_zone: role === 'staff' ? 'DEMO-ZONE' : null,
      avatar_url: null,
    },
    role,
    isDemo: true,
  };
}

export { DEMO_ROLE_COOKIE };
