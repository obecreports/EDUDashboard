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
  fetchSiteVisitsForStaff,
  insertSiteVisitEvent,
  updateSiteVisitStatus,
} from '@/lib/supabase/site-visits';
import {
  normalizeActivity,
  normalizeStatus,
  statusToLegacy,
  type VisitStatusThai,
} from '@/lib/visits/labels';
import { normalizeRole } from '@/lib/types';
import { isFieldRole } from '@/lib/auth/scope';

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

export async function createCalendarEventAction(formData: FormData) {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  if (!isAuthenticated || !profile || !isFieldRole(normalizeRole(role))) {
    return { ok: false as const, error: 'เฉพาะเจ้าหน้าที่ที่เข้าสู่ระบบแล้ว' };
  }

  const date = String(formData.get('date') || '');
  const activityRaw = String(formData.get('activity') || 'เยี่ยมชมโรงเรียน');
  const activity = normalizeActivity(activityRaw) as CalendarActivity;
  const notes = String(formData.get('notes') || '');
  const school_id = String(formData.get('school_id') || '') || null;
  const school_name = String(formData.get('school_name') || '') || null;
  const area_id = String(formData.get('area_id') || '') || null;
  const area_name = String(formData.get('area_name') || '') || null;
  const province = String(formData.get('province') || '') || null;

  const statusRaw = String(formData.get('status') || 'นัดหมายแล้ว');
  const status_th = normalizeStatus(statusRaw);
  const status = statusToLegacy(status_th);

  if (!date) return { ok: false as const, error: 'กรุณาเลือกวันที่' };
  if (!school_id) return { ok: false as const, error: 'กรุณาเลือกโรงเรียน' };
  if (!isDbUserId(profile.id)) {
    return {
      ok: false as const,
      error: 'บัญชีนี้ยังไม่อยู่ในฐานข้อมูล — รัน migration 007 แล้วเข้าสู่ระบบใหม่',
    };
  }

  try {
    const slimNotes = notes.trim().slice(0, 280);

    // Always INSERT — multiple bookings on the same date/school are allowed
    const db = await insertSiteVisitEvent({
      staffId: profile.id,
      schoolId: school_id,
      schoolName: school_name,
      areaId: area_id,
      visitDate: date,
      activityType: activity,
      status: status_th,
      notes: slimNotes,
    });
    if (!db.ok) {
      return { ok: false as const, error: db.error || 'บันทึกนัดหมายไม่สำเร็จ' };
    }

    // Offline/cookie fallback only when explicitly disabled DB-only mode
    if (!isDbOnlyMode()) {
      try {
        await addCalendarEvent({
          staff_id: profile.id,
          date,
          activity,
          school_id,
          school_name,
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
  const { profile, isAuthenticated } = await getSessionProfile();
  if (!isAuthenticated || !profile || !['staff', 'overseer', 'super_overseer'].includes(profile.role)) {
    return { ok: false, error: 'เฉพาะเจ้าหน้าที่ที่เข้าสู่ระบบแล้ว' };
  }
  const id = String(formData.get('id') || '');
  if (!id) return { ok: false, error: 'ไม่พบรายการ' };

  const status: VisitStatusThai = 'เยี่ยมชมเสร็จสิ้น';
  await updateSiteVisitStatus({ id, status });

  revalidatePath('/calendar');
  revalidatePath('/dashboard');
  return { ok: true as const };
}
