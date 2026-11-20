import type { SchoolFull } from '@/lib/types';

/** Default photo when a school has no uploaded image (local public asset). */
export const SCHOOL_DEFAULT_IMAGE = '/images/school_default.jpg';

/**
 * Resolve school cover / display image.
 * Prefer school-sign (ป้ายโรงเรียน) when resolved, then `coverImageUrl`, else default.
 */
export function schoolCoverImage(
  school:
    | (Pick<SchoolFull, 'coverImageUrl'> & { schoolSignUrl?: string | null })
    | { coverImageUrl?: string | null; schoolSignUrl?: string | null }
    | null
    | undefined
): string {
  const sign = school?.schoolSignUrl?.trim();
  if (sign) return sign;
  const uploaded = school?.coverImageUrl?.trim();
  if (uploaded) return uploaded;
  return SCHOOL_DEFAULT_IMAGE;
}

/** Stable Storage object key for school cover uploads */
export function schoolStorageObjectPath(schoolId: string | number): string {
  return `schools/${schoolId}/cover.jpg`;
}

/** Stable Storage object key for director photo uploads */
export function directorStorageObjectPath(directorId: string): string {
  return `directors/${directorId}/photo.jpg`;
}

/** Resolve director picture URL (no default asset — UI may hide when empty). */
export function directorPictureUrl(
  director: { picture_url?: string | null } | null | undefined
): string | null {
  const url = director?.picture_url?.trim();
  return url || null;
}

export const PERSON_AVATAR_DEFAULT = '/images/avatar_default.svg';

/** Person / OS avatar — uploaded URL or default silhouette. */
export function personAvatarUrl(
  user: { avatar_url?: string | null } | null | undefined
): string {
  const url = user?.avatar_url?.trim();
  return url || PERSON_AVATAR_DEFAULT;
}

export function overseerStorageObjectPath(userId: string): string {
  return `overseers/${userId}/photo.jpg`;
}
