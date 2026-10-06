import { cookies } from 'next/headers';
import type { UserProfile, UserRole } from '@/lib/types';
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
  findUserByEmail,
  findUserById,
  readStoredUsers,
  updateUserProfileFields,
} from '@/lib/auth/user-store';

const COOKIE_OPTS = {
  path: '/',
  sameSite: 'lax' as const,
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 30,
};

async function readCredentials(): Promise<CredentialsMap> {
  const jar = await cookies();
  const raw = jar.get(AUTH_CREDENTIALS_COOKIE)?.value;
  if (!raw) return seedCredentials();
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as CredentialsMap;
    return { ...seedCredentials(), ...parsed };
  } catch {
    return seedCredentials();
  }
}

async function writeCredentials(map: CredentialsMap) {
  const jar = await cookies();
  jar.set(AUTH_CREDENTIALS_COOKIE, encodeURIComponent(JSON.stringify(map)), COOKIE_OPTS);
}

export async function readAuthSession(): Promise<AuthSession | null> {
  const jar = await cookies();
  const raw = jar.get(AUTH_SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as AuthSession;
  } catch {
    return null;
  }
}

async function writeAuthSession(session: AuthSession | null) {
  const jar = await cookies();
  if (!session) {
    jar.delete(AUTH_SESSION_COOKIE);
    return;
  }
  jar.set(AUTH_SESSION_COOKIE, encodeURIComponent(JSON.stringify(session)), COOKIE_OPTS);
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
    return {
      profile: {
        id: session.id,
        email: session.email,
        full_name: session.full_name,
        position: session.position,
        role: session.role,
        assigned_zone: stored?.assigned_zone ?? session.assigned_zone,
        avatar_url: null,
      },
      role: session.role,
      isAuthenticated: true,
      mustChangePassword: session.mustChangePassword,
      session: {
        ...session,
        assigned_zone: stored?.assigned_zone ?? session.assigned_zone,
      },
    };
  }

  return {
    profile: {
      id: 'guest',
      email: null,
      full_name: 'ผู้เยี่ยมชม',
      position: null,
      role: 'global',
      assigned_zone: null,
      avatar_url: null,
    },
    role: 'global',
    isAuthenticated: false,
    mustChangePassword: false,
    session: null,
  };
}

export type LoginResult =
  | { ok: true; mustChangePassword: boolean; role: UserRole }
  | { ok: false; error: string };

export async function loginWithPassword(email: string, password: string): Promise<LoginResult> {
  const user = await findUserByEmail(email);
  if (!user) return { ok: false, error: 'ไม่พบบัญชีผู้ใช้นี้' };
  if (user.disabled) return { ok: false, error: 'บัญชีนี้ถูกปิดการใช้งาน' };

  const seed = findSeedById(user.id);
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

  const session: AuthSession = {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    position: user.position,
    role: user.role,
    assigned_zone: user.assigned_zone,
    mustChangePassword: matchedTemp || Boolean(state.mustChangePassword),
    authVia: matchedTemp ? 'temp' : 'password',
  };

  await writeAuthSession(session);
  return { ok: true, mustChangePassword: session.mustChangePassword, role: user.role };
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

/** Persist assigned area_ids (Educational Area) as comma-separated on session + user store */
export async function updateAssignedZones(zones: string[]): Promise<ChangePasswordResult> {
  const session = await readAuthSession();
  if (!session) return { ok: false, error: 'กรุณาเข้าสู่ระบบก่อน' };
  if (session.role !== 'staff' && session.role !== 'overseer' && session.role !== 'admin') {
    return { ok: false, error: 'ไม่มีสิทธิ์แก้ไขเขต' };
  }

  const cleaned = [...new Set(zones.map((z) => z.trim()).filter(Boolean))];
  const assigned_zone = cleaned.length ? cleaned.join(', ') : null;
  await updateUserProfileFields(session.id, { assigned_zone });
  await writeAuthSession({ ...session, assigned_zone });
  return { ok: true };
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

/** Register credentials for a newly created mock user */
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
      position: u.position,
      role: u.role,
      assigned_zone: u.assigned_zone,
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

export { MOCK_USER_SEEDS };
