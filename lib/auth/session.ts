import { cookies } from 'next/headers';
import type { UserProfile, UserRole } from '@/lib/types';
import { normalizeRole } from '@/lib/types';
import {
  AUTH_CREDENTIALS_COOKIE,
  AUTH_SESSION_COOKIE,
  MOCK_USER_SEEDS,
  type AuthSession,
  type CredentialsMap,
  findSeedById,
  seedCredentials,
} from '@/lib/auth/mock-users';
import {
  JSON_COOKIE_OPTS,
  parseJsonCookieValue,
  readJsonCookie,
  writeJsonCookie,
} from '@/lib/auth/cookie-json';
import {
  findUserByEmail,
  findUserById,
  readStoredUsers,
  updateUserProfileFields,
} from '@/lib/auth/user-store';
import { postLoginPath } from '@/lib/auth/scope';

async function readCredentials(): Promise<CredentialsMap> {
  const parsed = await readJsonCookie<CredentialsMap | null>(AUTH_CREDENTIALS_COOKIE, null);
  if (!parsed) return seedCredentials();
  return { ...seedCredentials(), ...parsed };
}

async function writeCredentials(map: CredentialsMap) {
  await writeJsonCookie(AUTH_CREDENTIALS_COOKIE, map);
}

export async function readAuthSession(): Promise<AuthSession | null> {
  const jar = await cookies();
  const parsed = parseJsonCookieValue<AuthSession | null>(
    jar.get(AUTH_SESSION_COOKIE)?.value,
    null
  );
  if (!parsed) return null;
  return {
    ...parsed,
    role: normalizeRole(parsed.role),
    assigned_provinces: parsed.assigned_provinces ?? [],
    assigned_districts: parsed.assigned_districts ?? [],
    reports_to: parsed.reports_to ?? null,
  };
}

async function writeAuthSession(session: AuthSession | null) {
  const jar = await cookies();
  if (!session) {
    jar.delete(AUTH_SESSION_COOKIE);
    return;
  }
  jar.set(AUTH_SESSION_COOKIE, JSON.stringify(session), JSON_COOKIE_OPTS);
}

function profileFromStored(
  session: AuthSession,
  stored: Awaited<ReturnType<typeof findUserById>>
): UserProfile {
  return {
    id: session.id,
    email: session.email,
    full_name: stored?.full_name ?? session.full_name,
    name_prefix: stored?.name_prefix ?? null,
    position: stored?.position ?? session.position,
    role: normalizeRole(stored?.role ?? session.role),
    assigned_zone: stored?.assigned_zone ?? session.assigned_zone,
    assigned_provinces: stored?.assigned_provinces ?? session.assigned_provinces ?? [],
    assigned_districts: stored?.assigned_districts ?? session.assigned_districts ?? [],
    reports_to: stored?.reports_to ?? session.reports_to ?? null,
    avatar_url: null,
    birthday: stored?.birthday ?? null,
  };
}

export async function getSessionProfile(): Promise<{
  profile: UserProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  session: AuthSession | null;
}> {
  const session = await readAuthSession();
  if (session) {
    const stored = await findUserById(session.id);
    const profile = profileFromStored(session, stored);
    return {
      profile,
      role: profile.role,
      isAuthenticated: true,
      mustChangePassword: session.mustChangePassword,
      session: {
        ...session,
        role: profile.role,
        assigned_zone: profile.assigned_zone,
        assigned_provinces: profile.assigned_provinces,
        assigned_districts: profile.assigned_districts,
        reports_to: profile.reports_to,
      },
    };
  }

  return {
    profile: {
      id: 'guest',
      email: null,
      full_name: 'ผู้เยี่ยมชม',
      position: null,
      role: 'guest',
      assigned_zone: null,
      assigned_provinces: [],
      assigned_districts: [],
      reports_to: null,
      avatar_url: null,
    },
    role: 'guest',
    isAuthenticated: false,
    mustChangePassword: false,
    session: null,
  };
}

export type LoginResult =
  | { ok: true; mustChangePassword: boolean; role: UserRole; redirectTo: string }
  | { ok: false; error: string };

export async function loginWithPassword(email: string, password: string): Promise<LoginResult> {
  const user = await findUserByEmail(email);
  if (!user) {
    return {
      ok: false,
      error: 'ไม่พบบัญชีผู้ใช้นี้ — ตรวจอีเมล หรือรัน migration 007 ใน Supabase',
    };
  }
  if (user.disabled) return { ok: false, error: 'บัญชีนี้ถูกปิดการใช้งาน' };
  if (normalizeRole(user.role) === 'guest') {
    return { ok: false, error: 'บัญชีผู้เยี่ยมชมไม่ต้องเข้าสู่ระบบ' };
  }

  const seed = findSeedById(user.id) ?? MOCK_USER_SEEDS.find(
    (s) => s.email.toLowerCase() === email.trim().toLowerCase()
  );
  const creds = await readCredentials();
  const state = creds[user.id] ?? {
    password: seed?.password ?? null,
    tempPassword: seed?.tempPassword ?? null,
    mustChangePassword: seed?.mustChangePassword ?? false,
  };

  const input = password.trim();
  const matchedPassword = state.password != null && state.password === input;
  const matchedTemp = state.tempPassword != null && state.tempPassword === input;

  if (!matchedPassword && !matchedTemp) {
    return { ok: false, error: 'รหัสผ่านไม่ถูกต้อง' };
  }

  const role = normalizeRole(user.role);
  const session: AuthSession = {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    position: user.position,
    role,
    assigned_zone: user.assigned_zone,
    assigned_provinces: user.assigned_provinces ?? [],
    assigned_districts: user.assigned_districts ?? [],
    reports_to: user.reports_to ?? null,
    mustChangePassword: matchedTemp || Boolean(state.mustChangePassword),
    authVia: matchedTemp ? 'temp' : 'password',
  };

  await writeAuthSession(session);

  // Drop bloated mock data cookies — UAT reads schedule/reports from Supabase
  try {
    const { clearPurgeableDataCookies } = await import('@/lib/auth/cookie-json');
    await clearPurgeableDataCookies();
  } catch {
    /* ignore */
  }

  return {
    ok: true,
    mustChangePassword: session.mustChangePassword,
    role,
    redirectTo: postLoginPath(role),
  };
}

export type ChangePasswordResult = { ok: true } | { ok: false; error: string };

export async function changePasswordForced(nextPassword: string): Promise<ChangePasswordResult> {
  const session = await readAuthSession();
  if (!session) return { ok: false, error: 'กรุณาเข้าสู่ระบบก่อน' };

  if (!session.mustChangePassword && session.authVia !== 'temp') {
    return { ok: false, error: 'ไม่สามารถตั้งรหัสผ่านในโหมดนี้' };
  }

  if (nextPassword.trim().length < 8) {
    return { ok: false, error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' };
  }

  const creds = await readCredentials();
  const state = creds[session.id] ?? {
    password: null,
    tempPassword: null,
    mustChangePassword: true,
  };

  const next = nextPassword.trim();
  if (next === state.password || next === state.tempPassword) {
    return { ok: false, error: 'รหัสผ่านใหม่ต้องแตกต่างจากรหัสเดิม' };
  }

  creds[session.id] = {
    password: next,
    tempPassword: null,
    mustChangePassword: false,
  };
  await writeCredentials(creds);
  await writeAuthSession({
    ...session,
    mustChangePassword: false,
    authVia: 'password',
  });

  return { ok: true };
}

export async function changePassword(
  currentOrTemp: string,
  nextPassword: string
): Promise<ChangePasswordResult> {
  const session = await readAuthSession();
  if (!session) return { ok: false, error: 'กรุณาเข้าสู่ระบบก่อน' };

  if (nextPassword.trim().length < 8) {
    return { ok: false, error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' };
  }

  const creds = await readCredentials();
  const state = creds[session.id];
  if (!state) return { ok: false, error: 'ไม่พบข้อมูลบัญชี' };

  const input = currentOrTemp.trim();
  const okCurrent =
    (state.password != null && state.password === input) ||
    (state.tempPassword != null && state.tempPassword === input);

  if (!okCurrent) {
    return { ok: false, error: 'รหัสผ่านปัจจุบัน / OTP ไม่ถูกต้อง' };
  }

  if (nextPassword.trim() === state.password || nextPassword.trim() === state.tempPassword) {
    return { ok: false, error: 'รหัสผ่านใหม่ต้องแตกต่างจากรหัสเดิม' };
  }

  creds[session.id] = {
    password: nextPassword.trim(),
    tempPassword: null,
    mustChangePassword: false,
  };
  await writeCredentials(creds);
  await writeAuthSession({
    ...session,
    mustChangePassword: false,
    authVia: 'password',
  });

  return { ok: true };
}

/** @deprecated self-serve zones removed — admin assigns via /admin/assignments */
export async function updateAssignedZones(_zones: string[]): Promise<ChangePasswordResult> {
  return { ok: false, error: 'การมอบหมายพื้นที่ทำได้เฉพาะผู้ดูแลระบบเท่านั้น' };
}

export async function adminAssignGeo(
  userId: string,
  input: {
    provinces?: string[];
    /** Staff: Gov_Domain area_ids (legacy may still be province|district) */
    districts?: string[];
    /** Provinces covered by staff areas (for hierarchy linking) */
    staffAreaProvinces?: string[];
  }
): Promise<ChangePasswordResult> {
  const session = await readAuthSession();
  if (!session) return { ok: false, error: 'กรุณาเข้าสู่ระบบก่อน' };
  const role = normalizeRole(session.role);
  if (role !== 'admin' && role !== 'super_admin') {
    return { ok: false, error: 'ไม่มีสิทธิ์มอบหมายพื้นที่' };
  }

  const user = await findUserById(userId);
  if (!user) return { ok: false, error: 'ไม่พบผู้ใช้' };

  const patch: Parameters<typeof updateUserProfileFields>[1] = {};
  if (input.provinces) {
    patch.assigned_provinces = [...new Set(input.provinces.map((p) => p.trim()).filter(Boolean))];
  }
  if (input.districts) {
    patch.assigned_districts = [...new Set(input.districts.map((d) => d.trim()).filter(Boolean))];
  }

  // Domain hierarchy: staff areas → overseer who owns overlapping province
  const nextDistricts = patch.assigned_districts ?? user.assigned_districts;
  if (normalizeRole(user.role) === 'staff' && nextDistricts.length > 0) {
    const provincesFromAreas = [
      ...new Set(
        (input.staffAreaProvinces ?? []).concat(
          nextDistricts
            .filter((d) => d.includes('|'))
            .map((d) => d.split('|')[0]?.trim())
            .filter(Boolean) as string[]
        )
      ),
    ];
    if (provincesFromAreas.length > 0) {
      const all = await readStoredUsers();
      const overseer = all.find(
        (u) =>
          normalizeRole(u.role) === 'overseer' &&
          !u.disabled &&
          provincesFromAreas.some((p) => u.assigned_provinces.includes(p))
      );
      if (overseer) patch.reports_to = overseer.id;
    }
  }

  const result = await updateUserProfileFields(userId, patch);
  if (!result.ok) return result;

  // When overseer provinces change, re-link staff under those provinces
  if (normalizeRole(user.role) === 'overseer' && patch.assigned_provinces) {
    const provinces = new Set(patch.assigned_provinces);
    const all = await readStoredUsers();
    let areaProvinceMap: Map<string, string[]> | null = null;
    try {
      const { fetchSchools } = await import('@/lib/supabase/schools');
      const schools = await fetchSchools().catch(() => []);
      areaProvinceMap = new Map();
      for (const s of schools) {
        const aid = s.area_id != null ? String(s.area_id) : '';
        const p = s.province?.trim();
        if (!aid || !p) continue;
        const list = areaProvinceMap.get(aid) ?? [];
        if (!list.includes(p)) list.push(p);
        areaProvinceMap.set(aid, list);
      }
    } catch {
      areaProvinceMap = null;
    }

    for (const staff of all) {
      if (normalizeRole(staff.role) !== 'staff' || staff.disabled) continue;
      const staffProvinces = new Set<string>();
      for (const d of staff.assigned_districts) {
        if (d.includes('|')) {
          const p = d.split('|')[0]?.trim();
          if (p) staffProvinces.add(p);
        } else if (areaProvinceMap) {
          for (const p of areaProvinceMap.get(d) ?? []) staffProvinces.add(p);
        }
      }
      const underThis = [...staffProvinces].some((p) => provinces.has(p));
      if (underThis && staff.reports_to !== userId) {
        await updateUserProfileFields(staff.id, { reports_to: userId });
      }
    }
  }

  return { ok: true };
}

export async function adminSetReportsTo(
  userId: string,
  reportsTo: string | null
): Promise<ChangePasswordResult> {
  const session = await readAuthSession();
  if (!session) return { ok: false, error: 'กรุณาเข้าสู่ระบบก่อน' };
  const role = normalizeRole(session.role);
  if (role !== 'admin' && role !== 'super_admin') {
    return { ok: false, error: 'ไม่มีสิทธิ์ตั้งสายบังคับบัญชา' };
  }
  if (reportsTo) {
    const boss = await findUserById(reportsTo);
    if (!boss) return { ok: false, error: 'ไม่พบหัวหน้า' };
  }
  return updateUserProfileFields(userId, { reports_to: reportsTo });
}

export async function issueTemporaryPassword(
  userId: string,
  tempPassword: string,
  options?: { clearPermanent?: boolean }
): Promise<ChangePasswordResult> {
  const user = await findUserById(userId);
  if (!user) return { ok: false, error: 'ไม่พบผู้ใช้' };

  const seed = findSeedById(userId);
  const creds = await readCredentials();
  const prev = creds[userId] ?? {
    password: seed?.password ?? null,
    tempPassword: seed?.tempPassword ?? null,
    mustChangePassword: seed?.mustChangePassword ?? false,
  };

  creds[userId] = {
    password: options?.clearPermanent ? null : prev.password,
    tempPassword: tempPassword.trim(),
    mustChangePassword: true,
  };
  await writeCredentials(creds);
  return { ok: true };
}

export async function registerUserCredentials(userId: string, tempPassword: string) {
  const creds = await readCredentials();
  creds[userId] = {
    password: null,
    tempPassword: tempPassword.trim(),
    mustChangePassword: true,
  };
  await writeCredentials(creds);
}

export async function logoutSession() {
  await writeAuthSession(null);
  // Drop mock data cookies so logout/navigation is not blocked by 431 header limits
  const { clearPurgeableDataCookies } = await import('@/lib/auth/cookie-json');
  await clearPurgeableDataCookies();
}

export async function listMockAccountsForAdmin() {
  const creds = await readCredentials();
  const users = await readStoredUsers();
  return users.map((u) => {
    const c = creds[u.id];
    return {
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      name_prefix: u.name_prefix ?? null,
      position: u.position,
      role: u.role,
      assigned_zone: u.assigned_zone,
      assigned_provinces: u.assigned_provinces,
      assigned_districts: u.assigned_districts,
      reports_to: u.reports_to,
      disabled: Boolean(u.disabled),
      hasPassword: Boolean(c?.password),
      hasTempPassword: Boolean(c?.tempPassword),
      mustChangePassword: Boolean(c?.mustChangePassword),
      hintPassword: c?.password ?? null,
      hintTemp: c?.tempPassword ?? null,
      status: u.disabled ? ('disabled' as const) : ('active' as const),
    };
  });
}

export { MOCK_USER_SEEDS, postLoginPath };
