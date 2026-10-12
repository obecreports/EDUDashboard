import { createClient } from '@/lib/supabase/server';
import { isDbUserId, type ReportDraft, type ReportDraftBox } from '@/lib/auth/mock-users';

type DraftRow = {
  id: string;
  staff_id: string;
  school_id: number | string | null;
  school_name: string | null;
  province: string | null;
  district: string | null;
  report_date: string | null;
  boxes: unknown;
  updated_at: string;
};

function mapBoxes(raw: unknown): ReportDraftBox[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((b) => {
    const row = b as { text?: unknown; tags?: unknown };
    return {
      text: String(row.text ?? ''),
      tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    };
  });
}

function mapRow(row: DraftRow): ReportDraft {
  return {
    id: row.id,
    staff_id: row.staff_id,
    school_id: row.school_id != null ? String(row.school_id) : '',
    school_name: row.school_name ?? '',
    province: row.province ?? '',
    district: row.district ?? '',
    report_date: row.report_date ? String(row.report_date).slice(0, 10) : '',
    boxes: mapBoxes(row.boxes),
    updated_at: row.updated_at,
  };
}

const SELECT =
  'id, staff_id, school_id, school_name, province, district, report_date, boxes, updated_at';

export async function fetchReportDraftsForStaff(staffId: string): Promise<ReportDraft[]> {
  if (!isDbUserId(staffId)) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('report_drafts')
      .select(SELECT)
      .eq('staff_id', staffId)
      .order('updated_at', { ascending: false });
    if (error || !data) return [];
    return (data as DraftRow[]).map(mapRow);
  } catch {
    return [];
  }
}

export async function fetchReportDraft(
  draftId: string,
  staffId: string
): Promise<ReportDraft | null> {
  if (!isDbUserId(staffId) || !draftId) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('report_drafts')
      .select(SELECT)
      .eq('id', draftId)
      .eq('staff_id', staffId)
      .maybeSingle();
    if (error || !data) return null;
    return mapRow(data as DraftRow);
  } catch {
    return null;
  }
}

export async function upsertReportDraftInDb(
  input: Omit<ReportDraft, 'id' | 'updated_at'> & { id?: string }
): Promise<{ ok: true; draft: ReportDraft } | { ok: false; error: string }> {
  if (!isDbUserId(input.staff_id)) {
    return { ok: false, error: 'บัญชียังไม่อยู่ในฐานข้อมูล' };
  }
  const schoolNum = Number(String(input.school_id).trim());
  const payload = {
    staff_id: input.staff_id,
    school_id: Number.isFinite(schoolNum) ? schoolNum : null,
    school_name: input.school_name,
    province: input.province,
    district: input.district,
    report_date: input.report_date || null,
    boxes: input.boxes,
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = await createClient();
    if (input.id) {
      const { data, error } = await supabase
        .from('report_drafts')
        .update(payload)
        .eq('id', input.id)
        .eq('staff_id', input.staff_id)
        .select(SELECT)
        .maybeSingle();
      if (error) return { ok: false, error: error.message };
      if (data) return { ok: true, draft: mapRow(data as DraftRow) };
    }

    const { data, error } = await supabase
      .from('report_drafts')
      .insert(payload)
      .select(SELECT)
      .single();
    if (error || !data) return { ok: false, error: error?.message || 'บันทึกร่างไม่สำเร็จ' };
    return { ok: true, draft: mapRow(data as DraftRow) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'บันทึกร่างไม่สำเร็จ' };
  }
}

export async function deleteReportDraftInDb(
  draftId: string,
  staffId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isDbUserId(staffId)) return { ok: false, error: 'บัญชียังไม่อยู่ในฐานข้อมูล' };
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('report_drafts')
      .delete()
      .eq('id', draftId)
      .eq('staff_id', staffId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'ลบร่างไม่สำเร็จ' };
  }
}
