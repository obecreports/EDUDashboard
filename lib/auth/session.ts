import { cookies } from 'next/headers';
import type { OverseerTier, UserProfile, UserRole } from '@/lib/types';
import {
  effectiveOverseerTier,
  isOverseerType1,
  isOverseerType2,
  normalizeOverseerTier,
  normalizeRole,
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
  return {
    id: session.id,
    email: session.email,
    full_name: stored?.full_name ?? session.full_name,
    name_prefix: stored?.name_prefix ?? null,
    position: stored?.position ?? session.position,
    role,
    overseer_tier: effectiveOverseerTier(
      role,
      stored?.overseer_tier ?? session.overseer_tier
    ),
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
        overseer_tier: profile.overseer_tier ?? null,
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
      overseer_tier: null,
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
  // Cookie overrides → mock seed → default UAT password for DB-only accounts
  // (e.g. OS10T01–OS10T13 from migration 020 are in user_profiles but not MOCK_USER_SEEDS)
  let resolvedPassword =
    fromCookie?.password !== undefined
      ? fromCookie.password
      : (seed?.password ?? null);
  let resolvedTemp =
    fromCookie?.tempPassword !== undefined
      ? fromCookie.tempPassword
      : (seed?.tempPassword ?? null);
  const mustChangePassword = Boolean(
    fromCookie?.mustChangePassword ?? seed?.mustChangePassword ?? false
  );
  if (resolvedPassword == null && resolvedTemp == null) {
    resolvedPassword = MOCK_LOGIN_PASSWORD;
  }

  const input = password.trim();
  const matchedPassword = resolvedPassword != null && resolvedPassword === input;
  const matchedTemp = resolvedTemp != null && resolvedTemp === input;

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
    overseer_tier: effectiveOverseerTier(role, user.overseer_tier),
    assigned_zone: user.assigned_zone,
    assigned_provinces: user.assigned_provinces ?? [],
    assigned_districts: user.assigned_districts ?? [],
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
    lastActiveAt: Date.now(),
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
    /** Optional explicit tier when assigning overseer provinces */
    overseerTier?: OverseerTier | null;
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
  const tier =
    input.overseerTier !== undefined
      ? normalizeOverseerTier(input.overseerTier)
      : effectiveOverseerTier(userRole, user.overseer_tier);

  const patch: Parameters<typeof updateUserProfileFields>[1] = {};
  if (input.provinces) {
    let nextProvinces = [
      ...new Set(input.provinces.map((p) => p.trim()).filter(Boolean)),
    ];
    // Type 2: only provinces within parent Type 1 assignment
    if (userRole === 'overseer' && tier === 'type2') {
      const parentId = user.reports_to;
      if (!parentId) {
        return {
          ok: false,
          error: 'องคมนตรีระดับ 2 ต้องมีหัวหน้า Type 1 ก่อนมอบหมายจังหวัด',
        };
      }
      const parent = await findUserById(parentId);
      if (!parent || !isOverseerType1(parent.role, parent.overseer_tier)) {
        return {
          ok: false,
          error: 'หัวหน้าขององคมนตรีระดับ 2 ต้องเป็นองคมนตรีระดับ 1',
        };
      }
      const allowed = new Set(parent.assigned_provinces ?? []);
      nextProvinces = nextProvinces.filter((p) => allowed.has(p));
    }
    patch.assigned_provinces = nextProvinces;
  }
  if (input.districts) {
    patch.assigned_districts = [...new Set(input.districts.map((d) => d.trim()).filter(Boolean))];
  }
  if (userRole === 'overseer' && input.overseerTier !== undefined) {
    patch.overseer_tier = tier;
  }

  // Domain hierarchy: staff areas → prefer Type 2 then Type 1 overlapping province
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
      const overlap = (u: (typeof all)[number]) =>
        !u.disabled &&
        provincesFromAreas.some((p) => u.assigned_provinces.includes(p));
      const boss =
        all.find(
          (u) =>
            normalizeRole(u.role) === 'overseer' &&
            isOverseerType2(u.role, u.overseer_tier) &&
            overlap(u)
        ) ??
        all.find(
          (u) =>
            normalizeRole(u.role) === 'overseer' &&
            isOverseerType1(u.role, u.overseer_tier) &&
            overlap(u)
        ) ??
        all.find((u) => normalizeRole(u.role) === 'volunteer' && overlap(u));
      if (boss) patch.reports_to = boss.id;
    }
  }

  const result = await updateUserProfileFields(userId, patch);
  if (!result.ok) return result;

  // When Type 1 provinces shrink, clip Type 2 children to remaining set
  if (
    userRole === 'overseer' &&
    isOverseerType1(userRole, tier ?? user.overseer_tier) &&
    patch.assigned_provinces
  ) {
    const allowed = new Set(patch.assigned_provinces);
    const all = await readStoredUsers();
    for (const child of all) {
      if (
        !isOverseerType2(child.role, child.overseer_tier) ||
        child.reports_to !== userId
      ) {
        continue;
      }
      const clipped = (child.assigned_provinces ?? []).filter((p) => allowed.has(p));
      if (clipped.length !== child.assigned_provinces.length) {
        await updateUserProfileFields(child.id, { assigned_provinces: clipped });
      }
    }
  }

  // When องคมนตรี / อาสาสมัคร provinces change, re-link staff under those provinces
  if (
    (userRole === 'overseer' || userRole === 'volunteer') &&
    patch.assigned_provinces
  ) {
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
        // Prefer linking to Type 2 when staff already under a Type 2 of this Type 1
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

    // Overseer → Overseer means Type 2 under Type 1
    if (userRole === 'overseer' && bossRole === 'overseer') {
      if (!isOverseerType1(boss.role, boss.overseer_tier)) {
        return { ok: false, error: 'องคมนตรีระดับ 2 ต้องอยู่ภายใต้ระดับ 1 เท่านั้น' };
      }
      if (boss.id === userId) {
        return { ok: false, error: 'ไม่สามารถตั้งหัวหน้าเป็นตนเองได้' };
      }
      patch.overseer_tier = 'type2';
      patch.position = 'อาสาสมัคร';
      // Clip provinces to parent set (keep subset already assigned)
      const allowed = new Set(boss.assigned_provinces ?? []);
      const clipped = (user.assigned_provinces ?? []).filter((p) => allowed.has(p));
      if (clipped.length !== user.assigned_provinces.length) {
        patch.assigned_provinces = clipped;
      }
    } else if (userRole === 'overseer' && bossRole === 'super_overseer') {
      patch.overseer_tier = 'type1';
      if (!user.position || user.position === 'อาสาสมัคร') {
        patch.position = 'องคมนตรี';
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

/** First password for admin-created users (same UX as seed login1234). */
export async function registerInitialPassword(userId: string, password: string) {
  const creds = await readCredentials();
  creds[userId] = {
    password: password.trim(),
    tempPassword: null,
    mustChangePassword: false,
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
      overseer_tier: u.overseer_tier ?? null,
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
