import { createClient } from '@/lib/supabase/server';
import {
  normalizeStoredUser,
  type StoredUserProfile,
} from '@/lib/auth/mock-users';
import { normalizeRole, type UserRole } from '@/lib/types';

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  name_prefix?: string | null;
  position: string | null;
  role: string | null;
  assigned_zone: string | null;
  assigned_provinces?: string[] | null;
  assigned_districts?: string[] | null;
  reports_to?: string | null;
  disabled?: boolean | null;
  birthday?: string | null;
  must_change_password?: boolean | null;
};

function mapRow(row: ProfileRow): StoredUserProfile {
  return normalizeStoredUser({
    id: row.id,
    email: row.email ?? `${row.id}@coned.local`,
    full_name: row.full_name ?? 'ผู้ใช้',
    name_prefix: row.name_prefix ?? null,
    position: row.position ?? '',
    role: normalizeRole((row.role ?? 'staff') as UserRole),
    assigned_zone: row.assigned_zone,
    assigned_provinces: row.assigned_provinces ?? [],
    assigned_districts: row.assigned_districts ?? [],
    reports_to: row.reports_to ?? null,
    disabled: Boolean(row.disabled),
    birthday: row.birthday ?? null,
  });
}

const PROFILE_SELECT =
  'id, email, full_name, name_prefix, position, role, assigned_zone, assigned_provinces, assigned_districts, reports_to, disabled, birthday, must_change_password';

export async function fetchAllUserProfiles(): Promise<StoredUserProfile[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select(PROFILE_SELECT)
      .order('full_name', { ascending: true });
    if (error || !data) return [];
    return (data as ProfileRow[]).map(mapRow);
  } catch {
    return [];
  }
}

export async function fetchUserProfileById(
  id: string
): Promise<StoredUserProfile | null> {
  if (!id) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select(PROFILE_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return mapRow(data as ProfileRow);
  } catch {
    return null;
  }
}

export async function fetchUserProfileByEmail(
  email: string
): Promise<StoredUserProfile | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select(PROFILE_SELECT)
      .ilike('email', normalized)
      .maybeSingle();
    if (error || !data) return null;
    return mapRow(data as ProfileRow);
  } catch {
    return null;
  }
}

export async function updateUserProfileInDb(
  userId: string,
  patch: Partial<{
    full_name: string;
    name_prefix: string | null;
    position: string;
    role: UserRole;
    assigned_zone: string | null;
    assigned_provinces: string[];
    assigned_districts: string[];
    reports_to: string | null;
    disabled: boolean;
    birthday: string | null;
    must_change_password: boolean;
  }>
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const body: Record<string, unknown> = {};
    if (patch.full_name !== undefined) body.full_name = patch.full_name;
    if (patch.name_prefix !== undefined) body.name_prefix = patch.name_prefix;
    if (patch.position !== undefined) body.position = patch.position;
    if (patch.role !== undefined) body.role = normalizeRole(patch.role);
    if (patch.assigned_zone !== undefined) body.assigned_zone = patch.assigned_zone;
    if (patch.assigned_provinces !== undefined) {
      body.assigned_provinces = patch.assigned_provinces;
    }
    if (patch.assigned_districts !== undefined) {
      body.assigned_districts = patch.assigned_districts;
    }
    if (patch.reports_to !== undefined) body.reports_to = patch.reports_to;
    if (patch.disabled !== undefined) body.disabled = patch.disabled;
    if (patch.birthday !== undefined) body.birthday = patch.birthday;
    if (patch.must_change_password !== undefined) {
      body.must_change_password = patch.must_change_password;
    }

    if (!Object.keys(body).length) return { ok: true };

    const { data, error } = await supabase
      .from('user_profiles')
      .update(body)
      .eq('id', userId)
      .select('id, assigned_provinces, assigned_districts, reports_to')
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!data) {
      return {
        ok: false,
        error:
          'บันทึกไม่สำเร็จ (RLS/สิทธิ์) — รัน migration 008_uat_profiles_rls.sql ใน Supabase',
      };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'อัปเดตโปรไฟล์ไม่สำเร็จ' };
  }
}
