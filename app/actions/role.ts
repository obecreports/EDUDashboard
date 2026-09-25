'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { UserRole } from '@/lib/types';
import { DEMO_ROLE_COOKIE } from '@/lib/auth/session';

export async function setDemoRole(role: UserRole) {
  const jar = cookies();
  jar.set(DEMO_ROLE_COOKIE, role, {
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath('/', 'layout');
}
