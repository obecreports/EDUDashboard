'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { getSessionProfile } from '@/lib/auth/session';
import { isDbOnlyMode } from '@/lib/auth/db-mode';
import { isDbUserId } from '@/lib/auth/mock-users';
import {
  addSchoolComment,
  addSchoolComments,
  CookieTooLargeError,
  updateSchoolComment,
  saveSchoolAchievements,
  saveSchoolSwot,
  type SchoolAchievements,
} from '@/lib/auth/user-store';
import { assertSchoolInActionScope, isFieldRole } from '@/lib/auth/scope';
import { normalizeRole } from '@/lib/types';
import {
  insertSchoolStaffComment,
  updateSchoolStaffComment,
  upsertSchoolSwot,
} from '@/lib/supabase/school-swot';
import { normalizeSchoolSwot } from '@/lib/swot/schema';

async function requireAuthProfile() {
  const { profile, role, isAuthenticated } = await getSessionProfile();
  if (!isAuthenticated || !profile || profile.id === 'guest') {
    return { ok: false as const, error: 'ต้องเข้าสู่ระบบก่อน' };
  }
  return { ok: true as const, profile, role };
}

/** Comments: field roles only */
async function requireCommentAccess() {
  const gate = await requireAuthProfile();
  if (!gate.ok) return gate;
  if (!isFieldRole(normalizeRole(gate.role))) {
    return { ok: false as const, error: 'เฉพาะเจ้าหน้าที่และผู้กำกับดูแล' };
  }
  return gate;
}

/** SWOT direct edit disabled for field roles — use tickets. Admin/super_admin only. */
async function requireStaffEditor() {
  const gate = await requireAuthProfile();
  if (!gate.ok) return gate;
  if (!['admin', 'super_admin'].includes(gate.role)) {
    return { ok: false as const, error: 'ไม่มีสิทธิ์แก้ไขโดยตรง — กรุณาส่งคำขอ (Ticket)' };
  }
  return gate;
}

function readGranularSwot(formData: FormData) {
  const raw = String(formData.get('swot_json') || '');
  if (raw) {
    try {
      return normalizeSchoolSwot(JSON.parse(raw));
    } catch {
      /* fall through */
    }
  }
  return normalizeSchoolSwot({});
}

export async function postSchoolCommentAction(formData: FormData) {
  const gate = await requireCommentAccess();
  if (!gate.ok) return gate;

  const schoolId = String(formData.get('school_id') || '');
  const text = String(formData.get('text') || '').trim();
  const reportDate = String(formData.get('report_date') || '').trim();
  const tagsRaw = String(formData.get('tags') || '').trim();
  const tags = tagsRaw
    ? tagsRaw
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean)
    : [];
  if (!schoolId || !text) return { ok: false as const, error: 'กรุณากรอกความคิดเห็น' };

  const schoolGate = await assertSchoolInActionScope(gate.profile, schoolId);
  if (!schoolGate.ok) return { ok: false as const, error: schoolGate.error };

  const staffName = gate.profile.full_name || gate.profile.email || 'Staff';
  const created_at = reportDate
    ? `${reportDate}T${new Date().toISOString().slice(11)}`
    : undefined;

  try {
    if (!isDbUserId(gate.profile.id)) {
      return {
        ok: false as const,
        error: 'บัญชีนี้ยังไม่อยู่ในฐานข้อมูล — รัน migration 007 แล้วเข้าสู่ระบบใหม่',
      };
    }

    const db = await insertSchoolStaffComment({
      schoolId,
      staffId: gate.profile.id,
      staffName,
      text,
      tags,
      reportDate: reportDate || null,
    });
    if (!db.ok) return { ok: false as const, error: db.error };

    if (!isDbOnlyMode()) {
      try {
        await addSchoolComment(schoolId, {
          staff_id: gate.profile.id,
          staff_name: staffName,
          text,
          created_at,
          tags,
        });
      } catch {
        /* ignore cookie mirror */
      }
    }

    revalidatePath(`/schools/${schoolId}`);
    revalidatePath('/reports');
    revalidatePath('/staff/update-school');
    return { ok: true as const, comment: { ...db.comment, tags, edited_at: null } };
  } catch (e) {
    if (e instanceof CookieTooLargeError) {
      return { ok: false as const, error: 'พื้นที่บันทึกรายงานเต็ม — ใช้โหมดฐานข้อมูล (UAT)' };
    }
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : 'บันทึกความคิดเห็นไม่สำเร็จ',
    };
  }
}

export async function postSchoolCommentsBatchAction(formData: FormData) {
  const gate = await requireCommentAccess();
  if (!gate.ok) return gate;

  const schoolId = String(formData.get('school_id') || '');
  const reportDate = String(formData.get('report_date') || '').trim();
  const calendarEventId = String(formData.get('calendar_event_id') || '').trim();
  let boxes: { text: string; tags?: string[] }[] = [];
  try {
    boxes = JSON.parse(String(formData.get('boxes') || '[]')) as {
      text: string;
      tags?: string[];
    }[];
  } catch {
    boxes = [];
  }

  let imageUrls: string[] = [];
  try {
    imageUrls = (JSON.parse(String(formData.get('image_urls') || '[]')) as unknown[])
      .map((u) => String(u || '').trim())
      .filter(Boolean);
  } catch {
    imageUrls = [];
  }
  if (imageUrls.length > 20) {
    return { ok: false as const, error: 'แนบรูปได้สูงสุด 20 รูปต่อรายงาน' };
  }

  const cleaned = boxes
    .map((b) => ({
      text: String(b.text || '').trim(),
      tags: Array.isArray(b.tags)
        ? b.tags.map((t) => String(t).trim().replace(/^#/, '')).filter(Boolean)
        : [],
    }))
    .filter((b) => b.text);

  let onsiteReasons: string[] = [];
  try {
    onsiteReasons = (JSON.parse(String(formData.get('onsite_reasons') || '[]')) as unknown[])
      .map((r) => String(r || '').trim())
      .filter(Boolean);
  } catch {
    onsiteReasons = [];
  }

  let visitorReasonMap: Record<string, string[]> = {};
  try {
    const raw = JSON.parse(String(formData.get('visitor_reason_map') || '{}')) as Record<
      string,
      unknown
    >;
    for (const [k, v] of Object.entries(raw)) {
      if (Array.isArray(v)) {
        visitorReasonMap[k] = v.map((x) => String(x).trim()).filter(Boolean);
      }
    }
  } catch {
    visitorReasonMap = {};
  }

  const opsNotes = String(formData.get('ops_notes') || '').trim();

  if (!schoolId) {
    return { ok: false as const, error: 'กรุณาเลือกโรงเรียน' };
  }

  const schoolGate = await assertSchoolInActionScope(gate.profile, schoolId);
  if (!schoolGate.ok) return { ok: false as const, error: schoolGate.error };

  // 4-section comments are optional — allow empty body when onsite/ops present
  const bodyBoxes =
    cleaned.length > 0
      ? cleaned
      : [{ text: '', tags: [] as string[] }];

  const staffName = gate.profile.full_name || gate.profile.email || 'Staff';
  const baseMs = Date.now();
  const inputs = bodyBoxes.map((b, i) => {
    const created_at = reportDate
      ? `${reportDate}T${new Date(baseMs + i).toISOString().slice(11)}`
      : new Date(baseMs + i).toISOString();
    return {
      staff_id: gate.profile.id,
      staff_name: staffName,
      text: b.text,
      created_at,
      tags: b.tags,
    };
  });

  try {
    if (!isDbUserId(gate.profile.id)) {
      return {
        ok: false as const,
        error: 'บัญชีนี้ยังไม่อยู่ในฐานข้อมูล — รัน migration 007 แล้วเข้าสู่ระบบใหม่',
      };
    }

    const comments = [];
    for (let i = 0; i < bodyBoxes.length; i++) {
      const b = bodyBoxes[i]!;
      const db = await insertSchoolStaffComment({
        schoolId,
        staffId: gate.profile.id,
        staffName,
        text: b.text,
        tags: b.tags,
        reportDate: reportDate || null,
        imageUrls: i === 0 ? imageUrls : [],
        calendarEventId: calendarEventId || null,
        onsiteReasons: i === 0 ? onsiteReasons : [],
        visitorReasonMap: i === 0 ? visitorReasonMap : {},
        opsNotes: i === 0 ? opsNotes : null,
      });
      if (!db.ok) return { ok: false as const, error: db.error };
      comments.push({ ...db.comment, tags: b.tags });
    }

    if (!isDbOnlyMode()) {
      try {
        await addSchoolComments(schoolId, inputs);
      } catch {
        /* ignore cookie mirror */
      }
    }

    revalidatePath(`/schools/${schoolId}`);
    revalidatePath('/reports');
    revalidatePath('/staff/update-school');

    return { ok: true as const, count: comments.length, comments };
  } catch (e) {
    if (e instanceof CookieTooLargeError) {
      return { ok: false as const, error: 'พื้นที่บันทึกรายงานเต็ม — ใช้โหมดฐานข้อมูล (UAT)' };
    }
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : 'บันทึกความคิดเห็นไม่สำเร็จ',
    };
  }
}

export async function updateSchoolCommentAction(formData: FormData) {
  const gate = await requireCommentAccess();
  if (!gate.ok) return gate;

  const schoolId = String(formData.get('school_id') || '');
  const commentId = String(formData.get('comment_id') || '');
  const text = String(formData.get('text') || '').trim();
  const tagsRaw = String(formData.get('tags') || '').trim();
  const tags = tagsRaw
    ? tagsRaw
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean)
    : [];
  if (!schoolId || !commentId || !text) {
    return { ok: false as const, error: 'ข้อมูลไม่ครบ' };
  }

  // Prefer DB update (owner or team participant)
  const db = await updateSchoolStaffComment({
    commentId,
    schoolId,
    editorId: gate.profile.id,
    text,
    tags,
  });
  if (db.ok) {
    if (!isDbOnlyMode()) {
      try {
        await updateSchoolComment(schoolId, commentId, gate.profile.id, { text, tags });
      } catch {
        /* cookie mirror optional */
      }
    }
    revalidatePath(`/schools/${schoolId}`);
    revalidatePath('/reports');
    return { ok: true as const, comment: db.comment };
  }

  // Cookie fallback (owner-only match in store)
  if (!isDbOnlyMode()) {
    const updated = await updateSchoolComment(schoolId, commentId, gate.profile.id, {
      text,
      tags,
    });
    if (updated) {
      revalidatePath(`/schools/${schoolId}`);
      revalidatePath('/reports');
      return { ok: true as const, comment: updated };
    }
  }

  return {
    ok: false as const,
    error: db.error || 'แก้ไขได้เฉพาะเจ้าของรายงานหรือสมาชิกทีม',
  };
}

export async function saveSchoolSwotAction(formData: FormData) {
  const gate = await requireStaffEditor();
  if (!gate.ok) return gate;

  const schoolId = String(formData.get('school_id') || '');
  if (!schoolId) return { ok: false as const, error: 'ไม่พบรหัสโรงเรียน' };

  const swot = readGranularSwot(formData);
  await saveSchoolSwot(schoolId, swot);

  const db = await upsertSchoolSwot({
    schoolId,
    swot,
    updatedBy: gate.profile.id,
  });

  revalidatePath(`/schools/${schoolId}`);
  revalidatePath('/staff/update-school');

  if (!db.ok) return { ok: true as const, warning: db.error };
  return { ok: true as const };
}

export async function saveSchoolAchievementsAction(formData: FormData) {
  const gate = await requireStaffEditor();
  if (!gate.ok) return gate;

  const schoolId = String(formData.get('school_id') || '');
  if (!schoolId) return { ok: false as const, error: 'ไม่พบรหัสโรงเรียน' };

  const achievements: SchoolAchievements = {
    school: String(formData.get('school') || ''),
    student: String(formData.get('student') || ''),
  };
  await saveSchoolAchievements(schoolId, achievements);
  revalidatePath(`/schools/${schoolId}`);
  revalidatePath('/staff/update-school');
  return { ok: true as const };
}

export async function saveSchoolUpdateBundleAction(formData: FormData) {
  const gate = await requireStaffEditor();
  if (!gate.ok) return gate;

  const schoolId = String(formData.get('school_id') || '');
  if (!schoolId) return { ok: false as const, error: 'ไม่พบรหัสโรงเรียน' };

  const swot = readGranularSwot(formData);
  await saveSchoolSwot(schoolId, swot);

  const dbSwot = await upsertSchoolSwot({
    schoolId,
    swot,
    updatedBy: gate.profile.id,
  });

  const commentText = String(formData.get('text') || formData.get('comment') || '').trim();
  let comment = null as Awaited<ReturnType<typeof addSchoolComment>> | null;
  let commentWarning: string | undefined;

  if (commentText) {
    const staffName = gate.profile.full_name || gate.profile.email || 'Staff';
    comment = await addSchoolComment(schoolId, {
      staff_id: gate.profile.id,
      staff_name: staffName,
      text: commentText,
    });

    const dbComment = await insertSchoolStaffComment({
      schoolId,
      staffId: gate.profile.id,
      staffName,
      text: commentText,
    });
    if (dbComment.ok) {
      comment = dbComment.comment;
    } else {
      commentWarning = dbComment.error;
    }
  }

  revalidatePath(`/schools/${schoolId}`);
  revalidatePath('/staff/update-school');
  revalidatePath('/staff/dashboard');
  revalidateTag('schools');
  revalidateTag(`school-${schoolId}`);

  const warnings = [!dbSwot.ok ? dbSwot.error : null, commentWarning].filter(Boolean);
  return {
    ok: true as const,
    comment,
    warning: warnings.length ? warnings.join(' · ') : undefined,
  };
}
