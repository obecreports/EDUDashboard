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
  school_ids?: number[] | string[] | null;
  visit_reasons?: string[] | null;
  participant_ids?: string[] | null;
  group_id?: string | null;
  province_name?: string | null;
  area_id: string | null;
  visit_date: string;
  activity_type: string;
  status: string;
  notes: string | null;
  created_at: string;
};

const SELECT_COLS =
  'id, staff_id, school_id, school_name, school_ids, visit_reasons, participant_ids, group_id, province_name, area_id, visit_date, activity_type, status, notes, created_at';

function asStringIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x)).filter(Boolean);
}

function mapRow(row: SiteVisitRow): StaffCalendarEvent {
  const status = normalizeStatus(row.status);
  const reasons =
    Array.isArray(row.visit_reasons) && row.visit_reasons.length
      ? row.visit_reasons.map((r) => normalizeActivity(String(r)))
      : [normalizeActivity(row.activity_type)];
  const schoolIds = asStringIds(row.school_ids);
  if (row.school_id != null && !schoolIds.includes(String(row.school_id))) {
    schoolIds.unshift(String(row.school_id));
  }
  const participants = asStringIds(row.participant_ids);
  if (row.staff_id && !participants.includes(row.staff_id)) {
    participants.unshift(row.staff_id);
  }
  const primaryActivity = (reasons[0] || normalizeActivity(row.activity_type)) as StaffCalendarEvent['activity'];
  return {
    id: row.id,
    staff_id: row.staff_id ?? '',
    date: String(row.visit_date).slice(0, 10),
    activity: primaryActivity,
    visit_reasons: reasons,
    school_id: row.school_id != null ? String(row.school_id) : schoolIds[0] ?? null,
    school_ids: schoolIds,
    school_name: row.school_name,
    school_names: row.school_name ? [row.school_name] : [],
    area_id: row.area_id,
    area_name: null,
    province: row.province_name ?? null,
    participant_ids: participants,
    group_id: row.group_id ?? null,
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

function toSchoolIdArray(ids: (string | number)[]): number[] {
  const out: number[] = [];
  for (const id of ids) {
    const n = toSchoolId(id);
    if (n != null && !out.includes(n)) out.push(n);
  }
  return out;
}

export async function fetchSiteVisitsForStaff(
  staffId: string
): Promise<StaffCalendarEvent[]> {
  if (!staffId || staffId === 'guest' || !isDbUserId(staffId)) {
    return [];
  }

  try {
    const supabase = await createClient();
    // Booker OR listed participant — so team members see the shared visit
    const { data, error } = await supabase
      .from('site_visit_events')
      .select(SELECT_COLS)
      .or(`staff_id.eq.${staffId},participant_ids.cs.{${staffId}}`)
      .order('visit_date', { ascending: true });

    if (error || !data) {
      // Fallback if participant_ids column missing (pre-017)
      const legacy = await supabase
        .from('site_visit_events')
        .select(
          'id, staff_id, school_id, school_name, area_id, visit_date, activity_type, status, notes, created_at'
        )
        .eq('staff_id', staffId)
        .order('visit_date', { ascending: true });
      if (legacy.error || !legacy.data) return [];
      return (legacy.data as SiteVisitRow[]).map(mapRow);
    }
    return (data as SiteVisitRow[]).map(mapRow);
  } catch {
    return [];
  }
}

export async function insertSiteVisitEvent(input: {
  staffId: string;
  schoolId: string | null;
  schoolIds?: string[];
  schoolName: string | null;
  areaId: string | null;
  visitDate: string;
  activityType: string;
  visitReasons?: string[];
  participantIds?: string[];
  provinceName?: string | null;
  groupId?: string | null;
  status?: VisitStatusThai;
  notes?: string;
}): Promise<{ ok: true; event: StaffCalendarEvent } | { ok: false; error: string }> {
  const schoolIds = toSchoolIdArray(
    input.schoolIds?.length ? input.schoolIds : input.schoolId ? [input.schoolId] : []
  );
  const schoolId = schoolIds[0] ?? toSchoolId(input.schoolId);
  const staffId = isDbUserId(input.staffId) ? input.staffId : null;
  const status = input.status ?? 'นัดหมายแล้ว';
  if (!staffId) {
    return { ok: false, error: 'บัญชียังไม่อยู่ในฐานข้อมูล — รัน migration 007' };
  }

  const reasons = (input.visitReasons?.length
    ? input.visitReasons
    : [input.activityType]
  )
    .map((r) => normalizeActivity(r.trim()))
    .filter(Boolean);
  const primaryActivity = reasons[0] || normalizeActivity(input.activityType);

  const participants = [
    ...new Set(
      [staffId, ...(input.participantIds ?? [])].filter((id) => isDbUserId(id))
    ),
  ];

  try {
    const supabase = await createClient();
    const payload: Record<string, unknown> = {
      staff_id: staffId,
      school_id: schoolId,
      school_name: input.schoolName,
      area_id: input.areaId,
      visit_date: input.visitDate,
      activity_type: primaryActivity,
      status,
      notes: input.notes?.trim() || null,
      school_ids: schoolIds,
      visit_reasons: reasons,
      participant_ids: participants,
      province_name: input.provinceName?.trim() || null,
      group_id: input.groupId ?? null,
    };

    const { data, error } = await supabase
      .from('site_visit_events')
      .insert(payload)
      .select(SELECT_COLS)
      .single();

    if (error || !data) {
      // Retry without new columns if migration 017 not applied yet
      if (error && /school_ids|visit_reasons|participant_ids|province_name|group_id/i.test(error.message)) {
        const legacy = await supabase
          .from('site_visit_events')
          .insert({
            staff_id: staffId,
            school_id: schoolId,
            school_name: input.schoolName,
            area_id: input.areaId,
            visit_date: input.visitDate,
            activity_type: primaryActivity,
            status,
            notes: input.notes?.trim() || null,
          })
          .select(
            'id, staff_id, school_id, school_name, area_id, visit_date, activity_type, status, notes, created_at'
          )
          .single();
        if (legacy.error || !legacy.data) {
          return { ok: false, error: legacy.error?.message || error.message };
        }
        return { ok: true, event: mapRow(legacy.data as SiteVisitRow) };
      }
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

export async function updateSiteVisitEvent(input: {
  id: string;
  schoolId: string | null;
  schoolIds?: string[];
  schoolName: string | null;
  areaId: string | null;
  visitDate: string;
  activityType: string;
  visitReasons?: string[];
  participantIds?: string[];
  provinceName?: string | null;
  notes?: string;
}): Promise<{ ok: true; event: StaffCalendarEvent } | { ok: false; error: string }> {
  const schoolIds = toSchoolIdArray(
    input.schoolIds?.length ? input.schoolIds : input.schoolId ? [input.schoolId] : []
  );
  const schoolId = schoolIds[0] ?? toSchoolId(input.schoolId);
  const reasons = (input.visitReasons?.length
    ? input.visitReasons
    : [input.activityType]
  )
    .map((r) => normalizeActivity(r.trim()))
    .filter(Boolean);
  const primaryActivity = reasons[0] || normalizeActivity(input.activityType);
  const participants = [
    ...new Set((input.participantIds ?? []).filter((id) => isDbUserId(id))),
  ];

  try {
    const supabase = await createClient();
    const payload: Record<string, unknown> = {
      school_id: schoolId,
      school_name: input.schoolName,
      area_id: input.areaId,
      visit_date: input.visitDate,
      activity_type: primaryActivity,
      notes: input.notes?.trim() || null,
      school_ids: schoolIds,
      visit_reasons: reasons,
      participant_ids: participants,
      province_name: input.provinceName?.trim() || null,
    };

    const { data, error } = await supabase
      .from('site_visit_events')
      .update(payload)
      .eq('id', input.id)
      .select(SELECT_COLS)
      .single();

    if (error || !data) {
      if (error && /school_ids|visit_reasons|participant_ids|province_name/i.test(error.message)) {
        const legacy = await supabase
          .from('site_visit_events')
          .update({
            school_id: schoolId,
            school_name: input.schoolName,
            area_id: input.areaId,
            visit_date: input.visitDate,
            activity_type: primaryActivity,
            notes: input.notes?.trim() || null,
          })
          .eq('id', input.id)
          .select(
            'id, staff_id, school_id, school_name, area_id, visit_date, activity_type, status, notes, created_at'
          )
          .single();
        if (legacy.error || !legacy.data) {
          return { ok: false, error: legacy.error?.message || error.message };
        }
        return { ok: true, event: mapRow(legacy.data as SiteVisitRow) };
      }
      return { ok: false, error: error?.message || 'อัปเดตนัดหมายไม่สำเร็จ' };
    }
    return { ok: true, event: mapRow(data as SiteVisitRow) };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'อัปเดตนัดหมายไม่สำเร็จ',
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
      .select(SELECT_COLS)
      .or(`school_id.eq.${id},school_ids.cs.{${id}}`)
      .order('visit_date', { ascending: false });
    if (error || !data) {
      const legacy = await supabase
        .from('site_visit_events')
        .select(
          'id, staff_id, school_id, school_name, area_id, visit_date, activity_type, status, notes, created_at'
        )
        .eq('school_id', id)
        .order('visit_date', { ascending: false });
      if (legacy.error || !legacy.data) return [];
      return (legacy.data as SiteVisitRow[]).map(mapRow);
    }
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

export async function fetchSiteVisitById(
  id: string
): Promise<StaffCalendarEvent | null> {
  if (!id) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('site_visit_events')
      .select(SELECT_COLS)
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return mapRow(data as SiteVisitRow);
  } catch {
    return null;
  }
}

/** Remove a non-owner participant from the shared visit (keeps event for others). */
export async function removeParticipantFromSiteVisit(params: {
  id: string;
  participantId: string;
}): Promise<{ ok: true; event: StaffCalendarEvent } | { ok: false; error: string }> {
  const event = await fetchSiteVisitById(params.id);
  if (!event) return { ok: false, error: 'ไม่พบนัดหมาย' };
  if (event.staff_id === params.participantId) {
    return { ok: false, error: 'เจ้าของนัดไม่สามารถออกจากนัดได้ — ใช้ยกเลิกนัดแทน' };
  }
  const next = (event.participant_ids ?? []).filter((id) => id !== params.participantId);
  // Always keep booker in the list
  if (event.staff_id && !next.includes(event.staff_id)) {
    next.unshift(event.staff_id);
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('site_visit_events')
      .update({ participant_ids: next })
      .eq('id', params.id)
      .select(SELECT_COLS)
      .single();
    if (error || !data) {
      return { ok: false, error: error?.message || 'อัปเดตสมาชิกทีมไม่สำเร็จ' };
    }
    return { ok: true, event: mapRow(data as SiteVisitRow) };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'อัปเดตสมาชิกทีมไม่สำเร็จ',
    };
  }
}
