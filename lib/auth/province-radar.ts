import type { OverseerTier, SchoolFull } from '@/lib/types';
import {
  districtKey,
  isOverseerLike,
  isOverseerType1,
  isOverseerType2,
  isSchoolAdminRole,
  normalizeRole,
} from '@/lib/types';
import type { PermissionUser } from '@/lib/auth/permissions';
import { isGlobalDomainScope } from '@/lib/auth/domain-scope';

export const T2_VIEW_TYPE1S_COOKIE = 'coned-t2-view-type1s';

export type RadarUser = PermissionUser & {
  full_name?: string | null;
  name_prefix?: string | null;
  disabled?: boolean | null;
};

function uniq(list: string[]): string[] {
  return [...new Set(list.map((p) => p.trim()).filter(Boolean))];
}

/** Provinces an overseer may act on (own assigned_provinces). */
export function actionProvinces(user: PermissionUser | null | undefined): string[] {
  if (!user) return [];
  const role = normalizeRole(user.role);
  if (role === 'super_overseer') return []; // caller treats SO as all
  if (!isOverseerLike(role)) return [];
  // Global grant kept as ['*'] — callers that need a full list must expand
  return uniq(user.assigned_provinces ?? []);
}

export function overlapProvinces(a: string[], b: string[]): string[] {
  if (isGlobalDomainScope(a) || isGlobalDomainScope(b)) {
    // Global ∩ X → X (minus sentinel); Global ∩ Global → ['*']
    if (isGlobalDomainScope(a) && isGlobalDomainScope(b)) return ['*'];
    const other = isGlobalDomainScope(a) ? b : a;
    return uniq(other.filter((p) => p !== '*'));
  }
  const setB = new Set(b.map((p) => p.trim()).filter(Boolean));
  return uniq(a.filter((p) => setB.has(p.trim())));
}

export function provincesIntersect(a: string[], b: string[]): boolean {
  if (isGlobalDomainScope(a) || isGlobalDomainScope(b)) return true;
  return overlapProvinces(a, b).length > 0;
}

/**
 * Resolve staff control provinces from assigned districts / area ids via schools.
 */
export function staffProvinces(
  user: PermissionUser | null | undefined,
  schools: SchoolFull[]
): string[] {
  if (!user || normalizeRole(user.role) !== 'staff') return [];
  const assigned = user.assigned_districts ?? [];
  if (!assigned.length) return [];
  if (isGlobalDomainScope(assigned)) {
    return uniq(
      schools
        .map((s) => s.province?.trim() || s.Gov_Domain?.province_name?.trim() || '')
        .filter(Boolean)
    );
  }

  const out = new Set<string>();
  for (const token of assigned) {
    const t = token.trim();
    if (!t) continue;
    if (t.includes('|')) {
      const p = t.split('|')[0]?.trim();
      if (p) out.add(p);
      continue;
    }
    for (const s of schools) {
      const areaId = s.area_id != null ? String(s.area_id) : '';
      const areaName = s.area_name?.trim() ?? '';
      const govP = s.Gov_Domain?.province_name?.trim() ?? '';
      const prov = s.province?.trim() ?? govP;
      const d = s.district?.trim() ?? '';
      const key = prov && d ? districtKey(prov, d) : null;
      const match =
        (areaId && t === areaId) ||
        (areaName && t === areaName) ||
        (key && t === key);
      if (match && prov) out.add(prov);
    }
  }
  return [...out];
}

/** School-admin control provinces from assigned_schools → school.province. */
export function directorProvinces(
  user: PermissionUser | null | undefined,
  schools: SchoolFull[] = []
): string[] {
  if (!user || !isSchoolAdminRole(user.role)) return [];
  const assigned = new Set(
    (user.assigned_schools ?? []).map((s) => String(s).trim()).filter(Boolean)
  );
  if (!assigned.size) return [];
  return uniq(
    schools
      .filter((s) => assigned.has(String(s.school_id)))
      .map((s) => s.province?.trim() || '')
      .filter(Boolean)
  );
}

/** Control provinces for nesting/clip: Type1/2 = assigned; Staff = district→province; School admin = school provinces. */
export function controlProvinces(
  user: PermissionUser | null | undefined,
  schools: SchoolFull[] = []
): string[] {
  if (!user) return [];
  const role = normalizeRole(user.role);
  if (role === 'staff') return staffProvinces(user, schools);
  if (isSchoolAdminRole(role)) return directorProvinces(user, schools);
  if (isOverseerLike(role)) return actionProvinces(user);
  return [];
}

/** School admins whose school provinces ∩ Type 1 control provinces. */
export function directorsUnderType1(
  type1: PermissionUser,
  directory: RadarUser[],
  schools: SchoolFull[]
): RadarUser[] {
  if (!isType1User(type1)) return [];
  const t1p = actionProvinces(type1);
  return directory.filter(
    (u) =>
      !u.disabled &&
      isSchoolAdminRole(u.role) &&
      provincesIntersect(t1p, directorProvinces(u, schools))
  );
}

export function isType1User(user: PermissionUser): boolean {
  return isOverseerType1(user.role, user.overseer_tier);
}

export function isType2User(user: PermissionUser): boolean {
  return isOverseerType2(user.role, user.overseer_tier);
}

/** Type 1 accounts that share at least one province with this Type 2. */
export function overlappingType1s(
  type2: PermissionUser,
  directory: RadarUser[]
): RadarUser[] {
  if (!isType2User(type2)) return [];
  const mine = actionProvinces(type2);
  if (!mine.length) return [];
  return directory.filter((u) => {
    if (u.disabled) return false;
    if (!isType1User(u)) return false;
    return provincesIntersect(mine, actionProvinces(u));
  });
}

/**
 * Type 2 view provinces = union of selected overlapping Type 1 province groups.
 * Empty selection → own action provinces only.
 * If selected ids omitted / null → all overlapping Type 1s (default).
 */
export function type2ViewProvinces(
  type2: PermissionUser,
  directory: RadarUser[],
  selectedType1Ids?: string[] | null
): string[] {
  if (!isType2User(type2)) return actionProvinces(type2);
  const overlaps = overlappingType1s(type2, directory);
  if (!overlaps.length) return actionProvinces(type2);

  const selected =
    selectedType1Ids == null
      ? overlaps.map((u) => u.id)
      : selectedType1Ids.filter((id) => overlaps.some((u) => u.id === id));

  if (!selected.length) return actionProvinces(type2);

  const out = new Set<string>();
  for (const id of selected) {
    const t1 = overlaps.find((u) => u.id === id);
    if (!t1) continue;
    for (const p of actionProvinces(t1)) out.add(p);
  }
  return [...out];
}

export function type2UnderType1(
  type1: PermissionUser,
  directory: RadarUser[]
): RadarUser[] {
  if (!isType1User(type1)) return [];
  const t1p = actionProvinces(type1);
  return directory.filter(
    (u) =>
      !u.disabled &&
      isType2User(u) &&
      provincesIntersect(t1p, actionProvinces(u))
  );
}

export function staffUnderType1(
  type1: PermissionUser,
  directory: RadarUser[],
  schools: SchoolFull[]
): RadarUser[] {
  if (!isType1User(type1)) return [];
  const t1p = actionProvinces(type1);
  return directory.filter((u) => {
    if (u.disabled || normalizeRole(u.role) !== 'staff') return false;
    return provincesIntersect(t1p, staffProvinces(u, schools));
  });
}

export function parseT2ViewType1Cookie(raw: string | undefined | null): string[] | null {
  if (raw == null || raw === '') return null;
  try {
    let text = raw;
    try {
      text = decodeURIComponent(raw);
    } catch {
      /* already decoded */
    }
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.map(String).filter(Boolean);
  } catch {
    return null;
  }
}

/** Clip helper: keep province if in allow set (empty allow = keep none). */
export function provinceInClip(province: string | null | undefined, clip: string[]): boolean {
  const p = (province ?? '').trim();
  if (!p || !clip.length) return false;
  return clip.includes(p);
}
