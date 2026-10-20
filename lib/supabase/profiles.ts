import { createClient } from '@/lib/supabase/server';
import {
  MOCK_LOGIN_PASSWORD,
  normalizeStoredUser,
  type StoredUserProfile,
} from '@/lib/auth/mock-users';
import {
  normalizeOverseerTier,
  normalizeRole,
  type OverseerTier,
  type UserRole,
} from '@/lib/types';

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  name_prefix?: string | null;
  position: string | null;
  role: string | null;
  overseer_tier?: string | null;
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
    overseer_tier: normalizeOverseerTier(row.overseer_tier),
    assigned_zone: row.assigned_zone,
    assigned_provinces: row.assigned_provinces ?? [],
    assigned_districts: row.assigned_districts ?? [],
    reports_to: row.reports_to ?? null,
    disabled: Boolean(row.disabled),
    birthday: row.birthday ?? null,
  });
}

const PROFILE_SELECT =
  'id, email, full_name, name_prefix, position, role, overseer_tier, assigned_zone, assigned_provinces, assigned_districts, reports_to, disabled, birthday, must_change_password';

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

/** Resolve short login ID (staff01, OS01, sirdawpong) or legacy email. */
export async function fetchUserProfileByLogin(
  login: string
): Promise<StoredUserProfile | null> {
  const raw = login.trim();
  if (!raw) return null;
  const local = (raw.includes('@') ? raw.split('@')[0]! : raw).trim();
  if (!local) return null;
  try {
    const supabase = await createClient();
    // Exact login ID (preferred)
    const exact = await supabase
      .from('user_profiles')
      .select(PROFILE_SELECT)
      .ilike('email', local)
      .maybeSingle();
    if (!exact.error && exact.data) return mapRow(exact.data as ProfileRow);

    // Legacy mailbox form: OS01@EDU.local / staff@coned.local
    const legacy = await supabase
      .from('user_profiles')
      .select(PROFILE_SELECT)
      .ilike('email', `${local}@%`)
      .limit(1)
      .maybeSingle();
    if (!legacy.error && legacy.data) return mapRow(legacy.data as ProfileRow);

    return null;
  } catch {
    return null;
  }
}

/** @deprecated use fetchUserProfileByLogin */
export async function fetchUserProfileByEmail(
  email: string
): Promise<StoredUserProfile | null> {
  return fetchUserProfileByLogin(email);
}

/**
 * Create user in auth.users + user_profiles via SECURITY DEFINER RPC (migration 016).
 * `loginId` is the short login (staff03, AS02) stored in user_profiles.email.
 */
export async function createUserInDb(input: {
  loginId: string;
  full_name: string;
  position: string;
  role: UserRole;
  password?: string;
  name_prefix?: string | null;
}): Promise<
  { ok: true; user: StoredUserProfile } | { ok: false; error: string }
> {
  const loginId = input.loginId.trim();
  const full_name = input.full_name.trim();
  const position = input.position.trim();
  const role = normalizeRole(input.role);
  const password =
    (input.password ?? MOCK_LOGIN_PASSWORD).trim() || MOCK_LOGIN_PASSWORD;

  if (!loginId) return { ok: false, error: 'กรุณาระบุรหัสผู้ใช้' };
  if (loginId.includes('@')) {
    return { ok: false, error: 'รหัสผู้ใช้ต้องไม่มี @ (เช่น staff03, AS02)' };
  }
  if (!full_name || !position) {
    return { ok: false, error: 'กรุณากรอกชื่อและตำแหน่ง' };
  }
  if (role === 'guest') {
    return { ok: false, error: 'ไม่สามารถสร้างบัญชี guest ได้' };
  }

  const existing = await fetchUserProfileByLogin(loginId);
  if (existing) return { ok: false, error: 'รหัสผู้ใช้นี้มีอยู่แล้ว' };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('create_coned_user', {
      p_login_id: loginId,
      p_full_name: full_name,
      p_position: position,
      p_role: role,
      p_password: password,
      p_name_prefix: input.name_prefix ?? null,
    });

    if (error) {
      const msg = error.message || 'สร้างบัญชีในฐานข้อมูลไม่สำเร็จ';
      if (/already exists|login_id already/i.test(msg)) {
        return { ok: false, error: 'รหัสผู้ใช้นี้มีอยู่แล้ว' };
      }
      if (/function .*create_coned_user.* does not exist|Could not find the function/i.test(msg)) {
        return {
          ok: false,
          error: 'ยังไม่มีฟังก์ชันสร้างผู้ใช้ — รัน migration 016_create_coned_user_rpc.sql ใน Supabase',
        };
      }
      return { ok: false, error: msg };
    }

    const id = typeof data === 'string' ? data : String(data ?? '');
    if (!id) return { ok: false, error: 'สร้างบัญชีแล้วแต่ไม่ได้รับ id' };

    const row = await fetchUserProfileById(id);
    if (!row) {
      return {
        ok: false,
        error: 'สร้างใน auth แล้ว แต่ยังไม่พบโปรไฟล์ — ตรวจ user_profiles',
      };
    }
    if (role === 'overseer') {
      await updateUserProfileInDb(id, { overseer_tier: 'type1' });
      return { ok: true, user: { ...row, overseer_tier: 'type1' } };
    }
    return { ok: true, user: row };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'สร้างบัญชีในฐานข้อมูลไม่สำเร็จ',
    };
  }
}

export async function updateUserProfileInDb(
  userId: string,
  patch: Partial<{
    full_name: string;
    name_prefix: string | null;
    position: string;
    role: UserRole;
    overseer_tier: OverseerTier | null;
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
    if (patch.overseer_tier !== undefined) {
      body.overseer_tier = normalizeOverseerTier(patch.overseer_tier);
    }
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
