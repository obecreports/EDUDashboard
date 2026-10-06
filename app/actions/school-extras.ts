'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { getSessionProfile } from '@/lib/auth/session';
import {
  addSchoolComment,
  saveSchoolAchievements,
  saveSchoolSwot,
  type SchoolAchievements,
} from '@/lib/auth/user-store';
import {
  insertSchoolStaffComment,
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

/** Comments: Staff + Overseer only (hidden from Global/Guest) */
async function requireCommentAccess() {
  const gate = await requireAuthProfile();
  if (!gate.ok) return gate;
  if (gate.role !== 'staff' && gate.role !== 'overseer') {
    return { ok: false as const, error: 'เฉพาะเจ้าหน้าที่และผู้กำกับดูแล' };
  }
  return gate;
}

/** SWOT / school updates: Staff (+ Overseer/Admin for maintenance) */
async function requireStaffEditor() {
  const gate = await requireAuthProfile();
  if (!gate.ok) return gate;
  if (gate.role !== 'staff' && gate.role !== 'overseer' && gate.role !== 'admin') {
    return { ok: false as const, error: 'ไม่มีสิทธิ์แก้ไข' };
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
  if (!schoolId || !text) return { ok: false as const, error: 'กรุณากรอกความคิดเห็น' };

  const staffName = gate.profile.full_name || gate.profile.email || 'Staff';

  const cookieComment = addSchoolComment(schoolId, {
    staff_id: gate.profile.id,
    staff_name: staffName,
    text,
  });

  const db = await insertSchoolStaffComment({
    schoolId,
    staffId: gate.profile.id,
    staffName,
    text,
  });

  revalidatePath(`/schools/${schoolId}`);
  revalidatePath('/staff/update-school');

  if (db.ok) return { ok: true as const, comment: db.comment };
  return { ok: true as const, comment: cookieComment, warning: db.error };
}

export async function saveSchoolSwotAction(formData: FormData) {
  const gate = await requireStaffEditor();
  if (!gate.ok) return gate;

  const schoolId = String(formData.get('school_id') || '');
  if (!schoolId) return { ok: false as const, error: 'ไม่พบรหัสโรงเรียน' };

  const swot = readGranularSwot(formData);
  saveSchoolSwot(schoolId, swot);

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
  saveSchoolAchievements(schoolId, achievements);
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
  saveSchoolSwot(schoolId, swot);

  const dbSwot = await upsertSchoolSwot({
    schoolId,
    swot,
    updatedBy: gate.profile.id,
  });

  const commentText = String(formData.get('text') || formData.get('comment') || '').trim();
  let comment = null as ReturnType<typeof addSchoolComment> | null;
  let commentWarning: string | undefined;

  if (commentText) {
    const staffName = gate.profile.full_name || gate.profile.email || 'Staff';
    comment = addSchoolComment(schoolId, {
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
