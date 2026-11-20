import { createAnonClient } from '@/lib/supabase/anon';
import type {
  SchoolBuilding,
  SchoolBuildingCard,
  SchoolBuildingPhoto,
} from '@/lib/types';
import {
  BUILDING_SIDE_MAIN,
  SCHOOL_MEDIA_BUCKET,
  SCHOOL_SIGN_BASENAMES,
  buildingCategoryToThai,
  buildingSideToThai,
  isBuildingHeroSide,
  isSchoolSignObjectName,
  normalizeBuildingNumber,
  schoolBuildingsStorageFolder,
} from '@/lib/schools/media-paths';

const BUILDING_SELECT =
  'id, school_id, building_number, categorize, building_type, room_plan, room_build, room_special, room_expand, build_year, building_lifetime, budget_cost, budget_origin, building_quality, building_status';

function mapBuilding(row: Record<string, unknown>): SchoolBuilding {
  const num = (v: unknown) => {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const buildingNumber = normalizeBuildingNumber(
    row.building_number as string | number | null
  );
  return {
    id: String(row.id),
    school_id: String(row.school_id),
    building_number: buildingNumber ?? 0,
    categorize: String(row.categorize ?? ''),
    building_type: row.building_type != null ? String(row.building_type) : null,
    room_plan: num(row.room_plan),
    room_build: num(row.room_build),
    room_special: num(row.room_special),
    room_expand: num(row.room_expand),
    build_year: row.build_year != null ? String(row.build_year) : null,
    building_lifetime:
      row.building_lifetime != null ? String(row.building_lifetime) : null,
    budget_cost: num(row.budget_cost),
    budget_origin:
      row.budget_origin != null ? String(row.budget_origin) : null,
    building_quality:
      row.building_quality != null ? String(row.building_quality) : null,
    building_status:
      row.building_status != null ? String(row.building_status) : null,
  };
}

/**
 * Parse Storage/local building photo name.
 * Storage: `001_classroom_main.jpg` (3-digit pad + EN category + side)
 * Local Thai still accepted: `001_อาคารเรียน_รูปหลัก.jpg`
 *
 * Returns integer building_number, Thai categorize, Thai side label.
 */
export function parseBuildingPhotoName(filename: string): {
  building_number: number;
  categorize: string;
  side: string;
} | null {
  const base = filename.replace(/\.[^.]+$/, '').trim();
  const parts = base.split('_');
  if (parts.length < 3) return null;
  const building_number = normalizeBuildingNumber(parts[0]!.trim());
  const sideRaw = parts[parts.length - 1]!.trim();
  const catRaw = parts.slice(1, -1).join('_').trim();
  if (building_number == null || !catRaw || !sideRaw) return null;
  return {
    building_number,
    categorize: buildingCategoryToThai(catRaw),
    side: buildingSideToThai(sideRaw),
  };
}

function storagePublicUrl(path: string): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return '';
  return `${url.replace(/\/$/, '')}/storage/v1/object/public/${SCHOOL_MEDIA_BUCKET}/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}

export async function fetchBuildingsBySchoolId(
  schoolId: string | number
): Promise<SchoolBuilding[]> {
  const id = Number(String(schoolId).trim());
  if (!Number.isFinite(id)) return [];
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from('school_buildings')
      .select(BUILDING_SELECT)
      .eq('school_id', id)
      .order('building_number', { ascending: true });
    if (error) return [];
    return (data ?? []).map((row) => mapBuilding(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

type ListedPhoto = SchoolBuildingPhoto & {
  building_number: number;
  categorize: string;
};

async function listBuildingFolder(
  schoolId: string | number
): Promise<ListedPhoto[]> {
  const id = String(schoolId).trim();
  if (!id) return [];
  try {
    const supabase = createAnonClient();
    const folder = schoolBuildingsStorageFolder(id);
    const { data, error } = await supabase.storage
      .from(SCHOOL_MEDIA_BUCKET)
      .list(folder, { limit: 500 });
    if (error || !data) return [];
    const out: ListedPhoto[] = [];
    for (const obj of data) {
      if (!obj.name || obj.name.endsWith('/')) continue;
      const parsed = parseBuildingPhotoName(obj.name);
      if (!parsed) continue;
      out.push({
        building_number: parsed.building_number,
        categorize: parsed.categorize,
        side: parsed.side,
        url: storagePublicUrl(`${folder}/${obj.name}`),
      });
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Merge DB rows + Storage photos by numeric building_number
 * so filename `003_…` joins DB row `3` (not a separate empty card).
 */
export async function fetchBuildingCardsForSchool(
  schoolId: string | number
): Promise<SchoolBuildingCard[]> {
  const [buildings, listed] = await Promise.all([
    fetchBuildingsBySchoolId(schoolId),
    listBuildingFolder(schoolId),
  ]);

  const photosByNum = new Map<number, ListedPhoto[]>();
  const catByNum = new Map<number, string>();
  for (const p of listed) {
    const key = p.building_number;
    const list = photosByNum.get(key) ?? [];
    list.push(p);
    photosByNum.set(key, list);
    if (!catByNum.has(key)) catByNum.set(key, p.categorize);
  }

  const numbers = new Set<number>([
    ...buildings
      .map((b) => normalizeBuildingNumber(b.building_number))
      .filter((n): n is number => n != null && n > 0),
    ...photosByNum.keys(),
  ]);

  const cards: SchoolBuildingCard[] = [];
  for (const num of [...numbers].sort((a, b) => a - b)) {
    const row = buildings.find(
      (b) => normalizeBuildingNumber(b.building_number) === num
    );
    const photos = photosByNum.get(num) ?? [];
    const hero =
      photos.find((p) => isBuildingHeroSide(p.side)) ?? photos[0] ?? null;
    const additional = photos
      .filter((p) => p.side !== (hero?.side ?? ''))
      .map(({ side, url }) => ({ side, url }));

    const categorize = buildingCategoryToThai(
      (row?.categorize && row.categorize.trim()) ||
        catByNum.get(num) ||
        'อาคาร'
    );

    cards.push({
      id: row?.id ?? `photo-${num}`,
      school_id: row?.school_id ?? String(schoolId),
      building_number: num,
      categorize,
      building_type: row?.building_type ?? null,
      room_plan: row?.room_plan ?? null,
      room_build: row?.room_build ?? null,
      room_special: row?.room_special ?? null,
      room_expand: row?.room_expand ?? null,
      build_year: row?.build_year ?? null,
      building_lifetime: row?.building_lifetime ?? null,
      budget_cost: row?.budget_cost ?? null,
      budget_origin: row?.budget_origin ?? null,
      building_quality: row?.building_quality ?? null,
      building_status: row?.building_status ?? null,
      heroUrl: hero?.url ?? null,
      additionalPhotos: additional,
    });
  }

  return cards;
}

export { SCHOOL_SIGN_BASENAMES, BUILDING_SIDE_MAIN };

export function schoolSignPublicUrl(
  schoolId: string | number,
  basename: string
): string {
  return storagePublicUrl(
    `schools/${String(schoolId).trim()}/${basename}`
  );
}

/** Probe which school-sign file exists via storage list (`sign.*`). */
export async function resolveSchoolSignUrl(
  schoolId: string | number
): Promise<string | null> {
  const id = String(schoolId).trim();
  if (!id) return null;
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase.storage
      .from(SCHOOL_MEDIA_BUCKET)
      .list(`schools/${id}`, { limit: 50 });
    if (error || !data) return null;
    const names = new Set(data.map((o) => o.name));
    for (const base of SCHOOL_SIGN_BASENAMES) {
      if (names.has(base)) return schoolSignPublicUrl(id, base);
    }
    const hit = data.find((o) => isSchoolSignObjectName(o.name));
    if (hit) return schoolSignPublicUrl(id, hit.name);
  } catch {
    /* ignore */
  }
  return null;
}
