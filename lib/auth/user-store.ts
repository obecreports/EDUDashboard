import {
  AUTH_USERS_COOKIE,
  CALENDAR_EVENTS_COOKIE,
  DEFAULT_HERO_SETTINGS,
  MOCK_LOGIN_PASSWORD,
  MOCK_USER_SEEDS,
  REPORT_DRAFTS_COOKIE,
  SCHOOL_COMMENTS_COOKIE,
  SCHOOL_EXTRAS_COOKIE,
  SITE_SETTINGS_COOKIE,
  loginIdsMatch,
  normalizeStoredUser,
  type HeroSiteSettings,
  type ReportDraft,
  type StaffCalendarEvent,
  type StoredUserProfile,
} from '@/lib/auth/mock-users';
import {
  CookieTooLargeError,
  readJsonCookie,
  writeJsonCookie,
  writeJsonCookieWithShrink,
} from '@/lib/auth/cookie-json';
import { isDbOnlyMode } from '@/lib/auth/db-mode';

export type { ReportDraft };
import type { UserRole } from '@/lib/types';
import { ALL_ROLES, normalizeRole } from '@/lib/types';
import {
  emptySchoolSwot,
  normalizeSchoolSwot,
  type SchoolSwot,
} from '@/lib/swot/schema';
import {
  createUserInDb,
  fetchAllUserProfiles,
  fetchUserProfileById,
  fetchUserProfileByLogin,
  updateUserProfileInDb,
} from '@/lib/supabase/profiles';

export type {
  SchoolSwot,
  SwotPair,
  SchoolSwotInternalKey,
  SchoolSwotExternalKey,
} from '@/lib/swot/schema';

export { CookieTooLargeError };

async function readRawUserExtras(): Promise<Partial<StoredUserProfile>[]> {
  return readJsonCookie<Partial<StoredUserProfile>[]>(AUTH_USERS_COOKIE, []);
}

/** Upsert one user override — keeps cookie small (seeds stay in code, not re-dumped). */
async function upsertStoredUserOverride(user: StoredUserProfile) {
  const extras = await readRawUserExtras();
  const idx = extras.findIndex((u) => u?.id === user.id);
  const row: StoredUserProfile = normalizeStoredUser(user);
  if (idx >= 0) extras[idx] = row;
  else extras.push(row);
  await writeJsonCookie(AUTH_USERS_COOKIE, extras);
}

export async function readStoredUsers(): Promise<StoredUserProfile[]> {
  if (isDbOnlyMode()) {
    const fromDb = await fetchAllUserProfiles();
    if (fromDb.length) return fromDb;
    // Migration 007 not applied yet — fall back to in-code seeds (read-only)
    return MOCK_USER_SEEDS.map((u) =>
      normalizeStoredUser({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        position: u.position,
        role: u.role,
        assigned_zone: u.assigned_zone,
        assigned_provinces: u.assigned_provinces,
        assigned_districts: u.assigned_districts,
        reports_to: u.reports_to,
        disabled: Boolean(u.disabled),
        birthday: u.birthday ?? null,
        name_prefix: u.name_prefix ?? null,
      })
    );
  }

  const extras = await readRawUserExtras();
  const byId = new Map<string, StoredUserProfile>();

  for (const u of MOCK_USER_SEEDS) {
    byId.set(
      u.id,
      normalizeStoredUser({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        position: u.position,
        role: u.role,
        assigned_zone: u.assigned_zone,
        assigned_provinces: u.assigned_provinces,
        assigned_districts: u.assigned_districts,
        reports_to: u.reports_to,
        disabled: Boolean(u.disabled),
        birthday: u.birthday ?? null,
        name_prefix: u.name_prefix ?? null,
      })
    );
  }
  for (const u of extras) {
    if (!u?.id || !u.email) continue;
    const prev = byId.get(u.id);
    byId.set(
      u.id,
      normalizeStoredUser({
        ...(prev ?? {}),
        ...u,
        id: u.id,
        email: u.email,
        role: u.role ?? prev?.role ?? 'staff',
        name_prefix:
          u.name_prefix !== undefined ? u.name_prefix : (prev?.name_prefix ?? null),
      })
    );
  }
  return [...byId.values()];
}

export async function findUserByEmail(email: string): Promise<StoredUserProfile | undefined> {
  if (isDbOnlyMode()) {
    const row = await fetchUserProfileByLogin(email);
    if (row) return row;
  }
  const users = await readStoredUsers();
  return users.find((u) => loginIdsMatch(u.email, email));
}

export async function findUserById(id: string): Promise<StoredUserProfile | undefined> {
  if (isDbOnlyMode()) {
    const row = await fetchUserProfileById(id);
    if (row) return row;
  }
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
  const role = normalizeRole(input.role);
  if (role === 'guest') {
    return { ok: false, error: 'ไม่สามารถสร้างบัญชี guest ได้' };
  }
  if (!(ALL_ROLES as string[]).includes(role)) {
    return { ok: false, error: 'บทบาทไม่ถูกต้อง' };
  }
  const full_name = input.full_name.trim();
  const position = input.position.trim();
  if (!full_name || !position) return { ok: false, error: 'กรุณากรอกชื่อและตำแหน่ง' };

  const loginId =
    input.email?.trim() ||
    full_name.replace(/\s+/g, '').toLowerCase().slice(0, 24) ||
    `user${Date.now()}`;
  if (await findUserByEmail(loginId)) return { ok: false, error: 'รหัสผู้ใช้นี้มีอยู่แล้ว' };

  const tempPassword = MOCK_LOGIN_PASSWORD;

  if (isDbOnlyMode()) {
    const created = await createUserInDb({
      loginId,
      full_name,
      position,
      role,
      password: tempPassword,
    });
    if (!created.ok) return created;
    return { ok: true, user: created.user, tempPassword };
  }

  const id = `mock-user-${Date.now()}`;
  const user: StoredUserProfile = {
    id,
    email: loginId,
    full_name,
    name_prefix: null,
    position,
    role,
    assigned_zone: null,
    assigned_provinces: [],
    assigned_districts: [],
    reports_to: null,
    disabled: false,
  };

  await upsertStoredUserOverride(user);

  return { ok: true, user, tempPassword };
}

export async function setUserDisabled(
  userId: string,
  disabled: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isDbOnlyMode()) {
    const existing = await fetchUserProfileById(userId);
    if (!existing) return { ok: false, error: 'ไม่พบผู้ใช้ในฐานข้อมูล' };
    return updateUserProfileInDb(userId, { disabled });
  }

  const users = await readStoredUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return { ok: false, error: 'ไม่พบผู้ใช้' };
  const next = normalizeStoredUser({ ...users[idx], disabled });
  await upsertStoredUserOverride(next);
  return { ok: true };
}

export async function updateUserProfileFields(
  userId: string,
  patch: Partial<
    Pick<
      StoredUserProfile,
      | 'full_name'
      | 'name_prefix'
      | 'position'
      | 'role'
      | 'assigned_zone'
      | 'assigned_provinces'
      | 'assigned_districts'
      | 'reports_to'
    >
  >
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isDbOnlyMode()) {
    const existing = await fetchUserProfileById(userId);
    if (!existing) return { ok: false, error: 'ไม่พบผู้ใช้ในฐานข้อมูล — รัน migration 007' };
    return updateUserProfileInDb(userId, patch);
  }

  const users = await readStoredUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return { ok: false, error: 'ไม่พบผู้ใช้' };
  const next = normalizeStoredUser({
    ...users[idx],
    ...patch,
    name_prefix:
      patch.name_prefix !== undefined ? patch.name_prefix : users[idx].name_prefix,
    role: patch.role ? normalizeRole(patch.role) : users[idx].role,
  });
  await upsertStoredUserOverride(next);
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

/** Slim row for cookie storage — Thai text balloons encodeURIComponent size. */
function leanCalendarEvent(e: StaffCalendarEvent): StaffCalendarEvent {
  return {
    id: e.id,
    staff_id: e.staff_id,
    date: e.date,
    activity: e.activity,
    school_id: e.school_id,
    school_name: (e.school_name ?? '').slice(0, 48) || null,
    school_ids: e.school_ids?.slice(0, 12),
    school_names: e.school_names?.slice(0, 12).map((n) => n.slice(0, 48)),
    visit_reasons: e.visit_reasons?.slice(0, 8),
    participant_ids: e.participant_ids?.slice(0, 20),
    area_id: e.area_id ? String(e.area_id).slice(0, 24) : null,
    area_name: null,
    province: e.province ? String(e.province).slice(0, 40) : null,
    notes: (e.notes ?? '').slice(0, 80),
    created_at: e.created_at,
    status: e.status,
    status_th: e.status_th,
  };
}

/**
 * Drop oldest bookings first, but prefer keeping same-day peers of the newest
 * event so multiple bookings on one day are not overwritten by cookie shrink.
 */
function shrinkCalendarEvents(cur: StaffCalendarEvent[]): StaffCalendarEvent[] | null {
  if (cur.length <= 1) return null;
  const newestDate = cur[cur.length - 1]?.date;
  let dropIdx = -1;
  for (let i = 0; i < cur.length - 1; i++) {
    if (cur[i].date !== newestDate) {
      dropIdx = i;
      break;
    }
  }
  if (dropIdx < 0) dropIdx = 0; // all same day — drop oldest sibling, keep newest
  return cur.slice(0, dropIdx).concat(cur.slice(dropIdx + 1));
}

export async function readCalendarEvents(): Promise<StaffCalendarEvent[]> {
  // UAT: calendar lives in site_visit_events — cookie store unused
  if (isDbOnlyMode()) return [];
  return readJsonCookie<StaffCalendarEvent[]>(CALENDAR_EVENTS_COOKIE, []);
}

export async function writeCalendarEvents(events: StaffCalendarEvent[]) {
  const lean = events.map(leanCalendarEvent);
  // Cap list early — keep newest
  const capped = lean.length > 60 ? lean.slice(-60) : lean;
  await writeJsonCookieWithShrink(CALENDAR_EVENTS_COOKIE, capped, shrinkCalendarEvents);
}

export async function addCalendarEvent(
  event: Omit<StaffCalendarEvent, 'id' | 'created_at'>
): Promise<StaffCalendarEvent> {
  if (isDbOnlyMode()) {
    throw new Error('โหมด UAT ใช้ฐานข้อมูลเท่านั้น — เรียก insertSiteVisitEvent แทน');
  }
  const events = await readCalendarEvents();
  // Always append — multiple bookings on the same date (and school) are allowed
  const row: StaffCalendarEvent = leanCalendarEvent({
    ...event,
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
  });
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
  /** Set when the author edits after create */
  edited_at?: string | null;
  tags?: string[];
  /** Compressed public Storage URLs */
  image_urls?: string[];
  /** Linked calendar / site-visit event id */
  calendar_event_id?: string | null;
  /** School id when loaded from DB batch */
  school_id?: string;
  /** Explicit report date (YYYY-MM-DD) when available */
  report_date?: string | null;
  /** Actual onsite visit reasons */
  onsite_reasons?: string[];
  /** participant_id → reason labels */
  visitor_reason_map?: Record<string, string[]>;
  /** แนวทางการดำเนินงาน ณ หน้างาน */
  ops_notes?: string | null;
  /** Last edit audit */
  updated_at?: string | null;
  updated_by?: string | null;
  updated_by_name?: string | null;
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

function emptyExtras(): SchoolExtras {
  return {
    comments: [],
    swot: emptySchoolSwot(),
    achievements: { school: '', student: '' },
  };
}

type SchoolExtrasMap = Record<string, SchoolExtras>;
type SchoolCommentsMap = Record<string, SchoolComment[]>;

async function readExtrasMap(): Promise<SchoolExtrasMap> {
  return readJsonCookie<SchoolExtrasMap>(SCHOOL_EXTRAS_COOKIE, {});
}

async function writeExtrasMap(map: SchoolExtrasMap) {
  // SWOT/achievements only — comments live in SCHOOL_COMMENTS_COOKIE
  const slim: SchoolExtrasMap = {};
  for (const [key, row] of Object.entries(map)) {
    slim[key] = {
      comments: [],
      swot: normalizeSchoolSwot(row.swot),
      achievements: {
        school: row.achievements?.school ?? '',
        student: row.achievements?.student ?? '',
      },
    };
  }
  await writeJsonCookieWithShrink(SCHOOL_EXTRAS_COOKIE, slim, (cur) => {
    const keys = Object.keys(cur);
    if (!keys.length) return null;
    const next = { ...cur };
    delete next[keys[0]];
    return next;
  });
}

async function readCommentsMap(): Promise<SchoolCommentsMap> {
  const dedicated = await readJsonCookie<SchoolCommentsMap>(SCHOOL_COMMENTS_COOKIE, {});
  if (Object.keys(dedicated).length) return dedicated;

  // Migrate legacy comments embedded in extras cookie (one-time read path)
  const extras = await readExtrasMap();
  const migrated: SchoolCommentsMap = {};
  for (const [key, row] of Object.entries(extras)) {
    if (row?.comments?.length) migrated[key] = row.comments;
  }
  return migrated;
}

async function writeCommentsMap(map: SchoolCommentsMap) {
  await writeJsonCookieWithShrink(SCHOOL_COMMENTS_COOKIE, map, (cur) => {
    // Drop oldest comment across schools, or empty school keys
    let oldestKey: string | null = null;
    let oldestIdx = -1;
    let oldestAt = '';
    for (const [key, list] of Object.entries(cur)) {
      if (!list?.length) {
        const next = { ...cur };
        delete next[key];
        return next;
      }
      // lists are newest-first
      const last = list[list.length - 1];
      if (!oldestAt || last.created_at < oldestAt) {
        oldestAt = last.created_at;
        oldestKey = key;
        oldestIdx = list.length - 1;
      }
    }
    if (oldestKey == null || oldestIdx < 0) return null;
    const nextList = cur[oldestKey].slice(0, oldestIdx).concat(cur[oldestKey].slice(oldestIdx + 1));
    const next = { ...cur, [oldestKey]: nextList };
    if (!nextList.length) delete next[oldestKey];
    return next;
  });
}

export async function readSchoolExtras(schoolId: string | number): Promise<SchoolExtras> {
  const [extras, commentsMap] = await Promise.all([readExtrasMap(), readCommentsMap()]);
  const key = String(schoolId);
  const row = extras[key];
  const comments = commentsMap[key] ?? row?.comments ?? [];
  return {
    comments,
    swot: normalizeSchoolSwot(row?.swot),
    achievements: {
      school: row?.achievements?.school ?? '',
      student: row?.achievements?.student ?? '',
    },
  };
}

export async function readAllSchoolExtras(): Promise<SchoolExtrasMap> {
  const [extras, commentsMap] = await Promise.all([readExtrasMap(), readCommentsMap()]);
  const keys = new Set([...Object.keys(extras), ...Object.keys(commentsMap)]);
  const out: SchoolExtrasMap = {};
  for (const key of keys) {
    const row = extras[key];
    out[key] = {
      comments: commentsMap[key] ?? row?.comments ?? [],
      swot: normalizeSchoolSwot(row?.swot),
      achievements: {
        school: row?.achievements?.school ?? '',
        student: row?.achievements?.student ?? '',
      },
    };
  }
  return out;
}

export async function addSchoolComment(
  schoolId: string | number,
  input: {
    staff_id: string;
    staff_name: string;
    text: string;
    created_at?: string;
    tags?: string[];
  }
): Promise<SchoolComment> {
  const [comment] = await addSchoolComments(schoolId, [input]);
  return comment;
}

/** Add many comments in one cookie write (avoids same-request overwrite). */
export async function addSchoolComments(
  schoolId: string | number,
  inputs: {
    staff_id: string;
    staff_name: string;
    text: string;
    created_at?: string;
    tags?: string[];
  }[]
): Promise<SchoolComment[]> {
  if (!inputs.length) return [];
  const map = await readCommentsMap();
  const key = String(schoolId);
  const existing = map[key] ?? [];

  const now = Date.now();
  const created: SchoolComment[] = inputs.map((input, i) => {
    const created_at = input.created_at
      ? new Date(input.created_at).toISOString()
      : new Date(now + i).toISOString();
    return {
      id: `cmt-${now}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      staff_id: input.staff_id,
      staff_name: input.staff_name,
      text: input.text.trim(),
      created_at: Number.isNaN(Date.parse(created_at))
        ? new Date(now + i).toISOString()
        : created_at,
      edited_at: null,
      tags: input.tags ?? [],
    };
  });

  map[key] = [...created, ...existing].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
  await writeCommentsMap(map);
  return created;
}

export async function updateSchoolComment(
  schoolId: string | number,
  commentId: string,
  staffId: string,
  input: { text: string; tags?: string[] }
): Promise<SchoolComment | null> {
  const map = await readCommentsMap();
  const key = String(schoolId);
  const list = map[key] ?? [];
  const idx = list.findIndex((c) => c.id === commentId && c.staff_id === staffId);
  if (idx < 0) return null;
  const prev = list[idx];
  const now = new Date().toISOString();
  const next: SchoolComment = {
    ...prev,
    text: input.text.trim(),
    tags: input.tags ?? prev.tags ?? [],
    edited_at: now,
    updated_at: now,
    updated_by: staffId,
  };
  list[idx] = next;
  map[key] = list;
  await writeCommentsMap(map);
  return next;
}

export async function saveSchoolSwot(
  schoolId: string | number,
  swot: Partial<SchoolSwot> | SchoolSwot
): Promise<SchoolExtras> {
  const map = await readExtrasMap();
  const key = String(schoolId);
  const prev = map[key] ?? emptyExtras();
  map[key] = {
    comments: [],
    swot: normalizeSchoolSwot({ ...normalizeSchoolSwot(prev.swot), ...swot }),
    achievements: {
      school: prev.achievements?.school ?? '',
      student: prev.achievements?.student ?? '',
    },
  };
  await writeExtrasMap(map);
  return readSchoolExtras(key);
}

export async function saveSchoolAchievements(
  schoolId: string | number,
  achievements: Partial<SchoolAchievements>
): Promise<SchoolExtras> {
  const map = await readExtrasMap();
  const key = String(schoolId);
  const prev = map[key] ?? emptyExtras();
  map[key] = {
    comments: [],
    swot: normalizeSchoolSwot(prev.swot),
    achievements: {
      school: achievements.school ?? prev.achievements?.school ?? '',
      student: achievements.student ?? prev.achievements?.student ?? '',
    },
  };
  await writeExtrasMap(map);
  return readSchoolExtras(key);
}

export async function readReportDrafts(): Promise<ReportDraft[]> {
  return readJsonCookie<ReportDraft[]>(REPORT_DRAFTS_COOKIE, []);
}

async function writeReportDrafts(drafts: ReportDraft[]) {
  await writeJsonCookieWithShrink(REPORT_DRAFTS_COOKIE, drafts, (cur) =>
    cur.length > 1 ? cur.slice(0, -1) : null
  );
}

export async function listReportDraftsForStaff(staffId: string): Promise<ReportDraft[]> {
  if (isDbOnlyMode()) {
    const { fetchReportDraftsForStaff } = await import('@/lib/supabase/report-drafts');
    return fetchReportDraftsForStaff(staffId);
  }
  const all = await readReportDrafts();
  return all
    .filter((d) => d.staff_id === staffId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function getReportDraft(
  draftId: string,
  staffId: string
): Promise<ReportDraft | null> {
  if (isDbOnlyMode()) {
    const { fetchReportDraft } = await import('@/lib/supabase/report-drafts');
    return fetchReportDraft(draftId, staffId);
  }
  const all = await readReportDrafts();
  return all.find((d) => d.id === draftId && d.staff_id === staffId) ?? null;
}

export async function upsertReportDraft(
  input: Omit<ReportDraft, 'id' | 'updated_at'> & { id?: string }
): Promise<ReportDraft> {
  if (isDbOnlyMode()) {
    const { upsertReportDraftInDb } = await import('@/lib/supabase/report-drafts');
    const res = await upsertReportDraftInDb(input);
    if (!res.ok) throw new Error(res.error);
    return res.draft;
  }
  const all = await readReportDrafts();
  const now = new Date().toISOString();
  if (input.id) {
    const idx = all.findIndex((d) => d.id === input.id && d.staff_id === input.staff_id);
    if (idx >= 0) {
      const next: ReportDraft = {
        ...all[idx],
        ...input,
        id: input.id,
        updated_at: now,
      };
      all[idx] = next;
      await writeReportDrafts(all);
      return next;
    }
  }
  const row: ReportDraft = {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    staff_id: input.staff_id,
    school_id: input.school_id,
    school_name: input.school_name,
    province: input.province,
    district: input.district,
    report_date: input.report_date,
    boxes: input.boxes,
    updated_at: now,
  };
  all.unshift(row);
  await writeReportDrafts(all);
  return row;
}

export async function deleteReportDraft(
  draftId: string,
  staffId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isDbOnlyMode()) {
    const { deleteReportDraftInDb } = await import('@/lib/supabase/report-drafts');
    return deleteReportDraftInDb(draftId, staffId);
  }
  const all = await readReportDrafts();
  const next = all.filter((d) => !(d.id === draftId && d.staff_id === staffId));
  if (next.length === all.length) return { ok: false, error: 'ไม่พบร่างรายงาน' };
  await writeReportDrafts(next);
  return { ok: true };
}

export type { UserRole };
