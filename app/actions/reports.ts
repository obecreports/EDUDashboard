'use server';

import { revalidatePath } from 'next/cache';
import { getSessionProfile } from '@/lib/auth/session';
import { isDbOnlyMode } from '@/lib/auth/db-mode';
import {
  CookieTooLargeError,
  deleteReportDraft,
  getReportDraft,
  listReportDraftsForStaff,
  upsertReportDraft,
  type ReportDraft,
} from '@/lib/auth/user-store';
import {
  deleteReportDraftInDb,
  fetchReportDraft,
  fetchReportDraftsForStaff,
  upsertReportDraftInDb,
} from '@/lib/supabase/report-drafts';
import { assertSchoolInActionScope, isFieldRole } from '@/lib/auth/scope';
import { normalizeRole } from '@/lib/types';

async function requireFieldUser() {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  const r = normalizeRole(role);
  if (!isAuthenticated || !profile || !isFieldRole(r)) {
    return { ok: false as const, error: 'เฉพาะเจ้าหน้าที่ที่เข้าสู่ระบบแล้ว' };
  }
  return { ok: true as const, profile };
}

export async function listMyReportDraftsAction(): Promise<ReportDraft[]> {
  const gate = await requireFieldUser();
  if (!gate.ok) return [];
  if (isDbOnlyMode()) return fetchReportDraftsForStaff(gate.profile.id);
  return listReportDraftsForStaff(gate.profile.id);
}

export async function saveReportDraftAction(formData: FormData): Promise<
  { ok: true; draft: ReportDraft } | { ok: false; error: string }
> {
  const gate = await requireFieldUser();
  if (!gate.ok) return gate;

  const school_id = String(formData.get('school_id') || '').trim();
  const school_name = String(formData.get('school_name') || '').trim();
  const province = String(formData.get('province') || '').trim();
  const district = String(formData.get('district') || '').trim();
  const report_date = String(formData.get('report_date') || '').trim();
  const draft_id = String(formData.get('draft_id') || '').trim() || undefined;
  let boxes: { text: string; tags: string[] }[] = [];
  try {
    boxes = JSON.parse(String(formData.get('boxes') || '[]')) as {
      text: string;
      tags: string[];
    }[];
  } catch {
    boxes = [];
  }

  if (!school_id) return { ok: false, error: 'เลือกโรงเรียนก่อนบันทึกร่าง' };
  if (!report_date) return { ok: false, error: 'เลือกวันที่รายงาน' };

  const schoolGate = await assertSchoolInActionScope(gate.profile, school_id);
  if (!schoolGate.ok) return { ok: false, error: schoolGate.error };

  const payload = {
    id: draft_id,
    staff_id: gate.profile.id,
    school_id,
    school_name: school_name || school_id,
    province,
    district,
    report_date,
    boxes: boxes.map((b) => ({
      text: String(b.text || ''),
      tags: Array.isArray(b.tags) ? b.tags.map(String) : [],
    })),
  };

  try {
    if (isDbOnlyMode()) {
      const res = await upsertReportDraftInDb(payload);
      if (!res.ok) return res;
      revalidatePath('/reports');
      revalidatePath('/reports/new');
      return { ok: true, draft: res.draft };
    }

    const draft = await upsertReportDraft(payload);
    revalidatePath('/reports');
    revalidatePath('/reports/new');
    return { ok: true, draft };
  } catch (e) {
    if (e instanceof CookieTooLargeError) {
      return { ok: false, error: 'ร่างรายงานเต็ม — ลบร่างเก่าแล้วลองใหม่' };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'บันทึกร่างไม่สำเร็จ',
    };
  }
}

export async function deleteReportDraftAction(formData: FormData): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const gate = await requireFieldUser();
  if (!gate.ok) return gate;
  const draft_id = String(formData.get('draft_id') || '').trim();
  if (!draft_id) return { ok: false, error: 'ไม่พบร่างรายงาน' };

  const res = isDbOnlyMode()
    ? await deleteReportDraftInDb(draft_id, gate.profile.id)
    : await deleteReportDraft(draft_id, gate.profile.id);
  if (!res.ok) return res;
  revalidatePath('/reports');
  revalidatePath('/reports/new');
  return { ok: true };
}

export async function getReportDraftAction(
  draftId: string
): Promise<ReportDraft | null> {
  const gate = await requireFieldUser();
  if (!gate.ok) return null;
  if (isDbOnlyMode()) return fetchReportDraft(draftId, gate.profile.id);
  return getReportDraft(draftId, gate.profile.id);
}
