import type { SchoolFull } from '@/lib/types';

/** Default photo when a school has no uploaded image (local public asset). */
export const SCHOOL_DEFAULT_IMAGE = '/images/school_default.jpg';

/**
 * Resolve school cover image.
 * Prefer uploaded Supabase Storage public URL on `coverImageUrl`,
 * otherwise fall back to the shared default asset.
 */
export function schoolCoverImage(
  school: Pick<SchoolFull, 'coverImageUrl'> | { coverImageUrl?: string | null } | null | undefined
): string {
  const uploaded = school?.coverImageUrl?.trim();
  if (uploaded) return uploaded;
  return SCHOOL_DEFAULT_IMAGE;
}

/** Stable Storage object key for school cover uploads */
export function schoolStorageObjectPath(schoolId: string | number): string {
  return `schools/${schoolId}/cover.jpg`;
}
