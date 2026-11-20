/**
 * ASCII-only Supabase Storage paths (Thai object keys are rejected by Storage).
 *
 * Split:
 * - Storage keys / filenames → English slugs (`classroom`, `auditorium`, `main`)
 * - DB `school_buildings.categorize` → Thai (`อาคารเรียน`, `อาคารหอประชุม`)
 * - UI ribbon → DB Thai as-is
 *
 * Layout in bucket `school-covers`:
 *   schools/{id}/sign.{ext}
 *   schools/{id}/blueprint.{ext}
 *   schools/{id}/Building/{NNN}_{categorySlug}_{sideSlug}.{ext}
 *   (NNN = 3-digit pad of DB integer building_number)
 */

export const SCHOOL_MEDIA_BUCKET = 'school-covers';
/** Supabase Storage folder name (ASCII; capital B as uploaded) */
export const SCHOOL_BUILDINGS_FOLDER = 'Building';
export const SCHOOL_SIGN_STEM = 'sign';
export const SCHOOL_BLUEPRINT_STEM = 'blueprint';

/** Normalize "001" / "1" / 1 → integer; invalid → null */
export function normalizeBuildingNumber(
  raw: string | number | null | undefined
): number | null {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** Filename segment: 1 → "001" */
export function padBuildingNumber(n: number): string {
  return String(Math.trunc(n)).padStart(3, '0');
}

/** Hero / main photo side slug in Storage */
export const BUILDING_SIDE_MAIN = 'main';

/** DB + UI value for classroom buildings (room fields shown) */
export const BUILDING_CATEGORY_CLASSROOM_TH = 'อาคารเรียน';

/**
 * Storage filename category slug → Thai for DB `categorize` / UI.
 */
export const BUILDING_CATEGORY_SLUG_TO_TH: Record<string, string> = {
  classroom: 'อาคารเรียน',
  auditorium: 'อาคารหอประชุม',
  multipurpose: 'อาคารอเนกประสงค์',
  cafeteria: 'โรงอาหาร',
  toilet: 'ห้องน้ำ',
  library: 'ห้องสมุด',
  office: 'สำนักงาน',
  dorm: 'หอพัก',
  workshop: 'โรงฝึกงาน',
  gym: 'โรงยิม',
  other: 'อื่นๆ',
};

export const BUILDING_CATEGORY_TH_TO_SLUG: Record<string, string> =
  Object.fromEntries(
    Object.entries(BUILDING_CATEGORY_SLUG_TO_TH).map(([en, th]) => [th, en])
  );

/** side slug → Thai label for thumb captions */
export const BUILDING_SIDE_SLUG_TO_TH: Record<string, string> = {
  main: 'รูปหลัก',
  right: 'ด้านขวา',
  left: 'ด้านซ้าย',
  front: 'ด้านหน้า',
  back: 'ด้านหลัง',
  top: 'ด้านบน',
  other: 'อื่นๆ',
};

export const BUILDING_SIDE_TH_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(BUILDING_SIDE_SLUG_TO_TH).map(([en, th]) => [th, en])
);

/** Normalize any Thai or English category token → Storage slug */
export function buildingCategoryToSlug(raw: string): string {
  const t = raw.trim();
  if (!t) return 'other';
  if (BUILDING_CATEGORY_TH_TO_SLUG[t]) return BUILDING_CATEGORY_TH_TO_SLUG[t]!;
  const lower = t.toLowerCase();
  if (BUILDING_CATEGORY_SLUG_TO_TH[lower]) return lower;
  if (/^[a-z0-9-]+$/i.test(t)) return lower;
  return 'other';
}

/** Normalize any Thai or English category token → Thai for DB/UI */
export function buildingCategoryToThai(raw: string): string {
  const t = raw.trim();
  if (!t) return 'อาคาร';
  if (BUILDING_CATEGORY_SLUG_TO_TH[t.toLowerCase()]) {
    return BUILDING_CATEGORY_SLUG_TO_TH[t.toLowerCase()]!;
  }
  return t; // already Thai (or custom)
}

/** Alias for UI ribbon / labels */
export function buildingCategoryLabel(raw: string): string {
  return buildingCategoryToThai(raw);
}

export function buildingSideToSlug(raw: string): string {
  const t = raw.trim();
  if (!t) return 'other';
  if (BUILDING_SIDE_TH_TO_SLUG[t]) return BUILDING_SIDE_TH_TO_SLUG[t]!;
  const lower = t.toLowerCase();
  if (BUILDING_SIDE_SLUG_TO_TH[lower]) return lower;
  if (/^[a-z0-9-]+$/i.test(t)) return lower;
  return 'other';
}

export function buildingSideToThai(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (BUILDING_SIDE_SLUG_TO_TH[t.toLowerCase()]) {
    return BUILDING_SIDE_SLUG_TO_TH[t.toLowerCase()]!;
  }
  return t;
}

/** Alias for thumb captions */
export function buildingSideLabel(raw: string): string {
  return buildingSideToThai(raw);
}

export function isBuildingHeroSide(side: string): boolean {
  const s = side.trim();
  return s === BUILDING_SIDE_MAIN || s === 'รูปหลัก';
}

export function schoolBuildingsStorageFolder(schoolId: string | number): string {
  return `schools/${String(schoolId).trim()}/${SCHOOL_BUILDINGS_FOLDER}`;
}

export const SCHOOL_SIGN_BASENAMES = [
  'sign.jpg',
  'sign.jpeg',
  'sign.png',
  'sign.webp',
] as const;

export function isSchoolSignObjectName(name: string): boolean {
  return /^sign\./i.test(name.trim());
}

export function isSchoolBlueprintObjectName(name: string): boolean {
  return /^blueprint\./i.test(name.trim());
}
