import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { DirectorGender, SchoolDirector } from '@/lib/types';
import {
  directorFullLabel,
  fetchActiveSchoolsForDirector,
  fetchDirectorById,
  mapDirectorRow,
} from '@/lib/supabase/directors';

export type DirectorUpsertInput = {
  directorId?: string | null;
  namePrefix?: string | null;
  fullName: string;
  positionName?: string | null;
  gender?: DirectorGender | null;
  pictureUrl?: string | null;
};

export async function upsertDirector(
  input: DirectorUpsertInput
): Promise<{ ok: true; director: SchoolDirector } | { ok: false; error: string }> {
  const fullName = input.fullName.trim();
  if (!fullName) return { ok: false, error: 'กรุณาระบุชื่อผู้อำนวยการ' };

  const payload = {
    name_prefix: (input.namePrefix ?? '').trim() || null,
    full_name: fullName,
    position_name: (input.positionName ?? '').trim() || 'ผู้อำนวยการโรงเรียน',
    gender: input.gender ?? null,
    picture_url: input.pictureUrl !== undefined ? input.pictureUrl : undefined,
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = await createClient();
    const existingId = (input.directorId ?? '').trim();

    if (existingId) {
      const updatePayload: Record<string, unknown> = { ...payload };
      if (input.pictureUrl === undefined) delete updatePayload.picture_url;
      const { data, error } = await supabase
        .from('directors')
        .update(updatePayload)
        .eq('director_id', existingId)
        .select('director_id, name_prefix, full_name, position_name, gender, picture_url')
        .maybeSingle();
      if (error) return { ok: false, error: error.message };
      if (!data) return { ok: false, error: 'ไม่พบผู้อำนวยการ' };
      return { ok: true, director: mapDirectorRow(data as Record<string, unknown>) };
    }

    const insertPayload = {
      name_prefix: payload.name_prefix,
      full_name: payload.full_name,
      position_name: payload.position_name,
      gender: payload.gender,
      picture_url: input.pictureUrl ?? null,
    };
    const { data, error } = await supabase
      .from('directors')
      .insert(insertPayload)
      .select('director_id, name_prefix, full_name, position_name, gender, picture_url')
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: 'สร้างผู้อำนวยการไม่สำเร็จ' };
    return { ok: true, director: mapDirectorRow(data as Record<string, unknown>) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'บันทึกผู้อำนวยการไม่สำเร็จ' };
  }
}

export async function updateDirectorPictureUrl(
  directorId: string,
  pictureUrl: string | null
): Promise<{ ok: true; url: string | null } | { ok: false; error: string }> {
  const id = directorId.trim();
  if (!id) return { ok: false, error: 'ไม่พบรหัสผู้อำนวยการ' };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('directors')
      .update({ picture_url: pictureUrl, updated_at: new Date().toISOString() })
      .eq('director_id', id)
      .select('picture_url')
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: 'ไม่พบผู้อำนวยการ' };
    return {
      ok: true,
      url: typeof data.picture_url === 'string' ? data.picture_url : null,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'บันทึกรูปไม่สำเร็จ' };
  }
}

async function syncDirectorNameOnSchool(
  schoolId: number,
  directorName: string | null
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from('School_Basic')
    .update({ director_name: directorName })
    .eq('school_id', schoolId);

  if (directorName) {
    const peoplePayload = {
      director_name: directorName,
      teacher_director_name: directorName,
    };
    const peopleUpdate = await supabase
      .from('School_People')
      .update(peoplePayload)
      .eq('school_id', schoolId);
    if (
      peopleUpdate.error &&
      /director_name|teacher_director_name/i.test(peopleUpdate.error.message)
    ) {
      await supabase
        .from('School_People')
        .update({ director: directorName })
        .eq('school_id', schoolId);
    }
  }
}

async function endActiveHistoryForSchool(
  schoolId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('director_school_history')
    .update({ ended_at: new Date().toISOString() })
    .eq('school_id', schoolId)
    .is('ended_at', null);
  if (error && !/director_school_history|schema cache/i.test(error.message)) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function assignSchoolDirector(
  schoolId: string | number,
  directorId: string
): Promise<
  | {
      ok: true;
      director: SchoolDirector;
      otherActiveSchools: { school_id: number; school_name: string }[];
    }
  | { ok: false; error: string }
> {
  const sid = typeof schoolId === 'number' ? schoolId : Number(String(schoolId).trim());
  const did = directorId.trim();
  if (!Number.isFinite(sid)) return { ok: false, error: 'รหัสโรงเรียนไม่ถูกต้อง' };
  if (!did) return { ok: false, error: 'กรุณาเลือกผู้อำนวยการ' };

  try {
    const supabase = await createClient();
    const director = await fetchDirectorById(did);
    if (!director) return { ok: false, error: 'ไม่พบผู้อำนวยการ' };

    const otherActive = (await fetchActiveSchoolsForDirector(did)).filter(
      (s) => s.school_id !== sid
    );

    const end = await endActiveHistoryForSchool(sid);
    if (!end.ok) return end;

    const { error } = await supabase
      .from('School_Basic')
      .update({ director_id: did })
      .eq('school_id', sid);
    if (error) {
      if (/director_id/i.test(error.message)) {
        return {
          ok: false,
          error: 'ยังไม่มีคอลัมน์ director_id — รัน migration 024_school_directors.sql',
        };
      }
      return { ok: false, error: error.message };
    }

    const name = directorFullLabel(director);
    await syncDirectorNameOnSchool(sid, name || null);

    const { error: histErr } = await supabase.from('director_school_history').insert({
      director_id: did,
      school_id: sid,
      started_at: new Date().toISOString(),
      ended_at: null,
    });
    if (histErr && !/unique|duplicate/i.test(histErr.message)) {
      return { ok: false, error: histErr.message };
    }

    return { ok: true, director, otherActiveSchools: otherActive };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'มอบหมายผู้อำนวยการไม่สำเร็จ' };
  }
}

export async function clearSchoolDirector(
  schoolId: string | number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sid = typeof schoolId === 'number' ? schoolId : Number(String(schoolId).trim());
  if (!Number.isFinite(sid)) return { ok: false, error: 'รหัสโรงเรียนไม่ถูกต้อง' };

  try {
    const supabase = await createClient();
    const end = await endActiveHistoryForSchool(sid);
    if (!end.ok) return end;

    const { error } = await supabase
      .from('School_Basic')
      .update({ director_id: null, director_name: null })
      .eq('school_id', sid);
    if (error) {
      if (/director_id/i.test(error.message)) {
        return {
          ok: false,
          error: 'ยังไม่มีคอลัมน์ director_id — รัน migration 024_school_directors.sql',
        };
      }
      return { ok: false, error: error.message };
    }
    await syncDirectorNameOnSchool(sid, null);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'ลบผู้อำนวยการไม่สำเร็จ' };
  }
}
