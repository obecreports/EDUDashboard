'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { getSessionProfile } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/auth/scope';
import { normalizeRole } from '@/lib/types';
import { normalizeSchoolSwot } from '@/lib/swot/schema';
import { upsertSchoolSwot } from '@/lib/supabase/school-swot';
import {
  parseSchoolAdminForm,
  updateSchoolBasicAdmin,
  updateSchoolCoverUrl,
} from '@/lib/supabase/school-admin';

async function requireAdmin() {
  const { profile, isAuthenticated } = await getSessionProfile();
  if (!isAuthenticated || !profile || !isAdminRole(normalizeRole(profile.role))) {
    return { ok: false as const, error: 'ต้องเป็น Admin ที่ล็อกอินแล้ว' };
  }
  return { ok: true as const, profile };
}

function revalidateSchoolPages(schoolId: string) {
  revalidateTag('schools');
  revalidateTag(`school-${schoolId}`);
  revalidatePath('/admin/schools');
  revalidatePath(`/admin/schools/${schoolId}`);
  revalidatePath('/schools');
  revalidatePath(`/schools/${schoolId}`);
  revalidatePath('/schools/public');
  revalidatePath('/thailand-map');
}

/** Save cover URL immediately after Storage upload (does not wait for full form save). */
export async function saveSchoolCoverAction(formData: FormData): Promise<
  { ok: true; url: string | null } | { ok: false; error: string }
> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const schoolId = String(formData.get('school_id') || '').trim();
  if (!schoolId) return { ok: false, error: 'ไม่พบรหัสโรงเรียน' };

  const raw = String(formData.get('cover_image_url') || '').trim();
  const url = raw || null;
  const res = await updateSchoolCoverUrl(schoolId, url);
  if (!res.ok) return res;

  revalidateSchoolPages(schoolId);
  return { ok: true, url: res.url };
}

export async function updateSchoolDetailAction(formData: FormData): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const schoolId = String(formData.get('school_id') || '').trim();
  if (!schoolId) return { ok: false, error: 'ไม่พบรหัสโรงเรียน' };

  const patch = parseSchoolAdminForm(formData);
  const basic = await updateSchoolBasicAdmin(schoolId, patch);
  if (!basic.ok) return basic;

  let swotRaw: unknown = {};
  try {
    swotRaw = JSON.parse(String(formData.get('swot_json') || '{}'));
  } catch {
    swotRaw = {};
  }
  const swot = normalizeSchoolSwot(swotRaw);
  const swotRes = await upsertSchoolSwot({
    schoolId,
    swot,
    updatedBy: gate.profile.id,
  });
  if (!swotRes.ok) {
    return { ok: false, error: `บันทึกข้อมูลหลักแล้ว แต่ SWOT ไม่สำเร็จ: ${swotRes.error}` };
  }

  revalidateSchoolPages(schoolId);
  return { ok: true };
}
