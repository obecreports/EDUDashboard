import type { StoredUserProfile } from '@/lib/auth/mock-users';
import type { SchoolFull, UserProfile, UserRole } from '@/lib/types';
import {
  formatPersonLabel,
  isOverseerType1,
  normalizeRole,
  ROLE_LABELS,
} from '@/lib/types';
import { isGlobalDomainScope } from '@/lib/auth/domain-scope';
import { isSchoolReadable } from '@/lib/auth/permissions';

/** VL types counted on home / listed in อาสาสมัคร. */
export const DIRECTORY_VL_ROLES: UserRole[] = [
  'volunteer_center',
  'volunteer_border',
  'special_volunteer',
];

export function isDirectoryVlRole(role: UserRole | string): boolean {
  const r = normalizeRole(role);
  return (
    r === 'volunteer_center' ||
    r === 'volunteer_border' ||
    r === 'special_volunteer'
  );
}

export type DomainProvinceTree = {
  province: string;
  districts: string[];
};

export type HomeDomainPanel =
  | { kind: 'provinces'; title: string; tree: DomainProvinceTree[] }
  | { kind: 'schools'; title: string; schools: { id: string; name: string }[] };

function uniqSorted(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'th')
  );
}

/** Scoped schools for the viewer (readable domain). */
export function filterSchoolsInDomain(
  schools: SchoolFull[],
  viewer: UserProfile | StoredUserProfile | null,
  directory: Array<UserProfile | StoredUserProfile> = []
): SchoolFull[] {
  if (!viewer) return [];
  const role = normalizeRole(viewer.role);
  if (role === 'super_overseer') return schools;
  return schools.filter((s) => isSchoolReadable(viewer, s, directory));
}

export function buildDomainPanel(
  viewer: UserProfile | StoredUserProfile,
  scopedSchools: SchoolFull[]
): HomeDomainPanel {
  const role = normalizeRole(viewer.role);
  if (role === 'director') {
    const ids = new Set(
      (viewer.assigned_schools ?? []).map((id) => String(id).trim()).filter(Boolean)
    );
    const schools = scopedSchools
      .filter((s) => ids.has(String(s.school_id)))
      .map((s) => ({
        id: String(s.school_id),
        name: s.school_name_th || String(s.school_id),
      }));
    // Fallback: show assigned ids even if school row missing
    if (!schools.length && ids.size) {
      return {
        kind: 'schools',
        title: 'โรงเรียนที่ดูแล',
        schools: [...ids].map((id) => ({ id, name: id })),
      };
    }
    return { kind: 'schools', title: 'โรงเรียนที่ดูแล', schools };
  }

  const byProvince = new Map<string, Set<string>>();
  for (const s of scopedSchools) {
    const province = (s.province || '').trim();
    if (!province) continue;
    const district = (s.area_name || s.district || '').trim() || '—';
    if (!byProvince.has(province)) byProvince.set(province, new Set());
    byProvince.get(province)!.add(district);
  }

  // If no schools yet, still show assigned provinces for overseer-like
  if (!byProvince.size && Array.isArray(viewer.assigned_provinces)) {
    for (const p of viewer.assigned_provinces) {
      const province = p.trim();
      if (!province || province === '*') continue;
      byProvince.set(province, new Set());
    }
  }

  const tree: DomainProvinceTree[] = [...byProvince.entries()]
    .map(([province, districts]) => ({
      province,
      districts: uniqSorted([...districts]),
    }))
    .sort((a, b) => a.province.localeCompare(b.province, 'th'));

  return { kind: 'provinces', title: 'กลุ่มจังหวัดที่ดูแล', tree };
}

function provincesOverlap(
  a: string[] | null | undefined,
  b: string[] | null | undefined
): boolean {
  if (isGlobalDomainScope(a) || isGlobalDomainScope(b)) return true;
  const setB = new Set((b ?? []).map((p) => p.trim()).filter(Boolean));
  if (!setB.size) return false;
  return (a ?? []).some((p) => setB.has(p.trim()));
}

/** Type1 OS label for a VL (reports_to first, else overlapping province OS). */
export function resolveOverseerLabel(
  vl: StoredUserProfile,
  directory: StoredUserProfile[]
): string {
  if (vl.reports_to) {
    const boss = directory.find((u) => u.id === vl.reports_to);
    if (boss) {
      return (
        formatPersonLabel(boss.role, boss.name_prefix, boss.full_name) ||
        boss.full_name ||
        boss.email
      );
    }
  }
  const os = directory.find(
    (u) =>
      isOverseerType1(normalizeRole(u.role), u.overseer_tier) &&
      !u.disabled &&
      provincesOverlap(u.assigned_provinces, vl.assigned_provinces)
  );
  if (!os) return '—';
  return (
    formatPersonLabel(os.role, os.name_prefix, os.full_name) ||
    os.full_name ||
    os.email
  );
}

export function listVolunteersInDomain(
  viewer: UserProfile | StoredUserProfile,
  directory: StoredUserProfile[],
  scopedSchools: SchoolFull[]
): StoredUserProfile[] {
  const role = normalizeRole(viewer.role);
  const scopedProvinces = new Set(
    scopedSchools.map((s) => (s.province || '').trim()).filter(Boolean)
  );
  // Also include viewer's own provinces when school list empty
  for (const p of viewer.assigned_provinces ?? []) {
    if (p.trim() && p.trim() !== '*') scopedProvinces.add(p.trim());
  }

  return directory
    .filter((u) => {
      if (u.disabled) return false;
      if (!isDirectoryVlRole(u.role)) return false;
      if (role === 'super_overseer') return true;
      if (isGlobalDomainScope(u.assigned_provinces)) return true;
      if (!scopedProvinces.size) {
        return provincesOverlap(viewer.assigned_provinces, u.assigned_provinces);
      }
      return (u.assigned_provinces ?? []).some((p) =>
        scopedProvinces.has(p.trim())
      );
    })
    .sort((a, b) =>
      (a.full_name || '').localeCompare(b.full_name || '', 'th')
    );
}

export function vlTypeLabel(role: UserRole): string {
  return ROLE_LABELS[normalizeRole(role)] || String(role);
}

export function formatLastPosition(vl: {
  last_position_title?: string | null;
  last_position_year?: string | null;
  last_position_affiliation?: string | null;
}): string {
  const parts = [
    vl.last_position_title?.trim(),
    vl.last_position_year?.trim(),
    vl.last_position_affiliation?.trim(),
  ].filter(Boolean);
  return parts.length ? parts.join(' - ') : '—';
}

export function formatEducationLines(vl: {
  education_bachelor?: string | null;
  education_master?: string | null;
}): string {
  const parts = [
    vl.education_bachelor?.trim()
      ? `ป.ตรี: ${vl.education_bachelor.trim()}`
      : '',
    vl.education_master?.trim()
      ? `ป.โท: ${vl.education_master.trim()}`
      : '',
  ].filter(Boolean);
  return parts.length ? parts.join('\n') : '—';
}
