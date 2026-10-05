'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  getSessionProfile,
  issueTemporaryPassword,
  registerUserCredentials,
} from '@/lib/auth/session';
import {
  createMockUser,
  readHeroSettings,
  setUserDisabled,
  writeHeroSettings,
} from '@/lib/auth/user-store';
import type { UserRole } from '@/lib/types';

function requireAdmin() {
  return getSessionProfile().then(({ profile, isAuthenticated }) => {
    if (!isAuthenticated || profile?.role !== 'admin') {
      return { ok: false as const, error: 'ต้องเป็น Admin ที่ล็อกอินแล้ว' };
    }
    return { ok: true as const, profile };
  });
}

export async function saveSiteSettings(formData: FormData) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const next = {
    site_title: String(formData.get('site_title') || ''),
    hero_title: String(formData.get('hero_title') || ''),
    hero_subtitle: String(formData.get('hero_subtitle') || ''),
    hero_bg_url: String(formData.get('hero_bg_url') || '').trim(),
  };

  // Cookie store so mock admin can update hero without Supabase Auth
  writeHeroSettings(next);

  try {
    const supabase = await createClient();
    const rows = [
      { key: 'site_title', value: next.site_title },
      { key: 'hero_title', value: next.hero_title },
      { key: 'hero_subtitle', value: next.hero_subtitle },
      { key: 'hero_text', value: next.hero_subtitle },
      { key: 'hero_bg_url', value: next.hero_bg_url },
    ];
    for (const row of rows) {
      await supabase.from('site_settings').upsert({
        key: row.key,
        value: row.value,
        updated_by: gate.profile.id.startsWith('mock-') ? null : gate.profile.id,
        updated_at: new Date().toISOString(),
      });
    }
  } catch {
    /* cookie is source of truth for mock */
  }

  revalidatePath('/');
  revalidatePath('/admin/settings');
  return { ok: true as const };
}

export async function updateAccountRole(formData: FormData) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const id = String(formData.get('id'));
  const role = String(formData.get('role')) as UserRole;

  if (id.startsWith('mock-') || id.startsWith('mock-user-')) {
    const { updateUserProfileFields } = await import('@/lib/auth/user-store');
    const result = updateUserProfileFields(id, { role });
    if (!result.ok) return result;
    revalidatePath('/admin/accounts');
    revalidatePath('/admin/settings');
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('user_profiles').update({ role }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/settings');
  revalidatePath('/admin/accounts');
  return { ok: true };
}

export async function createAccountAction(formData: FormData) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const full_name = String(formData.get('full_name') || '');
  const position = String(formData.get('position') || '');
  const role = String(formData.get('role') || 'staff') as UserRole;
  const email = String(formData.get('email') || '') || undefined;

  const created = createMockUser({ full_name, position, role, email });
  if (!created.ok) return created;

  registerUserCredentials(created.user.id, created.tempPassword);
  revalidatePath('/admin/accounts');
  return {
    ok: true as const,
    email: created.user.email,
    tempPassword: created.tempPassword,
  };
}

export async function toggleAccountStatusAction(formData: FormData) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const id = String(formData.get('id') || '');
  const disabled = String(formData.get('disabled') || '') === '1';
  const result = setUserDisabled(id, disabled);
  if (!result.ok) return result;
  revalidatePath('/admin/accounts');
  return { ok: true };
}

export async function generateOtpForUserAction(formData: FormData) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const userId = String(formData.get('userId') || '');
  const temp =
    String(formData.get('tempPassword') || '').trim() ||
    `Temp${Math.random().toString(36).slice(2, 8)}`;
  const clearPermanent = formData.get('clearPermanent') === '1';
  const result = issueTemporaryPassword(userId, temp, { clearPermanent });
  if (!result.ok) return result;
  revalidatePath('/admin/accounts');
  revalidatePath('/admin/settings');
  return { ok: true as const, tempPassword: temp };
}

export async function getHeroSettingsAction() {
  return readHeroSettings();
}
