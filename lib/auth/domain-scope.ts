/** Sentinel token meaning “all provinces” or “all gov domains”. */
export const DOMAIN_SCOPE_GLOBAL = '*';

export function isGlobalDomainScope(
  list: string[] | null | undefined
): boolean {
  return (list ?? []).some((t) => String(t).trim() === DOMAIN_SCOPE_GLOBAL);
}

/** Expand assigned list; `*` → full catalog. */
export function expandProvinces(
  list: string[] | null | undefined,
  allProvinces: string[]
): string[] {
  if (isGlobalDomainScope(list)) {
    return [
      ...new Set(allProvinces.map((p) => p.trim()).filter(Boolean)),
    ];
  }
  return [
    ...new Set(
      (list ?? [])
        .map((p) => p.trim())
        .filter((p) => p && p !== DOMAIN_SCOPE_GLOBAL)
    ),
  ];
}

export function expandDistricts(
  list: string[] | null | undefined,
  allAreaIds: string[]
): string[] {
  if (isGlobalDomainScope(list)) {
    return [
      ...new Set(allAreaIds.map((a) => String(a).trim()).filter(Boolean)),
    ];
  }
  return [
    ...new Set(
      (list ?? [])
        .map((a) => String(a).trim())
        .filter((a) => a && a !== DOMAIN_SCOPE_GLOBAL)
    ),
  ];
}

export function domainScopeLabel(
  list: string[] | null | undefined,
  kind: 'province' | 'district'
): string {
  if (isGlobalDomainScope(list)) {
    return kind === 'province' ? 'ทั้งประเทศ' : 'ทุกเขตพื้นที่การศึกษา';
  }
  const items = (list ?? []).filter(
    (t) => t && t !== DOMAIN_SCOPE_GLOBAL
  );
  return items.length ? items.join(', ') : '—';
}
