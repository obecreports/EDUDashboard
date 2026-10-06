import { cookies } from 'next/headers';
import {
  AUTH_USERS_COOKIE,
  CALENDAR_EVENTS_COOKIE,
  DEFAULT_HERO_SETTINGS,
  MOCK_USER_SEEDS,
  SCHOOL_EXTRAS_COOKIE,
  SITE_SETTINGS_COOKIE,
  type HeroSiteSettings,
  type StaffCalendarEvent,
  type StoredUserProfile,
} from '@/lib/auth/mock-users';
import type { UserRole } from '@/lib/types';
import {
  emptySchoolSwot,
  normalizeSchoolSwot,
  type SchoolSwot,
} from '@/lib/swot/schema';

export type {
  SchoolSwot,
  SwotPair,
  SchoolSwotInternalKey,
  SchoolSwotExternalKey,
} from '@/lib/swot/schema';

const COOKIE_OPTS = {
  path: '/',
  sameSite: 'lax' as const,
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 30,
};

async function readJsonCookie<T>(name: string, fallback: T): Promise<T> {
  const jar = await cookies();
  const raw = jar.get(name)?.value;
  if (!raw) return fallback;
  try {
    return JSON.parse(decodeURIComponent(raw)) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonCookie(name: string, value: unknown) {
  const jar = await cookies();
  jar.set(name, encodeURIComponent(JSON.stringify(value)), COOKIE_OPTS);
}

export async function readStoredUsers(): Promise<StoredUserProfile[]> {
  const extras = await readJsonCookie<StoredUserProfile[]>(AUTH_USERS_COOKIE, []);
  const byId = new Map<string, StoredUserProfile>();

  for (const u of MOCK_USER_SEEDS) {
    byId.set(u.id, {
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      position: u.position,
      role: u.role,
      assigned_zone: u.assigned_zone,
      disabled: Boolean(u.disabled),
    });
  }
  for (const u of extras) {
    byId.set(u.id, { ...byId.get(u.id), ...u, disabled: Boolean(u.disabled) });
  }
  return [...byId.values()];
}

async function writeStoredUsers(users: StoredUserProfile[]) {
  // Persist overrides + custom users (include seed overrides so disable/edit sticks)
  await writeJsonCookie(AUTH_USERS_COOKIE, users);
}

export async function findUserByEmail(email: string): Promise<StoredUserProfile | undefined> {
  const normalized = email.trim().toLowerCase();
  const users = await readStoredUsers();
  return users.find((u) => u.email.toLowerCase() === normalized);
}

export async function findUserById(id: string): Promise<StoredUserProfile | undefined> {
  const users = await readStoredUsers();
  return users.find((u) => u.id === id);
}

export async function createMockUser(input: {
  full_name: string;
  position: string;
  role: UserRole;
  email?: string;
}): Promise<
  { ok: true; user: StoredUserProfile; tempPassword: string } | { ok: false; error: string }
> {
  const role = input.role;
  if (!['staff', 'overseer', 'admin'].includes(role)) {
    return { ok: false, error: 'บทบาทต้องเป็น staff, overseer หรือ admin' };
  }
  const full_name = input.full_name.trim();
  const position = input.position.trim();
  if (!full_name || !position) return { ok: false, error: 'กรุณากรอกชื่อและตำแหน่ง' };

  const id = `mock-user-${Date.now()}`;
  const email =
    input.email?.trim().toLowerCase() ||
    `${full_name.replace(/\s+/g, '.').toLowerCase()}@coned.local`;
  if (await findUserByEmail(email)) return { ok: false, error: 'อีเมลนี้มีอยู่แล้ว' };

  const tempPassword = `Temp${Math.random().toString(36).slice(2, 8)}`;
  const user: StoredUserProfile = {
    id,
    email,
    full_name,
    position,
    role,
    assigned_zone: null,
    disabled: false,
  };

  const users = await readStoredUsers();
  users.push(user);
  await writeStoredUsers(users);

  return { ok: true, user, tempPassword };
}

export async function setUserDisabled(
  userId: string,
  disabled: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const users = await readStoredUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return { ok: false, error: 'ไม่พบผู้ใช้' };
  users[idx] = { ...users[idx], disabled };
  await writeStoredUsers(users);
  return { ok: true };
}

export async function updateUserProfileFields(
  userId: string,
  patch: Partial<Pick<StoredUserProfile, 'full_name' | 'position' | 'role' | 'assigned_zone'>>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const users = await readStoredUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return { ok: false, error: 'ไม่พบผู้ใช้' };
  users[idx] = { ...users[idx], ...patch };
  await writeStoredUsers(users);
  return { ok: true };
}

export async function readHeroSettings(): Promise<HeroSiteSettings> {
  const stored = await readJsonCookie<Partial<HeroSiteSettings>>(SITE_SETTINGS_COOKIE, {});
  return { ...DEFAULT_HERO_SETTINGS, ...stored };
}

export async function writeHeroSettings(next: Partial<HeroSiteSettings>) {
  const current = await readHeroSettings();
  await writeJsonCookie(SITE_SETTINGS_COOKIE, { ...current, ...next });
}

export async function readCalendarEvents(): Promise<StaffCalendarEvent[]> {
  return readJsonCookie<StaffCalendarEvent[]>(CALENDAR_EVENTS_COOKIE, []);
}

export async function writeCalendarEvents(events: StaffCalendarEvent[]) {
  await writeJsonCookie(CALENDAR_EVENTS_COOKIE, events);
}

export async function addCalendarEvent(
  event: Omit<StaffCalendarEvent, 'id' | 'created_at'>
): Promise<StaffCalendarEvent> {
  const events = await readCalendarEvents();
  const row: StaffCalendarEvent = {
    ...event,
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    created_at: new Date().toISOString(),
  };
  events.push(row);
  await writeCalendarEvents(events);
  return row;
}

export type SchoolComment = {
  id: string;
  staff_id: string;
  staff_name: string;
  text: string;
  created_at: string;
};

export type SchoolAchievements = {
  school: string;
  student: string;
};

export type SchoolExtras = {
  comments: SchoolComment[];
  swot: SchoolSwot;
  achievements: SchoolAchievements;
};

const EMPTY_SWOT: SchoolSwot = emptySchoolSwot();

function emptyExtras(): SchoolExtras {
  return {
    comments: [],
    swot: emptySchoolSwot(),
    achievements: { school: '', student: '' },
  };
}

type SchoolExtrasMap = Record<string, SchoolExtras>;

async function readExtrasMap(): Promise<SchoolExtrasMap> {
  return readJsonCookie<SchoolExtrasMap>(SCHOOL_EXTRAS_COOKIE, {});
}

async function writeExtrasMap(map: SchoolExtrasMap) {
  await writeJsonCookie(SCHOOL_EXTRAS_COOKIE, map);
}

export async function readSchoolExtras(schoolId: string | number): Promise<SchoolExtras> {
  const map = await readExtrasMap();
  const key = String(schoolId);
  const row = map[key];
  if (!row) return emptyExtras();
  return {
    comments: row.comments ?? [],
    swot: normalizeSchoolSwot(row.swot),
    achievements: { school: row.achievements?.school ?? '', student: row.achievements?.student ?? '' },
  };
}

export async function addSchoolComment(
  schoolId: string | number,
  input: { staff_id: string; staff_name: string; text: string }
): Promise<SchoolComment> {
  const map = await readExtrasMap();
  const key = String(schoolId);
  const current = await readSchoolExtras(key);
  const comment: SchoolComment = {
    id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    staff_id: input.staff_id,
    staff_name: input.staff_name,
    text: input.text.trim(),
    created_at: new Date().toISOString(),
  };
  current.comments = [comment, ...current.comments];
  map[key] = current;
  await writeExtrasMap(map);
  return comment;
}

export async function saveSchoolSwot(
  schoolId: string | number,
  swot: Partial<SchoolSwot> | SchoolSwot
): Promise<SchoolExtras> {
  const map = await readExtrasMap();
  const key = String(schoolId);
  const current = await readSchoolExtras(key);
  current.swot = normalizeSchoolSwot({ ...current.swot, ...swot });
  map[key] = current;
  await writeExtrasMap(map);
  return current;
}

export async function saveSchoolAchievements(
  schoolId: string | number,
  achievements: Partial<SchoolAchievements>
): Promise<SchoolExtras> {
  const map = await readExtrasMap();
  const key = String(schoolId);
  const current = await readSchoolExtras(key);
  current.achievements = { ...current.achievements, ...achievements };
  map[key] = current;
  await writeExtrasMap(map);
  return current;
}

export type { UserRole };
