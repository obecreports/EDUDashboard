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

function readJsonCookie<T>(name: string, fallback: T): T {
  const raw = cookies().get(name)?.value;
  if (!raw) return fallback;
  try {
    return JSON.parse(decodeURIComponent(raw)) as T;
  } catch {
    return fallback;
  }
}

function writeJsonCookie(name: string, value: unknown) {
  cookies().set(name, encodeURIComponent(JSON.stringify(value)), COOKIE_OPTS);
}

export function readStoredUsers(): StoredUserProfile[] {
  const extras = readJsonCookie<StoredUserProfile[]>(AUTH_USERS_COOKIE, []);
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

function writeStoredUsers(users: StoredUserProfile[]) {
  // Persist overrides + custom users (include seed overrides so disable/edit sticks)
  writeJsonCookie(AUTH_USERS_COOKIE, users);
}

export function findUserByEmail(email: string): StoredUserProfile | undefined {
  const normalized = email.trim().toLowerCase();
  return readStoredUsers().find((u) => u.email.toLowerCase() === normalized);
}

export function findUserById(id: string): StoredUserProfile | undefined {
  return readStoredUsers().find((u) => u.id === id);
}

export function createMockUser(input: {
  full_name: string;
  position: string;
  role: UserRole;
  email?: string;
}): { ok: true; user: StoredUserProfile; tempPassword: string } | { ok: false; error: string } {
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
  if (findUserByEmail(email)) return { ok: false, error: 'อีเมลนี้มีอยู่แล้ว' };

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

  const users = readStoredUsers();
  users.push(user);
  writeStoredUsers(users);

  return { ok: true, user, tempPassword };
}

export function setUserDisabled(
  userId: string,
  disabled: boolean
): { ok: true } | { ok: false; error: string } {
  const users = readStoredUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return { ok: false, error: 'ไม่พบผู้ใช้' };
  users[idx] = { ...users[idx], disabled };
  writeStoredUsers(users);
  return { ok: true };
}

export function updateUserProfileFields(
  userId: string,
  patch: Partial<Pick<StoredUserProfile, 'full_name' | 'position' | 'role' | 'assigned_zone'>>
): { ok: true } | { ok: false; error: string } {
  const users = readStoredUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return { ok: false, error: 'ไม่พบผู้ใช้' };
  users[idx] = { ...users[idx], ...patch };
  writeStoredUsers(users);
  return { ok: true };
}

export function readHeroSettings(): HeroSiteSettings {
  const stored = readJsonCookie<Partial<HeroSiteSettings>>(SITE_SETTINGS_COOKIE, {});
  return { ...DEFAULT_HERO_SETTINGS, ...stored };
}

export function writeHeroSettings(next: Partial<HeroSiteSettings>) {
  const current = readHeroSettings();
  writeJsonCookie(SITE_SETTINGS_COOKIE, { ...current, ...next });
}

export function readCalendarEvents(): StaffCalendarEvent[] {
  return readJsonCookie<StaffCalendarEvent[]>(CALENDAR_EVENTS_COOKIE, []);
}

export function writeCalendarEvents(events: StaffCalendarEvent[]) {
  writeJsonCookie(CALENDAR_EVENTS_COOKIE, events);
}

export function addCalendarEvent(
  event: Omit<StaffCalendarEvent, 'id' | 'created_at'>
): StaffCalendarEvent {
  const events = readCalendarEvents();
  const row: StaffCalendarEvent = {
    ...event,
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    created_at: new Date().toISOString(),
  };
  events.push(row);
  writeCalendarEvents(events);
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

function readExtrasMap(): SchoolExtrasMap {
  return readJsonCookie<SchoolExtrasMap>(SCHOOL_EXTRAS_COOKIE, {});
}

function writeExtrasMap(map: SchoolExtrasMap) {
  writeJsonCookie(SCHOOL_EXTRAS_COOKIE, map);
}

export function readSchoolExtras(schoolId: string | number): SchoolExtras {
  const map = readExtrasMap();
  const key = String(schoolId);
  const row = map[key];
  if (!row) return emptyExtras();
  return {
    comments: row.comments ?? [],
    swot: normalizeSchoolSwot(row.swot),
    achievements: { school: row.achievements?.school ?? '', student: row.achievements?.student ?? '' },
  };
}

export function addSchoolComment(
  schoolId: string | number,
  input: { staff_id: string; staff_name: string; text: string }
): SchoolComment {
  const map = readExtrasMap();
  const key = String(schoolId);
  const current = readSchoolExtras(key);
  const comment: SchoolComment = {
    id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    staff_id: input.staff_id,
    staff_name: input.staff_name,
    text: input.text.trim(),
    created_at: new Date().toISOString(),
  };
  current.comments = [comment, ...current.comments];
  map[key] = current;
  writeExtrasMap(map);
  return comment;
}

export function saveSchoolSwot(
  schoolId: string | number,
  swot: Partial<SchoolSwot> | SchoolSwot
): SchoolExtras {
  const map = readExtrasMap();
  const key = String(schoolId);
  const current = readSchoolExtras(key);
  current.swot = normalizeSchoolSwot({ ...current.swot, ...swot });
  map[key] = current;
  writeExtrasMap(map);
  return current;
}

export function saveSchoolAchievements(
  schoolId: string | number,
  achievements: Partial<SchoolAchievements>
): SchoolExtras {
  const map = readExtrasMap();
  const key = String(schoolId);
  const current = readSchoolExtras(key);
  current.achievements = { ...current.achievements, ...achievements };
  map[key] = current;
  writeExtrasMap(map);
  return current;
}

export type { UserRole };
