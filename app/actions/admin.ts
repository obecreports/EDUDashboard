'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  getSessionProfile,
  issueTemporaryPassword,
  registerInitialPassword,
} from '@/lib/auth/session';
import {
  createMockUser,
  readHeroSettings,
  setUserDisabled,
  writeHeroSettings,
} from '@/lib/auth/user-store';
import type { UserRole } from '@/lib/types';
import { normalizeRole } from '@/lib/types';
import { isAdminRole } from '@/lib/auth/scope';
import {
  adminAssignGeo,
  adminSetReportsTo,
} from '@/lib/auth/session';

function requireAdmin() {
  return getSessionProfile().then(({ profile, isAuthenticated }) => {
    if (!isAuthenticated || !profile || !isAdminRole(normalizeRole(profile.role))) {
      return { ok: false as const, error: 'ต้องเป็น Admin ที่ล็อกอินแล้ว' };
    }
    return { ok: true as const, profile };
  });
}

export async function saveSiteSettings(formData: FormData) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;
  if (normalizeRole(gate.profile.role) !== 'super_admin') {
    return { ok: false as const, error: 'เฉพาะ Super Admin' };
  }

  const next = {
    site_title: String(formData.get('site_title') || ''),
    hero_title: String(formData.get('hero_title') || ''),
    hero_subtitle: String(formData.get('hero_subtitle') || ''),
    hero_bg_url: String(formData.get('hero_bg_url') || '').trim(),
  };

  // Cookie store so mock admin can update hero without Supabase Auth
  await writeHeroSettings(next);

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

function canActorManageTarget(
  actorRole: UserRole,
  actorId: string,
  targetRole: UserRole,
  targetId: string
) {
  if (actorRole === 'super_admin') return true;
  if (actorRole !== 'admin') return false;
  if (targetId === actorId) return true;
  return targetRole !== 'admin' && targetRole !== 'super_admin';
}

export async function updateAccountRole(formData: FormData) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const id = String(formData.get('id'));
  const role = normalizeRole(String(formData.get('role'))) as UserRole;
  const { findUserById } = await import('@/lib/auth/user-store');
  const target = await findUserById(id);
  if (!target) return { ok: false as const, error: 'ไม่พบผู้ใช้' };
  if (
    !canActorManageTarget(
      normalizeRole(gate.profile.role),
      gate.profile.id,
      normalizeRole(target.role),
      target.id
    )
  ) {
    return { ok: false as const, error: 'ไม่มีสิทธิ์จัดการบัญชีนี้' };
  }

  if (id.startsWith('mock-') || id.startsWith('mock-user-')) {
    const { updateUserProfileFields } = await import('@/lib/auth/user-store');
    const result = await updateUserProfileFields(id, { role });
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

export async function updateAdminUserAction(formData: FormData): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const id = String(formData.get('id') || '');
  const full_name = String(formData.get('full_name') || '').trim();
  const name_prefix = String(formData.get('name_prefix') || '').trim();
  const position = String(formData.get('position') || '').trim();
  const role = normalizeRole(String(formData.get('role') || 'staff'));

  if (!id || !full_name || !position) {
    return { ok: false, error: 'กรุณากรอกชื่อและตำแหน่ง' };
  }

  const { findUserById, updateUserProfileFields } = await import('@/lib/auth/user-store');
  const target = await findUserById(id);
  if (!target) return { ok: false, error: 'ไม่พบผู้ใช้' };

  const actorRole = normalizeRole(gate.profile.role);
  if (!canActorManageTarget(actorRole, gate.profile.id, normalizeRole(target.role), target.id)) {
    return { ok: false, error: 'ไม่มีสิทธิ์จัดการบัญชีนี้' };
  }

  // Regular admin cannot promote to admin / super_admin
  if (
    actorRole === 'admin' &&
    (role === 'admin' || role === 'super_admin') &&
    id !== gate.profile.id
  ) {
    return { ok: false, error: 'Admin ไม่สามารถตั้งบทบาท Admin / Super Admin ได้' };
  }

  const result = await updateUserProfileFields(id, {
    full_name,
    name_prefix: name_prefix || null,
    position,
    role: id === gate.profile.id ? target.role : role,
  });
  if (!result.ok) return result;
  revalidatePath('/admin/accounts');
  return { ok: true };
}

export async function createAccountAction(formData: FormData) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const full_name = String(formData.get('full_name') || '');
  const position = String(formData.get('position') || '');
  const role = normalizeRole(String(formData.get('role') || 'staff')) as UserRole;
  const email = String(formData.get('email') || '') || undefined;

  if (
    normalizeRole(gate.profile.role) === 'admin' &&
    (role === 'admin' || role === 'super_admin')
  ) {
    return { ok: false as const, error: 'Admin ไม่สามารถสร้างบัญชี Admin / Super Admin ได้' };
  }

  const created = await createMockUser({ full_name, position, role, email });
  if (!created.ok) return created;

  await registerInitialPassword(created.user.id, created.tempPassword);
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
  if (id === gate.profile.id) {
    return { ok: false as const, error: 'ไม่สามารถปิดใช้งานบัญชีตนเองได้' };
  }
  const { findUserById } = await import('@/lib/auth/user-store');
  const target = await findUserById(id);
  if (!target) return { ok: false as const, error: 'ไม่พบผู้ใช้' };
  if (
    !canActorManageTarget(
      normalizeRole(gate.profile.role),
      gate.profile.id,
      normalizeRole(target.role),
      target.id
    )
  ) {
    return { ok: false as const, error: 'ไม่มีสิทธิ์จัดการบัญชีนี้' };
  }

  const disabled = String(formData.get('disabled') || '') === '1';
  const result = await setUserDisabled(id, disabled);
  if (!result.ok) return result;
  revalidatePath('/admin/accounts');
  return { ok: true };
}

export async function generateOtpForUserAction(formData: FormData) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const userId = String(formData.get('userId') || '');
  const { findUserById } = await import('@/lib/auth/user-store');
  const target = await findUserById(userId);
  if (!target) return { ok: false as const, error: 'ไม่พบผู้ใช้' };
  if (
    !canActorManageTarget(
      normalizeRole(gate.profile.role),
      gate.profile.id,
      normalizeRole(target.role),
      target.id
    )
  ) {
    return { ok: false as const, error: 'ไม่มีสิทธิ์จัดการบัญชีนี้' };
  }

  const temp =
    String(formData.get('tempPassword') || '').trim() ||
    `Temp${Math.random().toString(36).slice(2, 8)}`;
  // OTP / forgot-password always clears permanent password → first-login invent-password flow
  const result = await issueTemporaryPassword(userId, temp, { clearPermanent: true });
  if (!result.ok) return result;
  revalidatePath('/admin/accounts');
  revalidatePath('/admin/settings');
  return { ok: true as const, tempPassword: temp };
}

export async function getHeroSettingsAction() {
  return await readHeroSettings();
}

export async function assignGeoAction(formData: FormData) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const userId = String(formData.get('userId') || '');
  const provincesRaw = String(formData.get('provinces') || '[]');
  const districtsRaw = String(formData.get('districts') || '[]');
  let provinces: string[] = [];
  let districts: string[] = [];
  try {
    provinces = JSON.parse(provincesRaw) as string[];
    districts = JSON.parse(districtsRaw) as string[];
  } catch {
    return { ok: false as const, error: 'รูปแบบข้อมูลไม่ถูกต้อง' };
  }

  // Staff districts field now stores Gov_Domain area_ids — resolve provinces for hierarchy
  let staffAreaProvinces: string[] | undefined;
  if (districts.length > 0) {
    const { fetchSchools } = await import('@/lib/supabase/schools');
    const schools = await fetchSchools().catch(() => []);
    const areaSet = new Set(districts.map(String));
    staffAreaProvinces = [
      ...new Set(
        schools
          .filter(
            (s) =>
              (s.area_id != null && areaSet.has(String(s.area_id))) ||
              (s.area_name && areaSet.has(s.area_name))
          )
          .map((s) => s.province?.trim())
          .filter(Boolean) as string[]
      ),
    ];
  }

  const tierRaw = String(formData.get('overseerTier') || '').trim();
  const overseerTier =
    tierRaw === 'type1' || tierRaw === 'type2' ? tierRaw : undefined;

  const result = await adminAssignGeo(userId, {
    provinces,
    districts,
    staffAreaProvinces,
    overseerTier,
  });
  if (!result.ok) return { ok: false as const, error: result.error };
  revalidatePath('/admin/domain');
  revalidatePath('/admin/assignments');
  revalidatePath('/admin/org-map');
  revalidatePath('/dashboard');
  revalidatePath('/calendar');
  revalidatePath('/staff/profile');
  return { ok: true as const };
}

export async function setReportsToAction(formData: FormData) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const userId = String(formData.get('userId') || '');
  const reportsToRaw = String(formData.get('reportsTo') || '').trim();
  const reportsTo = reportsToRaw || null;
  const result = await adminSetReportsTo(userId, reportsTo);
  if (!result.ok) return { ok: false as const, error: result.error };
  revalidatePath('/admin/domain');
  revalidatePath('/admin/org-map');
  revalidatePath('/calendar');
  return { ok: true as const };
}
