'use server';

import { revalidatePath } from 'next/cache';
import { getSessionProfile } from '@/lib/auth/session';
import { addCalendarEvent, readCalendarEvents } from '@/lib/auth/user-store';
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

  await addCalendarEvent({
    staff_id: profile.id,
    date,
    activity,
    school_id: String(schoolId),
    school_name: String(formData.get('school_name') || `School #${schoolId}`),
    area_id: String(formData.get('area_id') || '') || null,
    area_name: String(formData.get('area_name') || '') || null,
    province: String(formData.get('province') || '') || null,
    notes,
    status: 'completed',
    status_th: 'เยี่ยมชมเสร็จสิ้น',
  });

  await insertSiteVisitEvent({
    staffId: profile.id,
    schoolId: String(schoolId),
    schoolName: String(formData.get('school_name') || '') || null,
    areaId: String(formData.get('area_id') || '') || null,
    visitDate: date,
    activityType: activity,
    status: 'เยี่ยมชมเสร็จสิ้น',
    notes,
  });

  if (!profile.id.startsWith('mock-')) {
    const supabase = await createClient();
    await supabase.from('school_visit_logs').insert({
      school_id: schoolId,
      staff_id: profile.id,
      notes,
      survey_status: status,
      visit_date: new Date().toISOString(),
      photo_urls: [],
    });
  }

  revalidatePath('/staff/dashboard');
  revalidatePath('/staff/calendar');
  revalidatePath('/staff/update-school');
  return { ok: true };
}

export async function createCalendarEventAction(formData: FormData) {
  const { profile, isAuthenticated } = await getSessionProfile();
  if (!isAuthenticated || !profile || profile.role !== 'staff') {
    return { ok: false, error: 'เฉพาะเจ้าหน้าที่ที่เข้าสู่ระบบแล้ว' };
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

  if (!date) return { ok: false, error: 'กรุณาเลือกวันที่' };
  if (!school_id) return { ok: false, error: 'กรุณาเลือกโรงเรียน' };

  const cookieRow = await addCalendarEvent({
    staff_id: profile.id,
    date,
    activity,
    school_id,
    school_name,
    area_id,
    area_name,
    province,
    notes,
    status,
    status_th,
  });

  const db = await insertSiteVisitEvent({
    staffId: profile.id,
    schoolId: school_id,
    schoolName: school_name,
    areaId: area_id,
    visitDate: date,
    activityType: activity,
    status: status_th,
    notes,
  });

  revalidatePath('/staff/calendar');
  revalidatePath('/staff/dashboard');

  if (db.ok) {
    return { ok: true as const, event: db.event };
  }

  return {
    ok: true as const,
    event: cookieRow,
    warning: db.error,
  };
}

function mergeEvents(db: StaffCalendarEvent[], cookie: StaffCalendarEvent[]): StaffCalendarEvent[] {
  const map = new Map<string, StaffCalendarEvent>();
  cookie.forEach((e) => map.set(e.id, e));
  db.forEach((e) => map.set(e.id, e));
  // Prefer DB rows; also keep cookie-only local-* ids
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function listMyCalendarEvents(): Promise<StaffCalendarEvent[]> {
  const { profile, isAuthenticated } = await getSessionProfile();
  if (!isAuthenticated || !profile) return [];

  const cookie = (await readCalendarEvents())
    .filter((e) => e.staff_id === profile.id)
    .map((e) => ({
      ...e,
      activity: normalizeActivity(String(e.activity)) as CalendarActivity,
      status_th: e.status_th ?? normalizeStatus(e.status),
      status: statusToLegacy(e.status_th ?? normalizeStatus(e.status)),
    }));

  const db = await fetchSiteVisitsForStaff(profile.id);
  return mergeEvents(db, cookie);
}

export async function markVisitCompletedAction(formData: FormData) {
  const { profile, isAuthenticated } = await getSessionProfile();
  if (!isAuthenticated || !profile || profile.role !== 'staff') {
    return { ok: false, error: 'เฉพาะเจ้าหน้าที่ที่เข้าสู่ระบบแล้ว' };
  }
  const id = String(formData.get('id') || '');
  if (!id) return { ok: false, error: 'ไม่พบรายการ' };

  const status: VisitStatusThai = 'เยี่ยมชมเสร็จสิ้น';
  await updateSiteVisitStatus({ id, status });

  revalidatePath('/staff/calendar');
  revalidatePath('/staff/dashboard');
  return { ok: true as const };
}
