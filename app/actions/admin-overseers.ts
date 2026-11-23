'use server';

import { revalidatePath } from 'next/cache';
import { getSessionProfile } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/auth/scope';
import { isOverseerType1, normalizeRole } from '@/lib/types';
import { fetchUserProfileById } from '@/lib/supabase/profiles';
import { updateUserProfileFields } from '@/lib/auth/user-store';
import type { StoredUserProfile } from '@/lib/auth/mock-users';

/** Type 1 OS or covert_overseer — About / admin display management */
function isDisplayOverseer(
  user: Pick<StoredUserProfile, 'role' | 'overseer_tier'>
): boolean {
  const r = normalizeRole(user.role);
  if (r === 'covert_overseer') return true;
  return isOverseerType1(user.role, user.overseer_tier);
}

async function requireAdmin() {
  const { profile, isAuthenticated } = await getSessionProfile();
  if (!isAuthenticated || !profile || !isAdminRole(normalizeRole(profile.role))) {
    return { ok: false as const, error: 'ต้องเป็น Admin ที่ล็อกอินแล้ว' };
  }
  return { ok: true as const, profile };
}

function revalidateOverseerPaths(userId?: string) {
  revalidatePath('/about');
  revalidatePath('/admin/overseers');
  revalidatePath('/dashboard');
  if (userId) {
    revalidatePath(`/admin/overseers/${userId}/edit`);
  }
}

export async function updateOverseerDisplayAction(formData: FormData): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const userId = String(formData.get('user_id') || '').trim();
  if (!userId) return { ok: false, error: 'ไม่พบรหัสองคมนตรี' };

  const existing = await fetchUserProfileById(userId);
  if (!existing) return { ok: false, error: 'ไม่พบผู้ใช้' };
  if (!isDisplayOverseer(existing)) {
    return { ok: false, error: 'บัญชีนี้ไม่ใช่องคมนตรี / องคมนตรี (อิสระ)' };
  }

  const namePrefix = String(formData.get('name_prefix') || '').trim() || null;
  const fullName = String(formData.get('full_name') || '').trim();
  const position = String(formData.get('position') || '').trim();
  if (!fullName) return { ok: false, error: 'กรุณาระบุชื่อ-นามสกุล' };

  const patch = {
    name_prefix: namePrefix,
    full_name: fullName,
    position,
  };

  const res = await updateUserProfileFields(userId, patch);
  if (!res.ok) return res;

  revalidateOverseerPaths(userId);
  return { ok: true };
}

/** Persist drag-order of overseers shown on About / admin list. */
export async function saveOverseerDisplayOrderAction(
  orderedIds: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const ids = [
    ...new Set(
      (Array.isArray(orderedIds) ? orderedIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean)
    ),
  ];

  for (const id of ids) {
    const existing = await fetchUserProfileById(id);
    if (!existing || !isDisplayOverseer(existing)) {
      return { ok: false, error: 'รายการมีบัญชีที่ไม่ใช่องคมนตรี' };
    }
  }

  const { upsertSiteSetting } = await import('@/lib/auth/site-settings-db');
  const { OVERSEER_DISPLAY_ORDER_KEY } = await import(
    '@/lib/auth/overseer-display-order'
  );
  const res = await upsertSiteSetting(
    OVERSEER_DISPLAY_ORDER_KEY,
    ids,
    gate.profile.id
  );
  if (!res.ok) return res;

  revalidateOverseerPaths();
  return { ok: true };
}

export async function saveOverseerPhotoAction(formData: FormData): Promise<
  { ok: true; url: string | null } | { ok: false; error: string }
> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const userId = String(formData.get('user_id') || '').trim();
  if (!userId) return { ok: false, error: 'ไม่พบรหัสองคมนตรี' };

  const existing = await fetchUserProfileById(userId);
  if (!existing) return { ok: false, error: 'ไม่พบผู้ใช้' };
  if (!isDisplayOverseer(existing)) {
    return { ok: false, error: 'บัญชีนี้ไม่ใช่องคมนตรี / องคมนตรี (อิสระ)' };
  }

  const raw = String(formData.get('avatar_url') || '').trim();
  const avatar_url = raw || null;

  const res = await updateUserProfileFields(userId, { avatar_url });
  if (!res.ok) return res;

  revalidateOverseerPaths(userId);
  return { ok: true, url: avatar_url };
}
