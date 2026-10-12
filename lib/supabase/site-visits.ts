import { createClient } from '@/lib/supabase/server';
import { isDbUserId, type StaffCalendarEvent } from '@/lib/auth/mock-users';
import {
  normalizeActivity,
  normalizeStatus,
  statusToLegacy,
  type VisitStatusThai,
} from '@/lib/visits/labels';

export type { VisitActivityType, VisitStatusThai } from '@/lib/visits/labels';
export {
  VISIT_ACTIVITIES,
  VISIT_STATUSES,
  normalizeActivity,
  normalizeStatus,
  statusToLegacy,
} from '@/lib/visits/labels';

type SiteVisitRow = {
  id: string;
  staff_id: string | null;
  school_id: number | string | null;
  school_name: string | null;
  area_id: string | null;
  visit_date: string;
  activity_type: string;
  status: string;
  notes: string | null;
  created_at: string;
};

function mapRow(row: SiteVisitRow): StaffCalendarEvent {
  const status = normalizeStatus(row.status);
  return {
    id: row.id,
    staff_id: row.staff_id ?? '',
    date: String(row.visit_date).slice(0, 10),
    activity: normalizeActivity(row.activity_type) as StaffCalendarEvent['activity'],
    school_id: row.school_id != null ? String(row.school_id) : null,
    school_name: row.school_name,
    area_id: row.area_id,
    area_name: null,
    province: null,
    notes: row.notes ?? '',
    created_at: row.created_at,
    status: statusToLegacy(status),
    status_th: status,
  };
}

function toSchoolId(schoolId: string | number | null | undefined): number | null {
  if (schoolId == null || schoolId === '') return null;
  const n = typeof schoolId === 'number' ? schoolId : Number(String(schoolId).trim());
  return Number.isFinite(n) ? n : null;
}

export async function fetchSiteVisitsForStaff(
  staffId: string
): Promise<StaffCalendarEvent[]> {
  if (!staffId || staffId === 'guest' || !isDbUserId(staffId)) {
    return [];
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('site_visit_events')
      .select(
        'id, staff_id, school_id, school_name, area_id, visit_date, activity_type, status, notes, created_at'
      )
      .eq('staff_id', staffId)
      .order('visit_date', { ascending: true });

    if (error || !data) return [];
    return (data as SiteVisitRow[]).map(mapRow);
  } catch {
    return [];
  }
}

export async function insertSiteVisitEvent(input: {
  staffId: string;
  schoolId: string | null;
  schoolName: string | null;
  areaId: string | null;
  visitDate: string;
  activityType: string;
  status?: VisitStatusThai;
  notes?: string;
}): Promise<{ ok: true; event: StaffCalendarEvent } | { ok: false; error: string }> {
  const schoolId = toSchoolId(input.schoolId);
  const staffId = isDbUserId(input.staffId) ? input.staffId : null;
  const status = input.status ?? 'นัดหมายแล้ว';
  if (!staffId) {
    return { ok: false, error: 'บัญชียังไม่อยู่ในฐานข้อมูล — รัน migration 007' };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('site_visit_events')
      .insert({
        staff_id: staffId,
        school_id: schoolId,
        school_name: input.schoolName,
        area_id: input.areaId,
        visit_date: input.visitDate,
        activity_type: normalizeActivity(input.activityType),
        status,
        notes: input.notes?.trim() || null,
      })
      .select(
        'id, staff_id, school_id, school_name, area_id, visit_date, activity_type, status, notes, created_at'
      )
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message || 'บันทึกกิจกรรมไม่สำเร็จ' };
    }
    return { ok: true, event: mapRow(data as SiteVisitRow) };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'บันทึกกิจกรรมไม่สำเร็จ',
    };
  }
}

/** Calendar / visit history for one school (read-only reference on school detail) */
export async function fetchSiteVisitsForSchool(
  schoolId: string | number
): Promise<StaffCalendarEvent[]> {
  const id = toSchoolId(schoolId);
  if (id == null) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('site_visit_events')
      .select(
        'id, staff_id, school_id, school_name, area_id, visit_date, activity_type, status, notes, created_at'
      )
      .eq('school_id', id)
      .order('visit_date', { ascending: false });
    if (error || !data) return [];
    return (data as SiteVisitRow[]).map(mapRow);
  } catch {
    return [];
  }
}

export async function updateSiteVisitStatus(params: {
  id: string;
  status: VisitStatusThai;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('site_visit_events')
      .update({ status: params.status })
      .eq('id', params.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'อัปเดตสถานะไม่สำเร็จ',
    };
  }
}
