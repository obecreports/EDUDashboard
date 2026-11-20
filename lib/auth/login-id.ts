import type { UserRole } from '@/lib/types';
import { normalizeRole } from '@/lib/types';

/** Short login prefix by role (stored in user_profiles.email). */
export function loginPrefixForRole(role: UserRole | string): string {
  const r = normalizeRole(role);
  switch (r) {
    case 'staff':
      return 'staff';
    case 'overseer':
      return 'OS';
    case 'volunteer_center':
    case 'volunteer_border':
    case 'special_volunteer':
      return 'VL';
    case 'covert_overseer':
      return 'COV';
    case 'director':
      // Director login ID = school_id (no auto-prefix); caller must supply email
      return '';
    case 'super_overseer':
      return 'SO';
    case 'admin':
      return 'admin';
    case 'super_admin':
      return 'sa';
    default:
      return 'user';
  }
}

function maxNumericSuffix(logins: string[], prefix: string): number {
  const re = new RegExp(`^${escapeRegExp(prefix)}(\\d+)$`, 'i');
  let max = 0;
  for (const login of logins) {
    const m = login.trim().match(re);
    if (!m) continue;
    const n = Number.parseInt(m[1], 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Next login id for role: `{prefix}{NNNN}` (4-digit pad).
 * VL roles use `{prefix}{NNN}` (3-digit: VL001).
 * Pass existing profile login ids (email column).
 * Director must supply school_id as login — returns empty string.
 */
export function allocateNextLoginId(
  role: UserRole | string,
  existingLogins: string[]
): string {
  const prefix = loginPrefixForRole(role);
  if (!prefix) return '';
  const pad = prefix === 'VL' ? 3 : 4;
  let next = maxNumericSuffix(existingLogins, prefix) + 1;
  const used = new Set(existingLogins.map((e) => e.trim().toLowerCase()));

  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = `${prefix}${String(next).padStart(pad, '0')}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
    next += 1;
  }

  return `${prefix}${String(Date.now()).slice(-pad)}`;
}
