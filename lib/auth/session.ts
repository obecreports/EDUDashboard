import { cookies } from 'next/headers';
import type { OverseerTier, UserProfile, UserRole } from '@/lib/types';
import {
  isOverseerLike,
  isOverseerType1,
  isVolunteerRole,
  normalizeOverseerTier,
  normalizeRole,
  ROLE_LABELS,
} from '@/lib/types';
import {
  AUTH_CREDENTIALS_COOKIE,
  AUTH_SESSION_COOKIE,
  MOCK_LOGIN_PASSWORD,
  MOCK_USER_SEEDS,
  type AuthSession,
  type CredentialsMap,
  credentialsOverridesOnly,
  findSeedById,
  idleTimeoutMs,
  seedCredentials,
} from '@/lib/auth/mock-users';
import {
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
  // Merge seeds in memory; cookie holds overrides only (see writeCredentials)
  return { ...seedCredentials(), ...parsed };
}

async function writeCredentials(map: CredentialsMap) {
  await writeJsonCookie(AUTH_CREDENTIALS_COOKIE, credentialsOverridesOnly(map));
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
    overseer_tier: normalizeOverseerTier(parsed.overseer_tier),
    assigned_provinces: parsed.assigned_provinces ?? [],
    assigned_districts: parsed.assigned_districts ?? [],
    assigned_schools: parsed.assigned_schools ?? [],
    reports_to: parsed.reports_to ?? null,
  };
}

async function writeAuthSession(session: AuthSession | null) {
  const jar = await cookies();
  if (!session) {
    jar.delete(AUTH_SESSION_COOKIE);
    return;
  }
  const next: AuthSession = {
    ...session,
    lastActiveAt: session.lastActiveAt ?? Date.now(),
  };
  const maxAge = Math.ceil(idleTimeoutMs(next.role) / 1000);
  jar.set(AUTH_SESSION_COOKIE, JSON.stringify(next), {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    maxAge,
  });
}

function profileFromStored(
  session: AuthSession,
  stored: Awaited<ReturnType<typeof findUserById>>
): UserProfile {
  const role = normalizeRole(stored?.role ?? session.role);
  const rawTier = stored?.overseer_tier ?? session.overseer_tier;
  // Keep tier only for unmigrated overseer+type2 rows; otherwise identity is role
  const overseer_tier =
    role === 'overseer' && normalizeOverseerTier(rawTier) === 'type2'
      ? ('type2' as const)
      : null;
  return {
    id: session.id,
    email: session.email,
    full_name: stored?.full_name ?? session.full_name,
    name_prefix: stored?.name_prefix ?? null,
    position: stored?.position ?? session.position,
    role,
    overseer_tier,
    assigned_zone: stored?.assigned_zone ?? session.assigned_zone,
    assigned_provinces: stored?.assigned_provinces ?? session.assigned_provinces ?? [],
    assigned_districts: stored?.assigned_districts ?? session.assigned_districts ?? [],
    assigned_schools: stored?.assigned_schools ?? session.assigned_schools ?? [],
    reports_to: stored?.reports_to ?? session.reports_to ?? null,
    avatar_url: stored?.avatar_url?.trim() || null,
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
        overseer_tier: profile.overseer_tier ?? null,
        assigned_zone: profile.assigned_zone,
        assigned_provinces: profile.assigned_provinces,
        assigned_districts: profile.assigned_districts,
        assigned_schools: profile.assigned_schools ?? [],
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
      overseer_tier: null,
      assigned_zone: null,
      assigned_provinces: [],
      assigned_districts: [],
      assigned_schools: [],
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
      error: 'ไม่พบรหัสผู้ใช้นี้ — ตรวจรหัสผู้ใช้ หรือรัน migration 014/015 ใน Supabase',
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
  const fromCookie = creds[user.id];
  // Cookie overrides (profile change-password / OTP) → seed → shared demo password
  let resolvedPassword =
    fromCookie?.password !== undefined
      ? fromCookie.password
      : (seed?.password ?? null);
  let resolvedTemp =
    fromCookie?.tempPassword !== undefined
      ? fromCookie.tempPassword
      : (seed?.tempPassword ?? null);
  const mustChangePassword = Boolean(
    fromCookie?.mustChangePassword ??
      seed?.mustChangePassword ??
      user.mustChangePassword ??
      false
  );
  if (resolvedPassword == null && resolvedTemp == null) {
    resolvedPassword = MOCK_LOGIN_PASSWORD;
  }

  const input = password.trim();
  if (!input) {
    return { ok: false, error: 'รหัสผ่านไม่ถูกต้อง' };
  }
  let matchedPassword = resolvedPassword != null && resolvedPassword === input;
  const matchedTemp = resolvedTemp != null && resolvedTemp === input;

  // DB-only: accept password stored in auth.users (after user/admin reset)
  if (!matchedPassword && !matchedTemp) {
    const { isDbOnlyMode } = await import('@/lib/auth/db-mode');
    if (isDbOnlyMode()) {
      const { verifyConedUserPasswordInDb } = await import(
        '@/lib/supabase/profiles'
      );
      matchedPassword = await verifyConedUserPasswordInDb(user.id, input);
    }
  }

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
    overseer_tier:
      role === 'overseer' && normalizeOverseerTier(user.overseer_tier) === 'type2'
        ? 'type2'
        : null,
    assigned_zone: user.assigned_zone,
    assigned_provinces: user.assigned_provinces ?? [],
    assigned_districts: user.assigned_districts ?? [],
    assigned_schools: user.assigned_schools ?? [],
    reports_to: user.reports_to ?? null,
    mustChangePassword: matchedTemp || mustChangePassword,
    authVia: matchedTemp ? 'temp' : 'password',
    lastActiveAt: Date.now(),
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

/** Cookie credentials + DB auth.users / must_change_password when DB-only. */
async function persistPasswordState(
  userId: string,
  password: string,
  mustChangePassword: boolean
): Promise<ChangePasswordResult> {
  const next = password.trim();
  const creds = await readCredentials();
  creds[userId] = {
    password: next,
    tempPassword: null,
    mustChangePassword,
  };
  await writeCredentials(creds);

  const { isDbOnlyMode } = await import('@/lib/auth/db-mode');
  if (isDbOnlyMode()) {
    const { setConedUserPasswordInDb } = await import('@/lib/supabase/profiles');
    const db = await setConedUserPasswordInDb(userId, next, mustChangePassword);
    if (!db.ok) return db;
  }

  return { ok: true };
}

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

  const persist = await persistPasswordState(session.id, next, false);
  if (!persist.ok) return persist;
  await writeAuthSession({
    ...session,
    mustChangePassword: false,
    authVia: 'password',
    lastActiveAt: Date.now(),
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
  const input = currentOrTemp.trim();
  let okCurrent =
    (state?.password != null && state.password === input) ||
    (state?.tempPassword != null && state.tempPassword === input);

  if (!okCurrent) {
    const { isDbOnlyMode } = await import('@/lib/auth/db-mode');
    if (isDbOnlyMode()) {
      const { verifyConedUserPasswordInDb } = await import('@/lib/supabase/profiles');
      okCurrent = await verifyConedUserPasswordInDb(session.id, input);
    }
  }

  if (!okCurrent) {
    return { ok: false, error: 'รหัสผ่านปัจจุบัน / OTP ไม่ถูกต้อง' };
  }

  const next = nextPassword.trim();
  if (next === state?.password || next === state?.tempPassword) {
    return { ok: false, error: 'รหัสผ่านใหม่ต้องแตกต่างจากรหัสเดิม' };
  }

  const persist = await persistPasswordState(session.id, next, false);
  if (!persist.ok) return persist;
  await writeAuthSession({
    ...session,
    mustChangePassword: false,
    authVia: 'password',
    lastActiveAt: Date.now(),
  });

  return { ok: true };
}

/**
 * Admin: reset to training default password12345 and force change on next login.
 */
export async function forceDefaultPasswordReset(
  userId: string
): Promise<ChangePasswordResult> {
  const user = await findUserById(userId);
  if (!user) return { ok: false, error: 'ไม่พบผู้ใช้' };
  return persistPasswordState(userId, MOCK_LOGIN_PASSWORD, true);
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
    /**
     * Field role for overseer-like accounts.
     * Also accepts legacy overseerTier type1|type2 and `volunteer` from older clients.
     */
    fieldRole?:
      | 'overseer'
      | 'volunteer_center'
      | 'volunteer_border'
      | 'special_volunteer'
      | 'volunteer'
      | null;
    overseerTier?: OverseerTier | null;
    /** School-admin login scope (school_id strings) */
    schools?: string[];
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

  const userRole = normalizeRole(user.role);
  const patch: Parameters<typeof updateUserProfileFields>[1] = {};

  // Map domain role draft → role identity (clear deprecated tier)
  type FieldRoleNext =
    | 'overseer'
    | 'volunteer_center'
    | 'volunteer_border'
    | 'special_volunteer';
  let nextFieldRole: FieldRoleNext | null = null;
  if (
    input.fieldRole === 'overseer' ||
    input.fieldRole === 'volunteer_center' ||
    input.fieldRole === 'volunteer_border' ||
    input.fieldRole === 'special_volunteer'
  ) {
    nextFieldRole = input.fieldRole;
  } else if (input.fieldRole === 'volunteer') {
    nextFieldRole = 'volunteer_border';
  } else if (input.overseerTier === 'type2') {
    nextFieldRole = 'volunteer_border';
  } else if (input.overseerTier === 'type1') {
    nextFieldRole = 'overseer';
  }
  if (nextFieldRole && (userRole === 'overseer' || isOverseerLike(userRole))) {
    patch.role = nextFieldRole;
    patch.overseer_tier = null;
    if (nextFieldRole === 'volunteer_center') {
      patch.position = ROLE_LABELS.volunteer_center;
    } else if (nextFieldRole === 'volunteer_border') {
      patch.position = ROLE_LABELS.volunteer_border;
    } else if (nextFieldRole === 'special_volunteer') {
      patch.position = ROLE_LABELS.special_volunteer;
    } else if (
      !user.position ||
      user.position.startsWith('อาสาสมัคร')
    ) {
      patch.position = ROLE_LABELS.overseer;
    }
  } else if (userRole === 'overseer' || isOverseerLike(userRole)) {
    // Always clear deprecated tier on geo save
    patch.overseer_tier = null;
  }

  if (input.provinces) {
    // Volunteer may hold any provinces; Type 1 dashboards nest by ∩ only
    // Sentinel `*` = nationwide grant (clear discrete tags)
    const { isGlobalDomainScope, DOMAIN_SCOPE_GLOBAL } = await import(
      '@/lib/auth/domain-scope'
    );
    if (isGlobalDomainScope(input.provinces)) {
      patch.assigned_provinces = [DOMAIN_SCOPE_GLOBAL];
      patch.assigned_districts = [];
    } else {
      patch.assigned_provinces = [
        ...new Set(input.provinces.map((p) => p.trim()).filter(Boolean)),
      ];
    }
  }
  if (input.districts) {
    const { isGlobalDomainScope, DOMAIN_SCOPE_GLOBAL } = await import(
      '@/lib/auth/domain-scope'
    );
    if (isGlobalDomainScope(input.districts)) {
      patch.assigned_districts = [DOMAIN_SCOPE_GLOBAL];
      patch.assigned_provinces = [];
    } else {
      patch.assigned_districts = [
        ...new Set(input.districts.map((d) => d.trim()).filter(Boolean)),
      ];
    }
  }
  if (input.schools) {
    patch.assigned_schools = [
      ...new Set(input.schools.map((s) => String(s).trim()).filter(Boolean)),
    ];
  }

  // Staff Gov_Domain districts → province → report to Type 1 (not Type 2)
  const nextDistricts = patch.assigned_districts ?? user.assigned_districts;
  if (userRole === 'staff' && nextDistricts.length > 0) {
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
      const boss = all.find(
        (u) =>
          !u.disabled &&
          normalizeRole(u.role) === 'overseer' &&
          isOverseerType1(u.role, u.overseer_tier) &&
          provincesFromAreas.some((p) => u.assigned_provinces.includes(p))
      );
      if (boss) patch.reports_to = boss.id;
    }
  }

  const result = await updateUserProfileFields(userId, patch);
  if (!result.ok) return result;

  // Type 1 province change → re-link staff whose Gov districts fall in those provinces
  // (staff always reports_to overseer; volunteer provinces nest by ∩ on dashboard)
  const effectiveRole = (patch.role ? normalizeRole(patch.role) : userRole) as UserRole;
  if (isOverseerType1(effectiveRole, null) && patch.assigned_provinces) {
    const provinces = new Set(patch.assigned_provinces);
    const all = await readStoredUsers();
    let areaProvinceMap: Map<string, string[]> | null = null;
    try {
      const { fetchSchools, fetchGovDomains } = await import('@/lib/supabase/schools');
      const [schools, govDomains] = await Promise.all([
        fetchSchools().catch(() => []),
        fetchGovDomains().catch(() => []),
      ]);
      areaProvinceMap = new Map();
      for (const g of govDomains as {
        area_id?: unknown;
        province_name?: string | null;
      }[]) {
        const aid = g.area_id != null ? String(g.area_id) : '';
        const p = (g.province_name ?? '').trim();
        if (!aid || !p) continue;
        const list = areaProvinceMap.get(aid) ?? [];
        if (!list.includes(p)) list.push(p);
        areaProvinceMap.set(aid, list);
      }
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
      if (!underThis || staff.reports_to === userId) continue;
      await updateUserProfileFields(staff.id, { reports_to: userId });
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

  const user = await findUserById(userId);
  if (!user) return { ok: false, error: 'ไม่พบผู้ใช้' };
  const userRole = normalizeRole(user.role);

  const patch: Parameters<typeof updateUserProfileFields>[1] = {
    reports_to: reportsTo,
  };

  if (reportsTo) {
    const boss = await findUserById(reportsTo);
    if (!boss) return { ok: false, error: 'ไม่พบหัวหน้า' };
    const bossRole = normalizeRole(boss.role);

    // Staff → Type 1 only (Gov district / province), never Type 2
    if (userRole === 'staff') {
      if (
        bossRole !== 'overseer' ||
        !isOverseerType1(boss.role, boss.overseer_tier)
      ) {
        return {
          ok: false,
          error: 'ศึกษานิเทศก์ต้องรายงานต่อองคมนตรี Type 1 เท่านั้น (ตามจังหวัดของเขต)',
        };
      }
    }

    // Volunteers under overseer — keep/set volunteer_border unless already Center/Special
    if (
      (userRole === 'overseer' || isVolunteerRole(userRole)) &&
      bossRole === 'overseer'
    ) {
      if (!isOverseerType1(boss.role, boss.overseer_tier)) {
        return { ok: false, error: 'อาสาสมัครต้องอยู่ภายใต้องคมนตรีเท่านั้น' };
      }
      if (boss.id === userId) {
        return { ok: false, error: 'ไม่สามารถตั้งหัวหน้าเป็นตนเองได้' };
      }
      if (!isVolunteerRole(userRole)) {
        patch.role = 'volunteer_border';
        patch.position = ROLE_LABELS.volunteer_border;
      }
      patch.overseer_tier = null;
    } else if (userRole === 'overseer' && bossRole === 'super_overseer') {
      patch.role = 'overseer';
      patch.overseer_tier = null;
      if (!user.position || user.position.startsWith('อาสาสมัคร')) {
        patch.position = ROLE_LABELS.overseer;
      }
    }
  }

  return updateUserProfileFields(userId, patch);
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

  const { isDbOnlyMode } = await import('@/lib/auth/db-mode');
  if (isDbOnlyMode()) {
    const { updateUserProfileInDb } = await import('@/lib/supabase/profiles');
    await updateUserProfileInDb(userId, { must_change_password: true });
  }
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

/** First password for admin-created users — force change on next login (training default). */
export async function registerInitialPassword(userId: string, password: string) {
  await persistPasswordState(userId, password.trim() || MOCK_LOGIN_PASSWORD, true);
}

export async function logoutSession() {
  await writeAuthSession(null);
  // Drop mock data cookies so logout/navigation is not blocked by 431 header limits
  // Note: coned-content-access is intentionally NOT purgeable — ACL must survive logout.
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
      overseer_tier: u.overseer_tier ?? null,
      assigned_zone: u.assigned_zone,
      assigned_provinces: u.assigned_provinces,
      assigned_districts: u.assigned_districts,
      reports_to: u.reports_to,
      disabled: Boolean(u.disabled),
      hasPassword: Boolean(c?.password),
      hasTempPassword: Boolean(c?.tempPassword),
      mustChangePassword: Boolean(
        c?.mustChangePassword ?? u.mustChangePassword ?? false
      ),
      hintPassword: c?.password ?? null,
      hintTemp: c?.tempPassword ?? null,
      status: u.disabled ? ('disabled' as const) : ('active' as const),
    };
  });
}

export { MOCK_USER_SEEDS, postLoginPath };
