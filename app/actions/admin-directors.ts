'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { getSessionProfile } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/auth/scope';
import { normalizeRole, type DirectorGender } from '@/lib/types';
import { fetchActiveSchoolsForDirector } from '@/lib/supabase/directors';
import {
  assignSchoolDirector,
  clearSchoolDirector,
  upsertDirector,
  updateDirectorPictureUrl,
} from '@/lib/supabase/directors-admin';

async function requireAdmin() {
  const { profile, isAuthenticated } = await getSessionProfile();
  if (!isAuthenticated || !profile || !isAdminRole(normalizeRole(profile.role))) {
    return { ok: false as const, error: 'ต้องเป็น Admin ที่ล็อกอินแล้ว' };
  }
  return { ok: true as const, profile };
}

function revalidateDirectorPaths(schoolId?: string) {
  revalidateTag('schools');
  revalidatePath('/admin/directors');
  revalidatePath('/admin/directors/assign');
  revalidatePath('/admin/schools');
  revalidatePath('/schools');
  if (schoolId) {
    revalidateTag(`school-${schoolId}`);
    revalidatePath(`/admin/schools/${schoolId}`);
    revalidatePath(`/schools/${schoolId}`);
    revalidatePath(`/schools/${schoolId}/director`);
  }
}

function parseGender(raw: string): DirectorGender | null {
  const g = raw.trim().toLowerCase();
  if (g === 'male' || g === 'female' || g === 'other') return g;
  return null;
}

export async function upsertDirectorAction(formData: FormData): Promise<
  | { ok: true; directorId: string }
  | { ok: false; error: string }
> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const directorId = String(formData.get('director_id') || '').trim() || null;
  const pictureRaw = String(formData.get('picture_url') || '').trim();
  const res = await upsertDirector({
    directorId,
    namePrefix: String(formData.get('name_prefix') || ''),
    fullName: String(formData.get('full_name') || ''),
    positionName: String(formData.get('position_name') || ''),
    gender: parseGender(String(formData.get('gender') || '')),
    pictureUrl: formData.has('picture_url') ? pictureRaw || null : undefined,
  });
  if (!res.ok) return res;

  revalidateDirectorPaths();
  return { ok: true, directorId: res.director.director_id };
}

export async function saveDirectorPhotoAction(formData: FormData): Promise<
  { ok: true; url: string | null } | { ok: false; error: string }
> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const directorId = String(formData.get('director_id') || '').trim();
  if (!directorId) return { ok: false, error: 'ไม่พบรหัสผู้อำนวยการ' };

  const raw = String(formData.get('picture_url') || '').trim();
  const res = await updateDirectorPictureUrl(directorId, raw || null);
  if (!res.ok) return res;

  revalidateDirectorPaths();
  return { ok: true, url: res.url };
}

export async function assignSchoolDirectorAction(formData: FormData): Promise<
  | {
      ok: true;
      otherActiveSchools: { school_id: number; school_name: string }[];
    }
  | { ok: false; error: string }
> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const schoolId = String(formData.get('school_id') || '').trim();
  const directorId = String(formData.get('director_id') || '').trim();
  if (!schoolId) return { ok: false, error: 'ไม่พบรหัสโรงเรียน' };
  if (!directorId) return { ok: false, error: 'กรุณาเลือกผู้อำนวยการ' };

  const res = await assignSchoolDirector(schoolId, directorId);
  if (!res.ok) return res;

  revalidateDirectorPaths(schoolId);
  return { ok: true, otherActiveSchools: res.otherActiveSchools };
}

export async function clearSchoolDirectorAction(formData: FormData): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const schoolId = String(formData.get('school_id') || '').trim();
  if (!schoolId) return { ok: false, error: 'ไม่พบรหัสโรงเรียน' };

  const res = await clearSchoolDirector(schoolId);
  if (!res.ok) return res;

  revalidateDirectorPaths(schoolId);
  return { ok: true };
}

/** Preview other schools before assign (admin warning). */
export async function previewDirectorActiveSchoolsAction(
  directorId: string
): Promise<
  | { ok: true; schools: { school_id: number; school_name: string }[] }
  | { ok: false; error: string }
> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;
  const id = directorId.trim();
  if (!id) return { ok: true, schools: [] };
  try {
    const schools = await fetchActiveSchoolsForDirector(id);
    return { ok: true, schools };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'โหลดไม่สำเร็จ' };
  }
}
