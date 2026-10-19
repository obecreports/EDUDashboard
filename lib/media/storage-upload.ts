'use client';

import { createClient } from '@/lib/supabase/client';
import {
  compressImageFile,
  COVER_COMPRESS,
  REPORT_COMPRESS,
  REPORT_THUMB_COMPRESS,
  type CompressOptions,
} from '@/lib/media/compress-image';

export const BUCKET_SCHOOL_COVERS = 'school-covers';
export const BUCKET_REPORT_IMAGES = 'report-images';

function publicUrl(bucket: string, path: string): string {
  const supabase = createClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

async function uploadBlob(
  bucket: string,
  path: string,
  file: File
): Promise<{ ok: true; url: string; path: string } | { ok: false; error: string }> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: '86400',
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, url: publicUrl(bucket, path), path };
}

async function uploadCompressed(
  bucket: string,
  path: string,
  file: File,
  compress: CompressOptions
): Promise<{ ok: true; url: string; path: string } | { ok: false; error: string }> {
  try {
    const compressed = await compressImageFile(file, compress);
    return uploadBlob(bucket, path, compressed);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ' };
  }
}

/** Replace school cover at a stable path (cache-bust via query on save). */
export async function uploadSchoolCover(
  schoolId: string | number,
  file: File
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const path = `schools/${schoolId}/cover.jpg`;
  const res = await uploadCompressed(BUCKET_SCHOOL_COVERS, path, file, COVER_COMPRESS);
  if (!res.ok) return res;
  // Best-effort tiny cover thumb for cards/lists
  try {
    const thumb = await compressImageFile(file, REPORT_THUMB_COMPRESS);
    await uploadBlob(BUCKET_SCHOOL_COVERS, `schools/${schoolId}/cover.thumb.jpg`, thumb);
  } catch {
    /* full cover alone is enough */
  }
  const bust = `v=${Date.now()}`;
  return { ok: true, url: `${res.url}${res.url.includes('?') ? '&' : '?'}${bust}` };
}

/** Director photo — same bucket as covers, sibling folder `directors/{id}/`. */
export async function uploadDirectorPhoto(
  directorId: string,
  file: File
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const id = directorId.trim();
  if (!id) return { ok: false, error: 'ไม่พบรหัสผู้อำนวยการ' };
  const path = `directors/${id}/photo.jpg`;
  const res = await uploadCompressed(BUCKET_SCHOOL_COVERS, path, file, COVER_COMPRESS);
  if (!res.ok) return res;
  try {
    const thumb = await compressImageFile(file, REPORT_THUMB_COMPRESS);
    await uploadBlob(BUCKET_SCHOOL_COVERS, `directors/${id}/photo.thumb.jpg`, thumb);
  } catch {
    /* full photo alone is enough */
  }
  const bust = `v=${Date.now()}`;
  return { ok: true, url: `${res.url}${res.url.includes('?') ? '&' : '?'}${bust}` };
}

/**
 * Upload report photo as full + thumb pair.
 * DB stores the full URL; UI derives `*.thumb.jpg` for list egress savings.
 */
export async function uploadReportImage(
  schoolId: string | number,
  file: File
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const fullPath = `schools/${schoolId}/${id}.jpg`;
  const thumbPath = `schools/${schoolId}/${id}.thumb.jpg`;

  try {
    const [fullFile, thumbFile] = await Promise.all([
      compressImageFile(file, REPORT_COMPRESS),
      compressImageFile(file, REPORT_THUMB_COMPRESS),
    ]);
    const full = await uploadBlob(BUCKET_REPORT_IMAGES, fullPath, fullFile);
    if (!full.ok) return full;
    const thumb = await uploadBlob(BUCKET_REPORT_IMAGES, thumbPath, thumbFile);
    if (!thumb.ok) {
      // Full alone still usable; list will fall back via onError
      return { ok: true, url: full.url };
    }
    return { ok: true, url: full.url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ' };
  }
}
