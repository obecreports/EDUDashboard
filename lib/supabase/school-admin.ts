import { createClient } from '@/lib/supabase/server';

export type SchoolBasicAdminPatch = {
  school_name: string;
  director_name: string;
  phone_number: string;
  moo: string;
  village_name: string;
  subdistrict_name: string;
  district_name: string;
  province_name: string;
  zip_code: string;
  lat: number | null;
  long: number | null;
  area_id: string | null;
  /** Public Storage URL; empty string clears */
  cover_image_url?: string | null;
};

function toSchoolId(schoolId: string | number): number | null {
  const n = typeof schoolId === 'number' ? schoolId : Number(String(schoolId).trim());
  return Number.isFinite(n) ? n : null;
}

function parseCoord(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function parseSchoolAdminForm(formData: FormData): SchoolBasicAdminPatch {
  const areaRaw = String(formData.get('area_id') || '').trim();
  const coverRaw = String(formData.get('cover_image_url') || '').trim();
  return {
    school_name: String(formData.get('school_name') || '').trim(),
    director_name: String(formData.get('director_name') || '').trim(),
    phone_number: String(formData.get('phone_number') || '').trim(),
    moo: String(formData.get('moo') || '').trim(),
    village_name: String(formData.get('village_name') || '').trim(),
    subdistrict_name: String(formData.get('subdistrict_name') || '').trim(),
    district_name: String(formData.get('district_name') || '').trim(),
    province_name: String(formData.get('province_name') || '').trim(),
    zip_code: String(formData.get('zip_code') || '').trim(),
    lat: parseCoord(String(formData.get('lat') || '')),
    long: parseCoord(String(formData.get('long') || '')),
    area_id: areaRaw || null,
    cover_image_url: coverRaw || null,
  };
}

/** Persist cover URL only (called right after Storage upload). */
export async function updateSchoolCoverUrl(
  schoolId: string | number,
  coverImageUrl: string | null
): Promise<{ ok: true; url: string | null } | { ok: false; error: string }> {
  const id = toSchoolId(schoolId);
  if (id == null) return { ok: false, error: 'รหัสโรงเรียนไม่ถูกต้อง' };

  try {
    const supabase = await createClient();

    // Verify column is visible to PostgREST (schema cache / migration 010)
    const probe = await supabase
      .from('School_Basic')
      .select('school_id, cover_image_url')
      .eq('school_id', id)
      .maybeSingle();
    if (probe.error) {
      if (/cover_image_url/i.test(probe.error.message)) {
        return {
          ok: false,
          error:
            'ยังไม่มีคอลัมน์ cover_image_url หรือ schema cache ยังไม่รีเฟรช — รัน migration 010 แล้ว Reload schema ใน Supabase',
        };
      }
      return { ok: false, error: probe.error.message };
    }
    if (!probe.data) {
      return { ok: false, error: `ไม่พบโรงเรียน school_id=${id}` };
    }

    const { data, error } = await supabase
      .from('School_Basic')
      .update({ cover_image_url: coverImageUrl })
      .eq('school_id', id)
      .select('school_id, cover_image_url')
      .maybeSingle();

    if (error) {
      if (/cover_image_url/i.test(error.message)) {
        return {
          ok: false,
          error: 'ยังไม่มีคอลัมน์ cover_image_url — รัน migration 010_school_report_images.sql',
        };
      }
      if (/permission|rls|policy/i.test(error.message)) {
        return {
          ok: false,
          error: `ไม่มีสิทธิ์ UPDATE School_Basic — รันส่วน GRANT/RLS ใน migration 010 (${error.message})`,
        };
      }
      return { ok: false, error: error.message };
    }

    // Supabase often returns error=null + data=null when RLS blocks UPDATE (0 rows)
    if (!data) {
      return {
        ok: false,
        error:
          'อัปเดต cover_image_url ไม่ติดแถว (น่าจะถูก RLS บล็อก) — รัน GRANT/RLS ใน migration 010 แล้วลองใหม่',
      };
    }

    const saved =
      typeof data.cover_image_url === 'string' ? data.cover_image_url : data.cover_image_url ?? null;
    if ((coverImageUrl || null) !== (saved || null)) {
      return {
        ok: false,
        error: 'บันทึกแล้วแต่ค่าในฐานข้อมูลไม่ตรง — ตรวจ RLS / คอลัมน์ cover_image_url',
      };
    }

    return { ok: true, url: saved };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'บันทึกรูปปกไม่สำเร็จ' };
  }
}

/**
 * Update School_Basic master fields used by the app mapper.
 * Director is also mirrored to School_People when that row exists.
 */
export async function updateSchoolBasicAdmin(
  schoolId: string | number,
  patch: SchoolBasicAdminPatch
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = toSchoolId(schoolId);
  if (id == null) return { ok: false, error: 'รหัสโรงเรียนไม่ถูกต้อง' };
  if (!patch.school_name) return { ok: false, error: 'กรุณาระบุชื่อโรงเรียน' };

  const basicPayload: Record<string, unknown> = {
    school_name: patch.school_name,
    phone_number: patch.phone_number || null,
    moo: patch.moo || null,
    village_name: patch.village_name || null,
    subdistrict_name: patch.subdistrict_name || null,
    district_name: patch.district_name || null,
    province_name: patch.province_name || null,
    zip_code: patch.zip_code || null,
    lat: patch.lat,
    long: patch.long,
    area_id: patch.area_id,
    director_name: patch.director_name || null,
  };

  try {
    const supabase = await createClient();

    let { error } = await supabase
      .from('School_Basic')
      .update(basicPayload)
      .eq('school_id', id);

    // Some DBs omit optional columns — strip and retry
    if (error && /director_name/i.test(error.message)) {
      const { director_name: _d, ...rest } = basicPayload;
      const retry = await supabase.from('School_Basic').update(rest).eq('school_id', id);
      error = retry.error;
    }

    // Alternate lat/long column names
    if (error && /(lat|long|latitude|longitude)/i.test(error.message)) {
      const {
        lat: _lat,
        long: _long,
        director_name: _dir,
        ...rest
      } = basicPayload;
      const alt: Record<string, unknown> = {
        ...rest,
        latitude: patch.lat,
        longitude: patch.long,
      };
      const retry = await supabase.from('School_Basic').update(alt).eq('school_id', id);
      error = retry.error;
    }

    if (error) return { ok: false, error: error.message };

    // Cover URL — separate write so a missing column is reported clearly
    if (patch.cover_image_url !== undefined) {
      const cover = await updateSchoolCoverUrl(id, patch.cover_image_url);
      if (!cover.ok) return cover;
    }

    // Mirror director onto School_People (best-effort)
    if (patch.director_name) {
      const peoplePayload = {
        director_name: patch.director_name,
        teacher_director_name: patch.director_name,
      };
      const peopleUpdate = await supabase
        .from('School_People')
        .update(peoplePayload)
        .eq('school_id', id);
      if (peopleUpdate.error && /director_name|teacher_director_name/i.test(peopleUpdate.error.message)) {
        await supabase
          .from('School_People')
          .update({ director: patch.director_name })
          .eq('school_id', id);
      }
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'บันทึกข้อมูลโรงเรียนไม่สำเร็จ' };
  }
}
