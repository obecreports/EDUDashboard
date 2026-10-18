import type { OverseerTier, SchoolFull, UserProfile, UserRole } from '@/lib/types';
import { districtKey, isOverseerLike, normalizeRole } from '@/lib/types';
import type { StoredUserProfile } from '@/lib/auth/mock-users';
import {
  isSchoolActionable,
  isSchoolReadable,
  schoolsActionable,
  schoolsReadable,
} from '@/lib/auth/permissions';

export type ScopeUser = Pick<
  UserProfile | StoredUserProfile,
  'id' | 'role' | 'assigned_provinces' | 'assigned_districts' | 'reports_to'
> & {
  overseer_tier?: OverseerTier | null;
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
  ACTION_SCOPE_ERROR,
} from '@/lib/auth/permissions';

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
 * View-scope school check (Type 2 → parent Type 1 provinces when directory given).
 * Prefer passing `directory` for Overseer Type 2 so readable scope expands correctly.
 */
export function isSchoolInScope(
  user: ScopeUser | null | undefined,
  school: SchoolFull,
  directory: ScopeUser[] = []
): boolean {
  return isSchoolReadable(user, school, directory);
}

/** View-scope school list. Pass `directory` so Type 2 inherits parent provinces. */
export function schoolsInScope(
  user: ScopeUser | null | undefined,
  schools: SchoolFull[],
  directory: ScopeUser[] = []
): SchoolFull[] {
  return schoolsReadable(user, schools, directory);
}

/** Full login detail (scores, comments) vs guest-like — uses readable scope. */
export function canAccessSchoolDetail(
  user: ScopeUser | null | undefined,
  school: SchoolFull,
  isAuthenticated: boolean,
  directory: ScopeUser[] = []
): boolean {
  if (!isAuthenticated || !user) return false;
  const role = normalizeRole(user.role);
  if (role === 'super_overseer') return true;
  if (role === 'staff' || isOverseerLike(role)) {
    return isSchoolReadable(user, school, directory);
  }
  return false;
}

export function canSeeScores(
  user: ScopeUser | null | undefined,
  school: SchoolFull,
  isAuthenticated: boolean,
  directory: ScopeUser[] = []
): boolean {
  return canAccessSchoolDetail(user, school, isAuthenticated, directory);
}

export function canComment(
  user: ScopeUser | null | undefined,
  school: SchoolFull,
  isAuthenticated: boolean,
  directory: ScopeUser[] = []
): boolean {
  return canAccessSchoolDetail(user, school, isAuthenticated, directory);
}

/** SWOT is read-only for all field roles */
export function canEditSwot(_user: ScopeUser | null | undefined): boolean {
  return false;
}

function addSubordinatesOf(
  bossId: string,
  allUsers: ScopeUser[],
  ids: Set<string>
) {
  for (const u of allUsers) {
    if (u.reports_to !== bossId) continue;
    const ur = normalizeRole(u.role);
    if (ur === 'staff' || ur === 'volunteer' || ur === 'overseer') {
      ids.add(u.id);
      if (ur === 'overseer') addSubordinatesOf(u.id, allUsers, ids);
    }
  }
}

/**
 * Calendar peer visibility:
 * - staff: self + overseer/volunteer/super_overseer in chain + peers under same boss
 * - overseer Type 1: self + Type 2 under them + their staff/volunteers + SO chain
 * - overseer Type 2 / volunteer: self + boss chain + staff under command
 * - super_overseer: everyone in field roles
 */
export function calendarPeers(
  user: ScopeUser,
  allUsers: ScopeUser[]
): string[] {
  const role = normalizeRole(user.role);
  const ids = new Set<string>([user.id]);

  if (role === 'super_overseer') {
    for (const u of allUsers) {
      if (isFieldRole(normalizeRole(u.role))) ids.add(u.id);
    }
    return [...ids];
  }

  if (isOverseerLike(role)) {
    if (user.reports_to) ids.add(user.reports_to);
    const boss = allUsers.find((u) => u.id === user.reports_to);
    if (boss?.reports_to) ids.add(boss.reports_to);

    addSubordinatesOf(user.id, allUsers, ids);

    for (const u of allUsers) {
      const ur = normalizeRole(u.role);
      if (ur === 'super_overseer') ids.add(u.id);
      if (role === 'volunteer' && ur === 'overseer' && u.id === user.reports_to) {
        ids.add(u.id);
      }
    }

    return [...ids];
  }

  if (role === 'staff') {
    const bossId = user.reports_to;
    if (bossId) {
      ids.add(bossId);
      const boss = allUsers.find((u) => u.id === bossId);
      if (boss?.reports_to) ids.add(boss.reports_to);
      const grand = boss?.reports_to
        ? allUsers.find((u) => u.id === boss.reports_to)
        : undefined;
      if (grand?.reports_to) ids.add(grand.reports_to);
      for (const u of allUsers) {
        if (normalizeRole(u.role) === 'staff' && u.reports_to === bossId) {
          ids.add(u.id);
        }
      }
    }
    for (const u of allUsers) {
      if (normalizeRole(u.role) === 'super_overseer') ids.add(u.id);
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
