import { createClient } from '@/lib/supabase/server';
import { isDbUserId } from '@/lib/auth/mock-users';
import type { SchoolComment, SchoolSwot } from '@/lib/auth/user-store';
import {
  emptySchoolSwot,
  flattenSwotForDb,
  normalizeSchoolSwot,
  swotHasContent,
} from '@/lib/swot/schema';

export const EMPTY_CLASSIC_SWOT: SchoolSwot = emptySchoolSwot();

type SwotRow = {
  school_id: number | string;
  categories?: unknown;
  internal_strengths?: string | null;
  internal_weaknesses?: string | null;
  external_strengths?: string | null;
  /** @deprecated pre-006 */
  external_opportunities?: string | null;
  external_threats?: string | null;
  updated_at?: string;
};

type CommentRow = {
  id: string;
  school_id: number | string;
  staff_id: string | null;
  staff_name: string | null;
  comment_text: string;
  created_at: string;
  tags?: string[] | null;
  report_date?: string | null;
  edited_at?: string | null;
  image_urls?: string[] | null;
  calendar_event_id?: string | null;
  onsite_reasons?: string[] | null;
  visitor_reason_map?: Record<string, string[]> | null;
  ops_notes?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
};

function toSchoolId(schoolId: string | number): number | null {
  const n = typeof schoolId === 'number' ? schoolId : Number(String(schoolId).trim());
  return Number.isFinite(n) ? n : null;
}

function mapSwot(row: SwotRow | null | undefined): SchoolSwot {
  if (!row) return emptySchoolSwot();
  return normalizeSchoolSwot(row);
}

function mapComment(row: CommentRow): SchoolComment {
  const reportDate = row.report_date ? String(row.report_date).slice(0, 10) : null;
  return {
    id: row.id,
    school_id: row.school_id != null ? String(row.school_id) : undefined,
    staff_id: row.staff_id ?? '',
    staff_name: row.staff_name?.trim() || 'เจ้าหน้าที่',
    text: row.comment_text,
    created_at: reportDate ? `${reportDate}T12:00:00.000Z` : row.created_at,
    edited_at: row.edited_at ?? null,
    tags: row.tags ?? [],
    image_urls: Array.isArray(row.image_urls)
      ? row.image_urls.map(String).filter(Boolean)
      : [],
    calendar_event_id: row.calendar_event_id ?? null,
    report_date: reportDate,
    onsite_reasons: Array.isArray(row.onsite_reasons)
      ? row.onsite_reasons.map(String)
      : [],
    visitor_reason_map:
      row.visitor_reason_map && typeof row.visitor_reason_map === 'object'
        ? row.visitor_reason_map
        : {},
    ops_notes: row.ops_notes ?? null,
    updated_at: row.updated_at ?? row.edited_at ?? null,
    updated_by: row.updated_by ?? null,
  };
}

const COMMENT_SELECT =
  'id, school_id, staff_id, staff_name, comment_text, created_at, tags, report_date, edited_at, image_urls, calendar_event_id, onsite_reasons, visitor_reason_map, ops_notes, updated_at, updated_by';

const SWOT_SELECT =
  'school_id, categories, internal_strengths, internal_weaknesses, external_strengths, external_threats, updated_at';

export async function fetchSchoolSwot(schoolId: string | number): Promise<SchoolSwot> {
  const id = toSchoolId(schoolId);
  if (id == null) return emptySchoolSwot();

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('school_swot')
      .select(SWOT_SELECT)
      .eq('school_id', id)
      .maybeSingle();
    if (error) {
      // Fallback if rename migration not applied yet
      const legacy = await supabase
        .from('school_swot')
        .select(
          'school_id, categories, internal_strengths, internal_weaknesses, external_opportunities, external_threats, updated_at'
        )
        .eq('school_id', id)
        .maybeSingle();
      if (legacy.error) return emptySchoolSwot();
      return mapSwot(legacy.data as SwotRow | null);
    }
    return mapSwot(data as SwotRow | null);
  } catch {
    return emptySchoolSwot();
  }
}

export async function fetchSchoolComments(
  schoolId: string | number
): Promise<SchoolComment[]> {
  const id = toSchoolId(schoolId);
  if (id == null) return [];

  try {
    const supabase = await createClient();
    let { data, error } = await supabase
      .from('school_staff_comments')
      .select(COMMENT_SELECT)
      .eq('school_id', id)
      .order('created_at', { ascending: false });
    if (error) {
      const legacy = await supabase
        .from('school_staff_comments')
        .select('id, school_id, staff_id, staff_name, comment_text, created_at, tags, report_date, edited_at')
        .eq('school_id', id)
        .order('created_at', { ascending: false });
      if (legacy.error || !legacy.data) {
        const bare = await supabase
          .from('school_staff_comments')
          .select('id, school_id, staff_id, staff_name, comment_text, created_at')
          .eq('school_id', id)
          .order('created_at', { ascending: false });
        if (bare.error || !bare.data) return [];
        return (bare.data as CommentRow[]).map(mapComment);
      }
      return (legacy.data as CommentRow[]).map(mapComment);
    }
    if (!data) return [];
    return (data as CommentRow[]).map(mapComment);
  } catch {
    return [];
  }
}

export async function fetchSchoolExtrasBundle(
  schoolIds: Array<string | number>
): Promise<Record<string, { swot: SchoolSwot; comments: SchoolComment[] }>> {
  const out: Record<string, { swot: SchoolSwot; comments: SchoolComment[] }> = {};
  const ids = schoolIds
    .map(toSchoolId)
    .filter((n): n is number => n != null);

  for (const id of ids) {
    out[String(id)] = { swot: emptySchoolSwot(), comments: [] };
  }
  if (!ids.length) return out;

  try {
    const supabase = await createClient();
    const [swotRes, commentRes] = await Promise.all([
      supabase.from('school_swot').select(SWOT_SELECT).in('school_id', ids),
      supabase
        .from('school_staff_comments')
        .select(COMMENT_SELECT)
        .in('school_id', ids)
        .order('created_at', { ascending: false }),
    ]);

    let commentRows = (commentRes.data ?? []) as CommentRow[];
    if (commentRes.error) {
      const legacyComments = await supabase
        .from('school_staff_comments')
        .select(
          'id, school_id, staff_id, staff_name, comment_text, created_at, tags, report_date, edited_at'
        )
        .in('school_id', ids)
        .order('created_at', { ascending: false });
      if (legacyComments.error) {
        const bare = await supabase
          .from('school_staff_comments')
          .select('id, school_id, staff_id, staff_name, comment_text, created_at')
          .in('school_id', ids)
          .order('created_at', { ascending: false });
        commentRows = (bare.data ?? []) as CommentRow[];
      } else {
        commentRows = (legacyComments.data ?? []) as CommentRow[];
      }
    }

    if (swotRes.error) {
      const legacy = await supabase
        .from('school_swot')
        .select(
          'school_id, categories, internal_strengths, internal_weaknesses, external_opportunities, external_threats'
        )
        .in('school_id', ids);
      for (const row of (legacy.data ?? []) as SwotRow[]) {
        const key = String(row.school_id);
        if (!out[key]) out[key] = { swot: emptySchoolSwot(), comments: [] };
        out[key].swot = mapSwot(row);
      }
    } else {
      for (const row of (swotRes.data ?? []) as SwotRow[]) {
        const key = String(row.school_id);
        if (!out[key]) out[key] = { swot: emptySchoolSwot(), comments: [] };
        out[key].swot = mapSwot(row);
      }
    }

    for (const row of commentRows) {
      const key = String(row.school_id);
      if (!out[key]) out[key] = { swot: emptySchoolSwot(), comments: [] };
      out[key].comments.push(mapComment(row));
    }
  } catch {
    /* ignore */
  }

  return out;
}

export async function upsertSchoolSwot(params: {
  schoolId: string | number;
  swot: SchoolSwot;
  updatedBy: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = toSchoolId(params.schoolId);
  if (id == null) return { ok: false, error: 'รหัสโรงเรียนไม่ถูกต้อง' };

  const updatedBy = isDbUserId(params.updatedBy) ? params.updatedBy : null;
  const row = flattenSwotForDb(params.swot);

  try {
    const supabase = await createClient();
    const payload = {
      school_id: id,
      categories: {},
      internal_strengths: row.internal_strengths,
      internal_weaknesses: row.internal_weaknesses,
      external_strengths: row.external_strengths,
      external_threats: row.external_threats,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    };
    let { error } = await supabase.from('school_swot').upsert(payload, { onConflict: 'school_id' });

    // Fallback write if rename not applied yet
    if (error && /external_strengths/i.test(error.message)) {
      const legacyPayload = {
        school_id: id,
        categories: {},
        internal_strengths: row.internal_strengths,
        internal_weaknesses: row.internal_weaknesses,
        external_opportunities: row.external_strengths,
        external_threats: row.external_threats,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      };
      const retry = await supabase
        .from('school_swot')
        .upsert(legacyPayload, { onConflict: 'school_id' });
      error = retry.error;
    }

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'บันทึก SWOT ไม่สำเร็จ' };
  }
}

export async function fetchAllSchoolComments(): Promise<SchoolComment[]> {
  try {
    const supabase = await createClient();
    let { data, error } = await supabase
      .from('school_staff_comments')
      .select(COMMENT_SELECT)
      .order('created_at', { ascending: false })
      .limit(5000);
    if (error && /calendar_event_id/i.test(error.message)) {
      const retry = await supabase
        .from('school_staff_comments')
        .select(
          'id, school_id, staff_id, staff_name, comment_text, created_at, tags, report_date, edited_at, image_urls'
        )
        .order('created_at', { ascending: false })
        .limit(5000);
      data = retry.data as typeof data;
      error = retry.error;
    }
    if (error || !data) return [];
    return (data as CommentRow[]).map(mapComment);
  } catch {
    return [];
  }
}

export async function insertSchoolStaffComment(params: {
  schoolId: string | number;
  staffId: string | null;
  staffName: string;
  text: string;
  tags?: string[];
  reportDate?: string | null;
  imageUrls?: string[];
  calendarEventId?: string | null;
  onsiteReasons?: string[];
  visitorReasonMap?: Record<string, string[]>;
  opsNotes?: string | null;
}): Promise<{ ok: true; comment: SchoolComment } | { ok: false; error: string }> {
  const id = toSchoolId(params.schoolId);
  if (id == null) return { ok: false, error: 'รหัสโรงเรียนไม่ถูกต้อง' };

  const staffId = isDbUserId(params.staffId) ? params.staffId : null;
  if (!staffId) {
    return { ok: false, error: 'บัญชียังไม่อยู่ในฐานข้อมูล — รัน migration 007' };
  }

  const tags = (params.tags ?? []).map((t) => t.trim()).filter(Boolean);
  const imageUrls = (params.imageUrls ?? []).map((u) => String(u).trim()).filter(Boolean);
  const reportDate =
    params.reportDate && /^\d{4}-\d{2}-\d{2}$/.test(params.reportDate)
      ? params.reportDate
      : null;
  const onsiteReasons = (params.onsiteReasons ?? []).map((r) => r.trim()).filter(Boolean);
  const visitorReasonMap = params.visitorReasonMap ?? {};
  const opsNotes = params.opsNotes?.trim() || null;

  try {
    const supabase = await createClient();
    const calendarEventId = params.calendarEventId?.trim() || null;
    const payload: Record<string, unknown> = {
      school_id: id,
      staff_id: staffId,
      staff_name: params.staffName,
      comment_text: params.text.trim() || '(ไม่มีข้อความความคิดเห็น)',
      tags,
      report_date: reportDate,
      image_urls: imageUrls,
      calendar_event_id: calendarEventId,
      onsite_reasons: onsiteReasons,
      visitor_reason_map: visitorReasonMap,
      ops_notes: opsNotes,
    };
    let { data, error } = await supabase
      .from('school_staff_comments')
      .insert(payload)
      .select(COMMENT_SELECT)
      .single();

    // Fallback if newer columns missing
    if (
      error &&
      /image_urls|tags|report_date|calendar_event_id|onsite_reasons|visitor_reason_map|ops_notes/i.test(
        error.message
      )
    ) {
      if (/onsite_reasons|visitor_reason_map|ops_notes/i.test(error.message)) {
        delete payload.onsite_reasons;
        delete payload.visitor_reason_map;
        delete payload.ops_notes;
        const withoutNew = await supabase
          .from('school_staff_comments')
          .insert(payload)
          .select(
            'id, school_id, staff_id, staff_name, comment_text, created_at, tags, report_date, edited_at, image_urls, calendar_event_id'
          )
          .single();
        if (!withoutNew.error && withoutNew.data) {
          return { ok: true, comment: mapComment(withoutNew.data as CommentRow) };
        }
        error = withoutNew.error ?? error;
      }
      if (/calendar_event_id/i.test(error.message)) {
        delete payload.calendar_event_id;
        const withoutCal = await supabase
          .from('school_staff_comments')
          .insert(payload)
          .select(
            'id, school_id, staff_id, staff_name, comment_text, created_at, tags, report_date, edited_at, image_urls'
          )
          .single();
        if (!withoutCal.error && withoutCal.data) {
          return { ok: true, comment: mapComment(withoutCal.data as CommentRow) };
        }
        error = withoutCal.error ?? error;
      }
      const slim: Record<string, unknown> = {
        school_id: id,
        staff_id: staffId,
        staff_name: params.staffName,
        comment_text: params.text.trim(),
      };
      if (!/tags/i.test(error.message)) slim.tags = tags;
      if (!/report_date/i.test(error.message)) slim.report_date = reportDate;
      if (!/image_urls/i.test(error.message)) slim.image_urls = imageUrls;
      const retry = await supabase
        .from('school_staff_comments')
        .insert(slim)
        .select('id, school_id, staff_id, staff_name, comment_text, created_at, tags, report_date, edited_at, image_urls')
        .single();
      if (retry.error && /image_urls/i.test(retry.error.message)) {
        const bare = await supabase
          .from('school_staff_comments')
          .insert({
            school_id: id,
            staff_id: staffId,
            staff_name: params.staffName,
            comment_text: params.text.trim(),
            tags,
            report_date: reportDate,
          })
          .select(
            'id, school_id, staff_id, staff_name, comment_text, created_at, tags, report_date, edited_at'
          )
          .single();
        data = bare.data as typeof data;
        error = bare.error;
      } else {
        data = retry.data as typeof data;
        error = retry.error;
      }
    }

    if (error || !data) {
      return { ok: false, error: error?.message || 'บันทึกความคิดเห็นไม่สำเร็จ' };
    }

    return { ok: true, comment: mapComment(data as CommentRow) };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'บันทึกความคิดเห็นไม่สำเร็จ',
    };
  }
}

export async function updateSchoolStaffComment(params: {
  commentId: string;
  schoolId: string | number;
  editorId: string;
  text: string;
  tags?: string[];
  /** When set, editor must be owner or listed participant */
  allowParticipantIds?: string[];
}): Promise<{ ok: true; comment: SchoolComment } | { ok: false; error: string }> {
  const schoolNum = toSchoolId(params.schoolId);
  if (schoolNum == null) return { ok: false, error: 'รหัสโรงเรียนไม่ถูกต้อง' };
  if (!isDbUserId(params.editorId)) {
    return { ok: false, error: 'บัญชียังไม่อยู่ในฐานข้อมูล' };
  }

  try {
    const supabase = await createClient();
    const existing = await supabase
      .from('school_staff_comments')
      .select(COMMENT_SELECT)
      .eq('id', params.commentId)
      .eq('school_id', schoolNum)
      .maybeSingle();

    if (existing.error || !existing.data) {
      return { ok: false, error: existing.error?.message || 'ไม่พบความคิดเห็น' };
    }

    const row = existing.data as CommentRow;
    const ownerId = row.staff_id ?? '';
    const map =
      row.visitor_reason_map && typeof row.visitor_reason_map === 'object'
        ? row.visitor_reason_map
        : {};
    const participantIds = [
      ...new Set([
        ownerId,
        ...Object.keys(map),
        ...(params.allowParticipantIds ?? []),
      ]),
    ].filter(Boolean);

    if (!participantIds.includes(params.editorId)) {
      return { ok: false, error: 'แก้ไขได้เฉพาะเจ้าของรายงานหรือสมาชิกทีม' };
    }

    const now = new Date().toISOString();
    const tags = (params.tags ?? []).map((t) => t.trim()).filter(Boolean);
    const payload: Record<string, unknown> = {
      comment_text: params.text.trim(),
      tags,
      edited_at: now,
      updated_at: now,
      updated_by: params.editorId,
    };

    let { data, error } = await supabase
      .from('school_staff_comments')
      .update(payload)
      .eq('id', params.commentId)
      .eq('school_id', schoolNum)
      .select(COMMENT_SELECT)
      .single();

    if (error && /updated_at|updated_by/i.test(error.message)) {
      delete payload.updated_at;
      delete payload.updated_by;
      const retry = await supabase
        .from('school_staff_comments')
        .update(payload)
        .eq('id', params.commentId)
        .eq('school_id', schoolNum)
        .select(
          'id, school_id, staff_id, staff_name, comment_text, created_at, tags, report_date, edited_at, image_urls, calendar_event_id, onsite_reasons, visitor_reason_map, ops_notes'
        )
        .single();
      data = retry.data as typeof data;
      error = retry.error;
    }

    if (error || !data) {
      return { ok: false, error: error?.message || 'แก้ไขไม่สำเร็จ' };
    }
    return { ok: true, comment: mapComment(data as CommentRow) };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'แก้ไขไม่สำเร็จ',
    };
  }
}

export { swotHasContent };
