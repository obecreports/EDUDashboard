import type { OverseerTier, SchoolFull, UserProfile, UserRole } from '@/lib/types';
import {
  districtKey,
  isOverseerLike,
  isOverseerType1,
  isOverseerType2,
  normalizeRole,
} from '@/lib/types';
import type { StoredUserProfile } from '@/lib/auth/mock-users';
import {
  isSchoolActionable,
  isSchoolReadable,
  schoolsActionable,
  schoolsReadable,
  type ReadableScopeOpts,
} from '@/lib/auth/permissions';
import {
  overlappingType1s,
  staffProvinces,
  staffUnderType1,
  type2UnderType1,
} from '@/lib/auth/province-radar';

export type ScopeUser = Pick<
  UserProfile | StoredUserProfile,
  'id' | 'role' | 'assigned_provinces' | 'assigned_districts' | 'reports_to'
> & {
  overseer_tier?: OverseerTier | null;
  disabled?: boolean | null;
};

export {
  getActionableProvinces,
  getReadableProvinces,
  isSchoolActionable,
  isSchoolReadable,
  schoolsActionable,
  schoolsReadable,
  toScopeDirectory,
  assertSchoolInActionScope,
  assertSchoolsInActionScope,
  ACTION_SCOPE_ERROR,
} from '@/lib/auth/permissions';

export type { ReadableScopeOpts } from '@/lib/auth/permissions';

export function isFieldRole(role: UserRole): boolean {
  const r = normalizeRole(role);
  return r === 'staff' || isOverseerLike(r) || r === 'super_overseer';
}

export function isAdminRole(role: UserRole): boolean {
  const r = normalizeRole(role);
  return r === 'admin' || r === 'super_admin';
}

export function schoolDistrictKey(school: Pick<SchoolFull, 'province' | 'district'>): string | null {
  const p = school.province?.trim();
  const d = school.district?.trim();
  if (!p || !d) return null;
  return districtKey(p, d);
}

/**
 * View-scope school check (Type 2 → selected overlapping Type 1 provinces).
 */
export function isSchoolInScope(
  user: ScopeUser | null | undefined,
  school: SchoolFull,
  directory: ScopeUser[] = [],
  opts: ReadableScopeOpts = {}
): boolean {
  return isSchoolReadable(user, school, directory, opts);
}

/** View-scope school list. Pass `directory` + Type 2 view filter opts. */
export function schoolsInScope(
  user: ScopeUser | null | undefined,
  schools: SchoolFull[],
  directory: ScopeUser[] = [],
  opts: ReadableScopeOpts = {}
): SchoolFull[] {
  return schoolsReadable(user, schools, directory, opts);
}

/** Full login detail (scores, comments) vs guest-like — uses readable scope. */
export function canAccessSchoolDetail(
  user: ScopeUser | null | undefined,
  school: SchoolFull,
  isAuthenticated: boolean,
  directory: ScopeUser[] = [],
  opts: ReadableScopeOpts = {}
): boolean {
  if (!isAuthenticated || !user) return false;
  const role = normalizeRole(user.role);
  if (role === 'super_overseer') return true;
  if (role === 'staff' || isOverseerLike(role)) {
    return isSchoolReadable(user, school, directory, opts);
  }
  return false;
}

export function canSeeScores(
  user: ScopeUser | null | undefined,
  school: SchoolFull,
  isAuthenticated: boolean,
  directory: ScopeUser[] = [],
  opts: ReadableScopeOpts = {}
): boolean {
  return canAccessSchoolDetail(user, school, isAuthenticated, directory, opts);
}

export function canComment(
  user: ScopeUser | null | undefined,
  school: SchoolFull,
  isAuthenticated: boolean,
  directory: ScopeUser[] = [],
  opts: ReadableScopeOpts = {}
): boolean {
  return canAccessSchoolDetail(user, school, isAuthenticated, directory, opts);
}

/** SWOT is read-only for all field roles */
export function canEditSwot(_user: ScopeUser | null | undefined): boolean {
  return false;
}

/**
 * @deprecated Prefer type2UnderType1 / staffUnderType1 (province overlap).
 * Kept for admin/org surfaces that still walk reports_to.
 */
export function addSubordinatesOf(
  bossId: string,
  allUsers: ScopeUser[],
  ids: Set<string>
) {
  for (const u of allUsers) {
    if (u.reports_to !== bossId) continue;
    const ur = normalizeRole(u.role);
    if (ur === 'staff' || ur === 'volunteer' || ur === 'overseer') {
      ids.add(u.id);
      if (ur === 'overseer' || ur === 'volunteer') {
        addSubordinatesOf(u.id, allUsers, ids);
      }
    }
  }
}

/** Type 1 team ids by province overlap (Type 2 + Staff), not reports_to. */
export function type1GeoTeamIds(
  type1: ScopeUser,
  allUsers: ScopeUser[],
  schools: SchoolFull[]
): Set<string> {
  const ids = new Set<string>([type1.id]);
  for (const u of type2UnderType1(type1, allUsers)) ids.add(u.id);
  for (const u of staffUnderType1(type1, allUsers, schools)) ids.add(u.id);
  return ids;
}

/**
 * Calendar peer visibility:
 * - staff: self + overlapping Type 1s (by district→province) + SO
 * - overseer Type 1: self + Type 2/Staff by province overlap + SO
 * - overseer Type 2: self + overlapping Type 1s + SO
 * - super_overseer: everyone in field roles
 */
export function calendarPeers(
  user: ScopeUser,
  allUsers: ScopeUser[],
  schools: SchoolFull[] = []
): string[] {
  const role = normalizeRole(user.role);
  const ids = new Set<string>([user.id]);

  if (role === 'super_overseer') {
    for (const u of allUsers) {
      if (isFieldRole(normalizeRole(u.role))) ids.add(u.id);
    }
    return [...ids];
  }

  for (const u of allUsers) {
    if (normalizeRole(u.role) === 'super_overseer') ids.add(u.id);
  }

  if (isOverseerType1(role, user.overseer_tier)) {
    for (const id of type1GeoTeamIds(user, allUsers, schools)) ids.add(id);
    return [...ids];
  }

  if (isOverseerType2(role, user.overseer_tier)) {
    for (const t1 of overlappingType1s(user, allUsers)) ids.add(t1.id);
    return [...ids];
  }

  if (role === 'staff') {
    for (const u of allUsers) {
      if (!isOverseerType1(u.role, u.overseer_tier)) continue;
      if (staffUnderType1(u, [user], schools).some((s) => s.id === user.id)) {
        ids.add(u.id);
      }
    }
    return [...ids];
  }

  return [...ids];
}

/**
 * Schedule invite peers (checkbox list) — separate from calendarPeers visibility.
 * - Overseer: all volunteers + staff in geo command (no further province clip)
 * - Volunteer: overlapping Type1; volunteers sharing province; staff in those provinces
 * - Staff: overlapping Type1; volunteers sharing province; other staff sharing province
 * - SO: all field roles
 * Non-SO never includes SO in the returned set.
 */
export function scheduleInvitePeers(
  user: ScopeUser,
  allUsers: ScopeUser[],
  schools: SchoolFull[] = []
): string[] {
  const role = normalizeRole(user.role);
  const ids = new Set<string>();
  const active = allUsers.filter((u) => !u.disabled);

  if (role === 'super_overseer') {
    for (const u of active) {
      if (isFieldRole(normalizeRole(u.role))) ids.add(u.id);
    }
    return [...ids];
  }

  if (isOverseerType1(role, user.overseer_tier)) {
    for (const id of type1GeoTeamIds(user, allUsers, schools)) {
      if (id !== user.id) ids.add(id);
    }
    return [...ids];
  }

  if (isOverseerType2(role, user.overseer_tier)) {
    const mine = new Set(user.assigned_provinces ?? []);
    for (const t1 of overlappingType1s(user, allUsers)) ids.add(t1.id);
    for (const u of active) {
      if (u.id === user.id) continue;
      const r = normalizeRole(u.role);
      if (r === 'super_overseer') continue;
      if (isOverseerType2(r, u.overseer_tier)) {
        if ((u.assigned_provinces ?? []).some((p) => mine.has(p))) ids.add(u.id);
      } else if (r === 'staff') {
        if (staffProvinces(u, schools).some((p) => mine.has(p))) ids.add(u.id);
      }
    }
    return [...ids];
  }

  if (role === 'staff') {
    const staffProv = new Set(staffProvinces(user, schools));
    for (const u of active) {
      if (!isOverseerType1(u.role, u.overseer_tier)) continue;
      if (staffUnderType1(u, [user], schools).some((s) => s.id === user.id)) {
        ids.add(u.id);
      }
    }
    for (const u of active) {
      if (u.id === user.id) continue;
      const r = normalizeRole(u.role);
      if (r === 'super_overseer') continue;
      if (isOverseerType2(r, u.overseer_tier)) {
        if ((u.assigned_provinces ?? []).some((p) => staffProv.has(p))) {
          ids.add(u.id);
        }
      } else if (r === 'staff') {
        if (staffProvinces(u, schools).some((p) => staffProv.has(p))) {
          ids.add(u.id);
        }
      }
    }
    return [...ids];
  }

  return [...ids];
}

export function postLoginPath(role: UserRole): string {
  const r = normalizeRole(role);
  if (r === 'staff' || isOverseerLike(r) || r === 'super_overseer') return '/dashboard';
  if (r === 'admin' || r === 'super_admin') return '/admin/accounts';
  return '/';
}

/** @deprecated use isSchoolActionable — kept for clarity at call sites */
export function canActOnSchool(
  user: ScopeUser | null | undefined,
  school: SchoolFull
): boolean {
  return isSchoolActionable(user, school);
}
