import { createClient } from '@/lib/supabase/server';
import type { SchoolComment, SchoolSwot } from '@/lib/auth/user-store';
import {
  emptySchoolSwot,
  flattenSwotLegacy,
  normalizeSchoolSwot,
  swotHasContent,
} from '@/lib/swot/schema';

export const EMPTY_CLASSIC_SWOT: SchoolSwot = emptySchoolSwot();

type SwotRow = {
  school_id: number | string;
  categories?: unknown;
  internal_strengths?: string | null;
  internal_weaknesses?: string | null;
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
};

function toSchoolId(schoolId: string | number): number | null {
  const n = typeof schoolId === 'number' ? schoolId : Number(String(schoolId).trim());
  return Number.isFinite(n) ? n : null;
}

function mapSwot(row: SwotRow | null | undefined): SchoolSwot {
  if (!row) return emptySchoolSwot();
  if (row.categories && typeof row.categories === 'object') {
    return normalizeSchoolSwot(row.categories);
  }
  return normalizeSchoolSwot({
    internal_strengths: row.internal_strengths,
    internal_weaknesses: row.internal_weaknesses,
    external_opportunities: row.external_opportunities,
    external_threats: row.external_threats,
  });
}

function mapComment(row: CommentRow): SchoolComment {
  return {
    id: row.id,
    staff_id: row.staff_id ?? '',
    staff_name: row.staff_name?.trim() || 'เจ้าหน้าที่',
    text: row.comment_text,
    created_at: row.created_at,
  };
}

export async function fetchSchoolSwot(schoolId: string | number): Promise<SchoolSwot> {
  const id = toSchoolId(schoolId);
  if (id == null) return emptySchoolSwot();

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('school_swot')
      .select(
        'school_id, categories, internal_strengths, internal_weaknesses, external_opportunities, external_threats, updated_at'
      )
      .eq('school_id', id)
      .maybeSingle();
    if (error) return emptySchoolSwot();
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
    const { data, error } = await supabase
      .from('school_staff_comments')
      .select('id, school_id, staff_id, staff_name, comment_text, created_at')
      .eq('school_id', id)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
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

  ids.forEach((id) => {
    out[String(id)] = { swot: emptySchoolSwot(), comments: [] };
  });

  if (ids.length === 0) return out;

  try {
    const supabase = await createClient();
    const [swotRes, commentRes] = await Promise.all([
      supabase
        .from('school_swot')
        .select(
          'school_id, categories, internal_strengths, internal_weaknesses, external_opportunities, external_threats'
        )
        .in('school_id', ids),
      supabase
        .from('school_staff_comments')
        .select('id, school_id, staff_id, staff_name, comment_text, created_at')
        .in('school_id', ids)
        .order('created_at', { ascending: false }),
    ]);

    for (const row of (swotRes.data as SwotRow[] | null) ?? []) {
      out[String(row.school_id)] = {
        ...(out[String(row.school_id)] ?? {
          swot: emptySchoolSwot(),
          comments: [],
        }),
        swot: mapSwot(row),
      };
    }

    for (const row of (commentRes.data as CommentRow[] | null) ?? []) {
      const key = String(row.school_id);
      if (!out[key]) out[key] = { swot: emptySchoolSwot(), comments: [] };
      out[key].comments.push(mapComment(row));
    }
  } catch {
    /* tables may not exist yet */
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

  const updatedBy =
    params.updatedBy && !params.updatedBy.startsWith('mock-') ? params.updatedBy : null;
  const legacy = flattenSwotLegacy(params.swot);

  try {
    const supabase = await createClient();
    const { error } = await supabase.from('school_swot').upsert(
      {
        school_id: id,
        categories: params.swot,
        internal_strengths: legacy.internal_strengths,
        internal_weaknesses: legacy.internal_weaknesses,
        external_opportunities: legacy.external_opportunities,
        external_threats: legacy.external_threats,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'school_id' }
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'บันทึก SWOT ไม่สำเร็จ' };
  }
}

export async function insertSchoolStaffComment(params: {
  schoolId: string | number;
  staffId: string | null;
  staffName: string;
  text: string;
}): Promise<{ ok: true; comment: SchoolComment } | { ok: false; error: string }> {
  const id = toSchoolId(params.schoolId);
  if (id == null) return { ok: false, error: 'รหัสโรงเรียนไม่ถูกต้อง' };

  const staffId =
    params.staffId && !params.staffId.startsWith('mock-') ? params.staffId : null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('school_staff_comments')
      .insert({
        school_id: id,
        staff_id: staffId,
        staff_name: params.staffName,
        comment_text: params.text.trim(),
      })
      .select('id, school_id, staff_id, staff_name, comment_text, created_at')
      .single();

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

export { swotHasContent };
