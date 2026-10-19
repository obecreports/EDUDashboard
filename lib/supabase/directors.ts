/**
 * Director read helpers — anon client only (safe for server data loaders).
 * Writes live in directors-admin.ts (server-only).
 */
import { createAnonClient } from '@/lib/supabase/anon';
import type {
  DirectorGender,
  DirectorHistoryEntry,
  SchoolDirector,
} from '@/lib/types';
import { formatDisplayName } from '@/lib/types';

export type { DirectorHistoryEntry };

export function mapDirectorRow(row: Record<string, unknown>): SchoolDirector {
  const genderRaw = row.gender != null ? String(row.gender) : null;
  const gender: DirectorGender | null =
    genderRaw === 'male' || genderRaw === 'female' || genderRaw === 'other'
      ? genderRaw
      : null;
  return {
    director_id: String(row.director_id),
    name_prefix: row.name_prefix != null ? String(row.name_prefix) : null,
    full_name: String(row.full_name ?? ''),
    position_name: row.position_name != null ? String(row.position_name) : null,
    gender,
    picture_url: row.picture_url != null ? String(row.picture_url) : null,
  };
}

export function directorFullLabel(
  d: Pick<SchoolDirector, 'name_prefix' | 'full_name'>
): string {
  return formatDisplayName(d.name_prefix, d.full_name) || d.full_name;
}

export async function fetchDirectorsByIds(
  ids: string[]
): Promise<Map<string, SchoolDirector>> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  const map = new Map<string, SchoolDirector>();
  if (!unique.length) return map;

  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from('directors')
    .select('director_id, name_prefix, full_name, position_name, gender, picture_url')
    .in('director_id', unique);
  if (error) {
    if (/directors|schema cache/i.test(error.message)) return map;
    throw error;
  }
  for (const row of data ?? []) {
    const d = mapDirectorRow(row as Record<string, unknown>);
    map.set(d.director_id, d);
  }
  return map;
}

export async function fetchDirectorById(
  directorId: string
): Promise<SchoolDirector | null> {
  const id = directorId.trim();
  if (!id) return null;
  const map = await fetchDirectorsByIds([id]);
  return map.get(id) ?? null;
}

export async function listDirectors(query?: string): Promise<SchoolDirector[]> {
  const supabase = createAnonClient();
  let q = supabase
    .from('directors')
    .select('director_id, name_prefix, full_name, position_name, gender, picture_url')
    .order('full_name', { ascending: true })
    .limit(200);
  const needle = (query ?? '').trim();
  if (needle) {
    q = q.or(`full_name.ilike.%${needle}%,name_prefix.ilike.%${needle}%`);
  }
  const { data, error } = await q;
  if (error) {
    if (/directors|schema cache/i.test(error.message)) return [];
    throw error;
  }
  return (data ?? []).map((row) => mapDirectorRow(row as Record<string, unknown>));
}

export async function fetchActiveSchoolsForDirector(
  directorId: string
): Promise<{ school_id: number; school_name: string }[]> {
  const id = directorId.trim();
  if (!id) return [];
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from('School_Basic')
    .select('school_id, school_name')
    .eq('director_id', id)
    .order('school_name', { ascending: true });
  if (error) {
    if (/director_id|schema cache/i.test(error.message)) return [];
    throw error;
  }
  return (data ?? []).map((r) => ({
    school_id: Number(r.school_id),
    school_name: String(r.school_name ?? r.school_id),
  }));
}

export async function fetchDirectorHistory(
  directorId: string
): Promise<DirectorHistoryEntry[]> {
  const id = directorId.trim();
  if (!id) return [];
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from('director_school_history')
    .select('id, director_id, school_id, started_at, ended_at')
    .eq('director_id', id)
    .order('started_at', { ascending: false });
  if (error) {
    if (/director_school_history|schema cache/i.test(error.message)) return [];
    throw error;
  }
  const rows = data ?? [];
  const schoolIds = [
    ...new Set(rows.map((r) => Number(r.school_id)).filter(Number.isFinite)),
  ];
  const nameById = new Map<number, string>();
  if (schoolIds.length) {
    const schools = await supabase
      .from('School_Basic')
      .select('school_id, school_name')
      .in('school_id', schoolIds);
    for (const s of schools.data ?? []) {
      nameById.set(Number(s.school_id), String(s.school_name ?? s.school_id));
    }
  }
  return rows.map((r) => {
    const schoolId = Number(r.school_id);
    return {
      id: String(r.id),
      director_id: String(r.director_id),
      school_id: schoolId,
      school_name: nameById.get(schoolId) ?? String(schoolId),
      started_at: String(r.started_at),
      ended_at: r.ended_at != null ? String(r.ended_at) : null,
      active: r.ended_at == null,
    };
  });
}

export async function fetchSchoolDirectorId(
  schoolId: string | number
): Promise<string | null> {
  const sid = typeof schoolId === 'number' ? schoolId : Number(String(schoolId).trim());
  if (!Number.isFinite(sid)) return null;
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from('School_Basic')
    .select('director_id')
    .eq('school_id', sid)
    .maybeSingle();
  if (error || !data) return null;
  return data.director_id != null ? String(data.director_id) : null;
}
