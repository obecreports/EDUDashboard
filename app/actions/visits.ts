'use server';

import { revalidatePath } from 'next/cache';
import { getSessionProfile } from '@/lib/auth/session';
import { isDbOnlyMode } from '@/lib/auth/db-mode';
import { isDbUserId } from '@/lib/auth/mock-users';
import {
  addCalendarEvent,
  CookieTooLargeError,
  readCalendarEvents,
} from '@/lib/auth/user-store';
import type { CalendarActivity, StaffCalendarEvent } from '@/lib/auth/mock-users';
import { createClient } from '@/lib/supabase/server';
import {
  fetchSiteVisitById,
  fetchSiteVisitsForStaff,
  insertSiteVisitEvent,
  removeParticipantFromSiteVisit,
  updateSiteVisitEvent,
  updateSiteVisitStatus,
} from '@/lib/supabase/site-visits';
import {
  normalizeActivity,
  normalizeStatus,
  statusToLegacy,
  type VisitStatusThai,
} from '@/lib/visits/labels';
import { normalizeRole, type OverseerTier } from '@/lib/types';
import {
  assertSchoolInActionScope,
  assertSchoolsInActionScope,
  isFieldRole,
  scheduleInvitePeers,
  toScopeDirectory,
  type ScopeUser,
} from '@/lib/auth/scope';
import { canAccessSection } from '@/lib/auth/content-access';
import { readContentAccessMapStored } from '@/lib/auth/user-store';

async function requireCalendarCreateModify() {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  if (!isAuthenticated || !profile || !isFieldRole(normalizeRole(role))) {
    return { ok: false as const, error: 'เฉพาะเจ้าหน้าที่สนามเท่านั้น' };
  }
  const acl = await readContentAccessMapStored().catch(() => null);
  if (!canAccessSection(role, 'calendar', 'calendar_create', 'modify', acl ?? undefined)) {
    return {
      ok: false as const,
      error: 'ไม่มีสิทธิ์สร้างหรือจัดการนัดหมาย',
    };
  }
  return { ok: true as const, profile, role };
}

/** Clip invites to scheduleInvitePeers (+ keep non-SO → SO block). */
async function clipInviteParticipantIds(
  profile: {
    id: string;
    role: string;
    overseer_tier?: OverseerTier | string | null;
    assigned_provinces?: string[];
    assigned_districts?: string[];
    reports_to?: string | null;
  },
  role: string,
  participantIds: string[]
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  if (!participantIds.length) return { ok: true, ids: [] };

  const { fetchAllUserProfiles } = await import('@/lib/supabase/profiles');
  const { readStoredUsers } = await import('@/lib/auth/user-store');
  const { fetchSchools } = await import('@/lib/supabase/schools');
  const users = isDbOnlyMode()
    ? await fetchAllUserProfiles().catch(() => [])
    : await readStoredUsers().catch(() => []);
  const schools = await fetchSchools().catch(() => []);
  const directory = toScopeDirectory(users);
  const me: ScopeUser = directory.find((u) => u.id === profile.id) ?? {
    id: profile.id,
    role: normalizeRole(role),
    overseer_tier: (profile.overseer_tier as OverseerTier | null | undefined) ?? null,
    assigned_provinces: profile.assigned_provinces ?? [],
    assigned_districts: profile.assigned_districts ?? [],
    reports_to: profile.reports_to ?? null,
  };
  const allowed = new Set(scheduleInvitePeers(me, directory, schools));
  const creatorRole = normalizeRole(role);
  const soIds = new Set(
    users.filter((u) => normalizeRole(u.role) === 'super_overseer').map((u) => u.id)
  );

  if (creatorRole !== 'super_overseer' && participantIds.some((id) => soIds.has(id))) {
    return {
      ok: false,
      error: 'ไม่สามารถเชิญประธานโครงการ (SO) เป็นผู้ร่วมได้',
    };
  }

  const clipped = [
    ...new Set(
      participantIds.filter(
        (id) => id !== profile.id && allowed.has(id) && (creatorRole === 'super_overseer' || !soIds.has(id))
      )
    ),
  ];
  return { ok: true, ids: clipped };
}

export async function createVisitLog(formData: FormData) {
  const schoolId = Number(formData.get('school_id'));
  const notes = String(formData.get('notes') || '');
  const status = String(formData.get('survey_status') || 'Pending');
  const { profile, isAuthenticated } = await getSessionProfile();

  if (!isAuthenticated || !profile || profile.id === 'guest') {
    return { ok: false, error: 'ต้องเข้าสู่ระบบก่อนบันทึก' };
  }

  const activity: CalendarActivity =
    status === 'Surveyed' ? 'สำรวจข้อมูล' : 'เยี่ยมชมโรงเรียน';
  const date = new Date().toISOString().slice(0, 10);
  const slimNotes = notes.trim().slice(0, 280);

  if (!isDbUserId(profile.id)) {
    return { ok: false, error: 'บัญชีนี้ยังไม่อยู่ในฐานข้อมูล — รัน migration 007' };
  }

  const schoolGate = await assertSchoolInActionScope(profile, schoolId);
  if (!schoolGate.ok) return { ok: false, error: schoolGate.error };

  const db = await insertSiteVisitEvent({
    staffId: profile.id,
    schoolId: String(schoolId),
    schoolName: String(formData.get('school_name') || '') || null,
    areaId: String(formData.get('area_id') || '') || null,
    visitDate: date,
    activityType: activity,
    status: 'เยี่ยมชมเสร็จสิ้น',
    notes: slimNotes,
  });
  if (!db.ok) return { ok: false, error: db.error };

  const supabase = await createClient();
  await supabase.from('school_visit_logs').insert({
    school_id: schoolId,
    staff_id: profile.id,
    notes: slimNotes,
    survey_status: status,
    visit_date: new Date().toISOString(),
    photo_urls: [],
  });

  revalidatePath('/dashboard');
  revalidatePath('/calendar');
  revalidatePath('/reports');
  return { ok: true };
}

function parseJsonStringArray(raw: FormDataEntryValue | null): string[] {
  if (raw == null || raw === '') return [];
  const text = String(raw);
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map((x) => String(x).trim()).filter(Boolean);
    }
  } catch {
    /* fall through */
  }
  return text
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function createCalendarEventAction(formData: FormData) {
  const gate = await requireCalendarCreateModify();
  if (!gate.ok) return gate;
  const { profile, role } = gate;

  const date = String(formData.get('date') || '');
  const notes = String(formData.get('notes') || '');
  const area_id = String(formData.get('area_id') || '') || null;
  const area_name = String(formData.get('area_name') || '') || null;
  const province = String(formData.get('province') || '') || null;

  const schoolIdsRaw = parseJsonStringArray(formData.get('school_ids'));
  const legacySchoolId = String(formData.get('school_id') || '') || null;
  if (!schoolIdsRaw.length && legacySchoolId) schoolIdsRaw.push(legacySchoolId);
  // Single-school only — keep first id for schema array compatibility
  const schoolIds = schoolIdsRaw.slice(0, 1);

  const schoolNames = parseJsonStringArray(formData.get('school_names')).slice(0, 1);
  const school_name =
    schoolNames[0] || String(formData.get('school_name') || '') || null;

  const visitReasons = parseJsonStringArray(formData.get('visit_reasons'));
  const activityRaw = String(formData.get('activity') || visitReasons[0] || 'เยี่ยมชมโรงเรียน');
  if (!visitReasons.length) visitReasons.push(normalizeActivity(activityRaw));
  const activity = normalizeActivity(visitReasons[0] || activityRaw) as CalendarActivity;

  let participantIds = parseJsonStringArray(formData.get('participant_ids'));

  const statusRaw = String(formData.get('status') || 'นัดหมายแล้ว');
  const status_th = normalizeStatus(statusRaw);
  const status = statusToLegacy(status_th);

  if (!date) return { ok: false as const, error: 'กรุณาเลือกวันที่' };
  if (!schoolIds.length) return { ok: false as const, error: 'กรุณาเลือกโรงเรียน 1 แห่ง' };
  if (schoolIdsRaw.length > 1) {
    return { ok: false as const, error: 'เลือกได้เพียง 1 โรงเรียนต่อนัดหมาย' };
  }
  if (!visitReasons.length) return { ok: false as const, error: 'กรุณาเลือกเหตุผลการลงพื้นที่อย่างน้อย 1 รายการ' };
  if (!isDbUserId(profile.id)) {
    return {
      ok: false as const,
      error: 'บัญชีนี้ยังไม่อยู่ในฐานข้อมูล — รัน migration 007 แล้วเข้าสู่ระบบใหม่',
    };
  }

  const schoolGate = await assertSchoolsInActionScope(profile, schoolIdsRaw);
  if (!schoolGate.ok) return { ok: false as const, error: schoolGate.error };

  const inviteGate = await clipInviteParticipantIds(profile, role, participantIds);
  if (!inviteGate.ok) return { ok: false as const, error: inviteGate.error };
  participantIds = inviteGate.ids;

  try {
    const slimNotes = notes.trim().slice(0, 280);
    const school_id = schoolIds[0];

    const db = await insertSiteVisitEvent({
      staffId: profile.id,
      schoolId: school_id,
      schoolIds,
      schoolName: school_name,
      areaId: area_id,
      visitDate: date,
      activityType: activity,
      visitReasons,
      participantIds,
      provinceName: province,
      status: status_th,
      notes: slimNotes,
    });
    if (!db.ok) {
      return { ok: false as const, error: db.error || 'บันทึกนัดหมายไม่สำเร็จ' };
    }

    if (!isDbOnlyMode()) {
      try {
        await addCalendarEvent({
          staff_id: profile.id,
          date,
          activity,
          school_id,
          school_name,
          school_ids: schoolIds,
          school_names: schoolNames,
          visit_reasons: visitReasons,
          participant_ids: [profile.id, ...participantIds],
          area_id,
          area_name,
          province,
          notes: slimNotes,
          status,
          status_th,
        });
      } catch {
        /* ignore cookie mirror failures in hybrid mode */
      }
    }

    revalidatePath('/calendar');
    revalidatePath('/dashboard');
    revalidatePath('/schools');
    return { ok: true as const, event: db.event };
  } catch (e) {
    if (e instanceof CookieTooLargeError) {
      return {
        ok: false as const,
        error: 'คุกกี้เบราว์เซอร์เต็ม — ใช้โหมดฐานข้อมูล (ค่าเริ่มต้น UAT)',
      };
    }
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : 'บันทึกนัดหมายไม่สำเร็จ',
    };
  }
}

/** Owner-only update of an existing schedule. */
export async function updateCalendarEventAction(formData: FormData) {
  const gate = await requireCalendarCreateModify();
  if (!gate.ok) return gate;
  const { profile, role } = gate;

  const id = String(formData.get('id') || '');
  if (!id) return { ok: false as const, error: 'ไม่พบนัดหมาย' };

  const existing = await fetchSiteVisitById(id);
  if (!existing) return { ok: false as const, error: 'ไม่พบนัดหมาย' };
  if (existing.staff_id !== profile.id) {
    return { ok: false as const, error: 'เฉพาะเจ้าของนัดเท่านั้นที่แก้ไขได้' };
  }

  const date = String(formData.get('date') || '');
  const notes = String(formData.get('notes') || '');
  const area_id = String(formData.get('area_id') || '') || null;
  const province = String(formData.get('province') || '') || null;

  const schoolIdsRaw = parseJsonStringArray(formData.get('school_ids'));
  const legacySchoolId = String(formData.get('school_id') || '') || null;
  if (!schoolIdsRaw.length && legacySchoolId) schoolIdsRaw.push(legacySchoolId);
  const schoolIds = schoolIdsRaw.slice(0, 1);
  const schoolNames = parseJsonStringArray(formData.get('school_names')).slice(0, 1);
  const school_name =
    schoolNames[0] || String(formData.get('school_name') || '') || null;

  const visitReasons = parseJsonStringArray(formData.get('visit_reasons'));
  const activityRaw = String(formData.get('activity') || visitReasons[0] || 'เยี่ยมชมโรงเรียน');
  if (!visitReasons.length) visitReasons.push(normalizeActivity(activityRaw));
  const activity = normalizeActivity(visitReasons[0] || activityRaw) as CalendarActivity;

  let participantIds = parseJsonStringArray(formData.get('participant_ids'));

  if (!date) return { ok: false as const, error: 'กรุณาเลือกวันที่' };
  if (!schoolIds.length) return { ok: false as const, error: 'กรุณาเลือกโรงเรียน 1 แห่ง' };
  if (!visitReasons.length) {
    return { ok: false as const, error: 'กรุณาเลือกเหตุผลการลงพื้นที่อย่างน้อย 1 รายการ' };
  }

  const schoolGate = await assertSchoolsInActionScope(profile, schoolIdsRaw);
  if (!schoolGate.ok) return { ok: false as const, error: schoolGate.error };

  const inviteGate = await clipInviteParticipantIds(profile, role, participantIds);
  if (!inviteGate.ok) return { ok: false as const, error: inviteGate.error };
  participantIds = inviteGate.ids;

  const allParticipants = [...new Set([profile.id, ...participantIds])];
  const slimNotes = notes.trim().slice(0, 280);
  const school_id = schoolIds[0]!;

  const db = await updateSiteVisitEvent({
    id,
    schoolId: school_id,
    schoolIds,
    schoolName: school_name,
    areaId: area_id,
    visitDate: date,
    activityType: activity,
    visitReasons,
    participantIds: allParticipants,
    provinceName: province,
    notes: slimNotes,
  });
  if (!db.ok) return { ok: false as const, error: db.error || 'แก้ไขนัดหมายไม่สำเร็จ' };

  if (!isDbOnlyMode()) {
    try {
      const { writeCalendarEvents } = await import('@/lib/auth/user-store');
      const all = await readCalendarEvents();
      await writeCalendarEvents(
        all.map((e) =>
          e.id === id
            ? {
                ...e,
                date,
                activity,
                school_id,
                school_name,
                school_ids: schoolIds,
                school_names: schoolNames,
                visit_reasons: visitReasons,
                participant_ids: allParticipants,
                area_id,
                province,
                notes: slimNotes,
              }
            : e
        )
      );
    } catch {
      /* ignore */
    }
  }

  revalidatePath('/calendar');
  revalidatePath('/dashboard');
  return { ok: true as const, event: db.event };
}

function mergeEvents(db: StaffCalendarEvent[], cookie: StaffCalendarEvent[]): StaffCalendarEvent[] {
  const map = new Map<string, StaffCalendarEvent>();
  cookie.forEach((e) => map.set(e.id, e));
  db.forEach((e) => map.set(e.id, e));
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function listMyCalendarEvents(): Promise<StaffCalendarEvent[]> {
  const { profile, isAuthenticated } = await getSessionProfile();
  if (!isAuthenticated || !profile) return [];

  const db = await fetchSiteVisitsForStaff(profile.id);
  if (isDbOnlyMode()) return db;

  const cookie = (await readCalendarEvents())
    .filter((e) => e.staff_id === profile.id)
    .map((e) => ({
      ...e,
      activity: normalizeActivity(String(e.activity)) as CalendarActivity,
      status_th: e.status_th ?? normalizeStatus(e.status),
      status: statusToLegacy(e.status_th ?? normalizeStatus(e.status)),
    }));

  return mergeEvents(db, cookie);
}

/** Peer calendar events from DB (and cookie only when not DB-only). */
export async function listAllCookieCalendarEvents(): Promise<StaffCalendarEvent[]> {
  const { isAuthenticated, profile } = await getSessionProfile();
  if (!isAuthenticated || !profile) return [];

  if (isDbOnlyMode()) {
    // Load all field-staff visits visible to peers — fetch per peer on calendar page instead.
    // Here return current user's DB events; calendar page merges peer queries.
    return fetchSiteVisitsForStaff(profile.id);
  }

  return (await readCalendarEvents()).map((e) => ({
    ...e,
    activity: normalizeActivity(String(e.activity)) as CalendarActivity,
    status_th: e.status_th ?? normalizeStatus(e.status),
    status: statusToLegacy(e.status_th ?? normalizeStatus(e.status)),
  }));
}

export async function listCalendarEventsForStaffIds(
  staffIds: string[]
): Promise<StaffCalendarEvent[]> {
  const ids = [...new Set(staffIds.filter(isDbUserId))];
  if (!ids.length) return [];
  const batches = await Promise.all(ids.map((id) => fetchSiteVisitsForStaff(id)));
  const map = new Map<string, StaffCalendarEvent>();
  for (const list of batches) {
    for (const e of list) map.set(e.id, e);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function markVisitCompletedAction(formData: FormData) {
  const gate = await requireCalendarCreateModify();
  if (!gate.ok) return gate;
  const { profile } = gate;

  const id = String(formData.get('id') || '');
  if (!id) return { ok: false as const, error: 'ไม่พบรายการ' };

  const event = await fetchSiteVisitById(id);
  if (!event) return { ok: false as const, error: 'ไม่พบนัดหมาย' };
  const parts = event.participant_ids ?? [];
  const isOwner = event.staff_id === profile.id;
  const isParticipant = parts.includes(profile.id);
  if (!isOwner && !isParticipant) {
    return { ok: false as const, error: 'ไม่มีสิทธิ์อัปเดตนัดหมายนี้' };
  }

  const status: VisitStatusThai = 'เยี่ยมชมเสร็จสิ้น';
  const res = await updateSiteVisitStatus({ id, status });
  if (!res.ok) return { ok: false as const, error: res.error };

  revalidatePath('/calendar');
  revalidatePath('/dashboard');
  return { ok: true as const };
}

/** Owner cancels — event disappears for all participants. */
export async function cancelVisitEventAction(formData: FormData) {
  const gate = await requireCalendarCreateModify();
  if (!gate.ok) return gate;
  const { profile } = gate;
  const id = String(formData.get('id') || '');
  if (!id) return { ok: false as const, error: 'ไม่พบรายการ' };

  const event = await fetchSiteVisitById(id);
  if (!event) return { ok: false as const, error: 'ไม่พบนัดหมาย' };
  if (event.staff_id !== profile.id) {
    return { ok: false as const, error: 'เฉพาะเจ้าของนัดเท่านั้นที่ยกเลิกได้' };
  }

  const status: VisitStatusThai = 'ยกเลิก';
  const res = await updateSiteVisitStatus({ id, status });
  if (!res.ok) return { ok: false as const, error: res.error };

  if (!isDbOnlyMode()) {
    try {
      const { writeCalendarEvents } = await import('@/lib/auth/user-store');
      const all = await readCalendarEvents();
      await writeCalendarEvents(
        all.map((e) =>
          e.id === id
            ? { ...e, status_th: status, status: statusToLegacy(status) }
            : e
        )
      );
    } catch {
      /* ignore cookie mirror */
    }
  }

  revalidatePath('/calendar');
  revalidatePath('/dashboard');
  return { ok: true as const };
}

/** Non-owner participant leaves — remove only from their calendar. */
export async function leaveVisitEventAction(formData: FormData) {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  if (!isAuthenticated || !profile || !isFieldRole(normalizeRole(role))) {
    return { ok: false as const, error: 'เฉพาะเจ้าหน้าที่ที่เข้าสู่ระบบแล้ว' };
  }
  const id = String(formData.get('id') || '');
  if (!id) return { ok: false as const, error: 'ไม่พบรายการ' };

  const event = await fetchSiteVisitById(id);
  if (!event) return { ok: false as const, error: 'ไม่พบนัดหมาย' };
  if (event.staff_id === profile.id) {
    return {
      ok: false as const,
      error: 'เจ้าของนัดไม่สามารถออกจากนัดได้ — ใช้ยกเลิกนัดแทน',
    };
  }
  const parts = event.participant_ids ?? [];
  if (!parts.includes(profile.id)) {
    return { ok: false as const, error: 'คุณไม่ได้อยู่ในทีมของนัดนี้' };
  }

  const res = await removeParticipantFromSiteVisit({
    id,
    participantId: profile.id,
  });
  if (!res.ok) return { ok: false as const, error: res.error };

  if (!isDbOnlyMode()) {
    try {
      const { writeCalendarEvents } = await import('@/lib/auth/user-store');
      const all = await readCalendarEvents();
      await writeCalendarEvents(
        all.map((e) => {
          if (e.id !== id) return e;
          const nextParts = (e.participant_ids ?? []).filter((pid) => pid !== profile.id);
          if (e.staff_id && !nextParts.includes(e.staff_id)) nextParts.unshift(e.staff_id);
          return { ...e, participant_ids: nextParts };
        })
      );
    } catch {
      /* ignore */
    }
  }

  revalidatePath('/calendar');
  revalidatePath('/dashboard');
  return { ok: true as const };
}
