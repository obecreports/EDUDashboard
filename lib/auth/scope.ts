import type { SchoolFull, UserProfile, UserRole } from '@/lib/types';
import { districtKey, normalizeRole } from '@/lib/types';
import type { StoredUserProfile } from '@/lib/auth/mock-users';

export type ScopeUser = Pick<
  UserProfile | StoredUserProfile,
  'id' | 'role' | 'assigned_provinces' | 'assigned_districts' | 'reports_to'
>;

export function isFieldRole(role: UserRole): boolean {
  const r = normalizeRole(role);
  return r === 'staff' || r === 'overseer' || r === 'super_overseer';
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

/** True if school falls under user's assigned geo scope */
export function isSchoolInScope(user: ScopeUser | null | undefined, school: SchoolFull): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (role === 'super_overseer') return true;
  if (role === 'admin' || role === 'super_admin' || role === 'guest') return false;

  const province = school.province?.trim() ?? '';
  const key = schoolDistrictKey(school);

  if (role === 'overseer') {
    return Boolean(province) && (user.assigned_provinces ?? []).includes(province);
  }

  if (role === 'staff') {
    const assigned = user.assigned_districts ?? [];
    if (!assigned.length) return false;
    // Preferred: Gov_Domain / เขตพื้นที่การศึกษา (area_id or area_name)
    const areaId = school.area_id != null ? String(school.area_id) : '';
    const areaName = school.area_name?.trim() ?? '';
    if (areaId && assigned.includes(areaId)) return true;
    if (areaName && assigned.includes(areaName)) return true;
    // Legacy: province|district keys
    return Boolean(key) && assigned.includes(key!);
  }

  return false;
}

export function schoolsInScope(user: ScopeUser | null | undefined, schools: SchoolFull[]): SchoolFull[] {
  if (!user) return [];
  const role = normalizeRole(user.role);
  if (role === 'super_overseer') return schools;
  return schools.filter((s) => isSchoolInScope(user, s));
}

/** Full login detail (scores, comments) vs guest-like */
export function canAccessSchoolDetail(
  user: ScopeUser | null | undefined,
  school: SchoolFull,
  isAuthenticated: boolean
): boolean {
  if (!isAuthenticated || !user) return false;
  const role = normalizeRole(user.role);
  if (role === 'super_overseer') return true;
  if (role === 'staff' || role === 'overseer') return isSchoolInScope(user, school);
  return false;
}

export function canSeeScores(
  user: ScopeUser | null | undefined,
  school: SchoolFull,
  isAuthenticated: boolean
): boolean {
  return canAccessSchoolDetail(user, school, isAuthenticated);
}

export function canComment(
  user: ScopeUser | null | undefined,
  school: SchoolFull,
  isAuthenticated: boolean
): boolean {
  return canAccessSchoolDetail(user, school, isAuthenticated);
}

/** SWOT is read-only for all field roles */
export function canEditSwot(_user: ScopeUser | null | undefined): boolean {
  return false;
}

/**
 * Calendar peer visibility:
 * - staff: self + overseer/super_overseer in chain + other staff under same overseer
 * - overseer: self + super_overseer + staff under command (not other overseers)
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

  if (role === 'overseer') {
    if (user.reports_to) ids.add(user.reports_to);
    for (const u of allUsers) {
      if (normalizeRole(u.role) === 'staff' && u.reports_to === user.id) {
        ids.add(u.id);
      }
      if (normalizeRole(u.role) === 'super_overseer') ids.add(u.id);
    }
    return [...ids];
  }

  if (role === 'staff') {
    const bossId = user.reports_to;
    if (bossId) {
      ids.add(bossId);
      const boss = allUsers.find((u) => u.id === bossId);
      if (boss?.reports_to) ids.add(boss.reports_to);
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
  if (r === 'staff' || r === 'overseer' || r === 'super_overseer') return '/dashboard';
  if (r === 'admin' || r === 'super_admin') return '/admin/accounts';
  return '/';
}
