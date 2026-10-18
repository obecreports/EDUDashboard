import type { OverseerTier, SchoolFull, UserProfile, UserRole } from '@/lib/types';
import {
  districtKey,
  isOverseerLike,
  isOverseerType2,
  normalizeRole,
} from '@/lib/types';
import type { StoredUserProfile } from '@/lib/auth/mock-users';

/** Minimal user shape for geo scope (avoids circular import with scope.ts). */
export type PermissionUser = Pick<
  UserProfile | StoredUserProfile,
  'id' | 'role' | 'assigned_provinces' | 'assigned_districts' | 'reports_to'
> & {
  overseer_tier?: OverseerTier | null;
};

export const ACTION_SCOPE_ERROR =
  'คุณมีสิทธิ์สร้างนัดหมาย/รายงานเฉพาะในจังหวัดที่ได้รับมอบหมายเท่านั้น';

function uniqProvinces(list: string[] | null | undefined): string[] {
  return [
    ...new Set(
      (list ?? [])
        .map((p) => p.trim())
        .filter(Boolean)
    ),
  ];
}

/**
 * Provinces the user may act on (schedule / write report).
 * Overseer Type 2 → own assigned_provinces only.
 */
export function getActionableProvinces(
  user: PermissionUser | null | undefined
): string[] {
  if (!user) return [];
  const role = normalizeRole(user.role);
  if (!isOverseerLike(role)) return [];
  return uniqProvinces(user.assigned_provinces);
}

/**
 * Provinces the user may view (dashboard / calendar / reports list).
 * Overseer Type 2 → parent Type 1 assigned_provinces when directory is provided.
 */
export function getReadableProvinces(
  user: PermissionUser | null | undefined,
  directory: PermissionUser[] = []
): string[] {
  if (!user) return [];
  const role = normalizeRole(user.role);
  if (!isOverseerLike(role)) return [];

  if (isOverseerType2(role, user.overseer_tier) && user.reports_to) {
    const parent = directory.find((u) => u.id === user.reports_to);
    if (parent && isOverseerLike(normalizeRole(parent.role))) {
      const parentProvinces = uniqProvinces(parent.assigned_provinces);
      if (parentProvinces.length) return parentProvinces;
    }
  }

  return getActionableProvinces(user);
}

function staffSchoolMatch(user: PermissionUser, school: SchoolFull): boolean {
  const assigned = user.assigned_districts ?? [];
  if (!assigned.length) return false;
  const areaId = school.area_id != null ? String(school.area_id) : '';
  const areaName = school.area_name?.trim() ?? '';
  if (areaId && assigned.includes(areaId)) return true;
  if (areaName && assigned.includes(areaName)) return true;
  const p = school.province?.trim();
  const d = school.district?.trim();
  const key = p && d ? districtKey(p, d) : null;
  return Boolean(key) && assigned.includes(key!);
}

/** Read-only school visibility (Type 2 uses parent Type 1 provinces). */
export function isSchoolReadable(
  user: PermissionUser | null | undefined,
  school: SchoolFull,
  directory: PermissionUser[] = []
): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (role === 'super_overseer') return true;
  if (role === 'admin' || role === 'super_admin' || role === 'guest') return false;

  if (isOverseerLike(role)) {
    const province = school.province?.trim() ?? '';
    return Boolean(province) && getReadableProvinces(user, directory).includes(province);
  }

  if (role === 'staff') return staffSchoolMatch(user, school);
  return false;
}

/** Write school visibility (Type 2 uses own assigned_provinces). */
export function isSchoolActionable(
  user: PermissionUser | null | undefined,
  school: SchoolFull
): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (role === 'super_overseer') return true;
  if (role === 'admin' || role === 'super_admin' || role === 'guest') return false;

  if (isOverseerLike(role)) {
    const province = school.province?.trim() ?? '';
    return Boolean(province) && getActionableProvinces(user).includes(province);
  }

  if (role === 'staff') return staffSchoolMatch(user, school);
  return false;
}

export function schoolsReadable(
  user: PermissionUser | null | undefined,
  schools: SchoolFull[],
  directory: PermissionUser[] = []
): SchoolFull[] {
  if (!user) return [];
  if (normalizeRole(user.role) === 'super_overseer') return schools;
  return schools.filter((s) => isSchoolReadable(user, s, directory));
}

export function schoolsActionable(
  user: PermissionUser | null | undefined,
  schools: SchoolFull[]
): SchoolFull[] {
  if (!user) return [];
  if (normalizeRole(user.role) === 'super_overseer') return schools;
  return schools.filter((s) => isSchoolActionable(user, s));
}

/** Map stored users → directory for parent province lookup. */
export function toScopeDirectory(
  users: Array<
    Pick<
      PermissionUser,
      | 'id'
      | 'role'
      | 'assigned_provinces'
      | 'assigned_districts'
      | 'reports_to'
      | 'overseer_tier'
    >
  >
): PermissionUser[] {
  return users.map((u) => ({
    id: u.id,
    role: u.role as UserRole,
    overseer_tier: u.overseer_tier ?? null,
    assigned_provinces: u.assigned_provinces ?? [],
    assigned_districts: u.assigned_districts ?? [],
    reports_to: u.reports_to ?? null,
  }));
}

/**
 * Server-side gate for schedule / report writes.
 * Returns ACTION_SCOPE_ERROR when province is outside actionable set.
 */
export async function assertSchoolInActionScope(
  user: PermissionUser,
  schoolId: string | number | null | undefined
): Promise<{ ok: true; school: SchoolFull } | { ok: false; error: string }> {
  const id = schoolId != null ? String(schoolId).trim() : '';
  if (!id) {
    return { ok: false, error: 'กรุณาเลือกโรงเรียน' };
  }

  const { fetchSchools } = await import('@/lib/supabase/schools');
  const schools = await fetchSchools().catch(() => []);
  const school = schools.find((s) => String(s.school_id) === id);
  if (!school) return { ok: false, error: 'ไม่พบโรงเรียน' };

  if (normalizeRole(user.role) === 'super_overseer') {
    return { ok: true, school };
  }

  if (!isSchoolActionable(user, school)) {
    return { ok: false, error: ACTION_SCOPE_ERROR };
  }
  return { ok: true, school };
}
