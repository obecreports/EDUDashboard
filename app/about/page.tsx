import { redirect } from 'next/navigation';
import { fetchSchools, formatFetchError } from '@/lib/supabase/schools';
import { AboutProjectMockup } from '@/components/landing/AboutProjectMockup';
import { getSessionProfile } from '@/lib/auth/session';
import {
  readContentAccessMapStored,
  readStoredUsers,
} from '@/lib/auth/user-store';
import { canAccess } from '@/lib/auth/content-access';
import { fetchAllUserProfiles } from '@/lib/supabase/profiles';
import { type2UnderType1 } from '@/lib/auth/province-radar';
import { toScopeDirectory } from '@/lib/auth/scope';
import { getSiteSetting } from '@/lib/auth/site-settings-db';
import {
  OVERSEER_DISPLAY_ORDER_KEY,
  parseOverseerDisplayOrder,
  sortByOverseerDisplayOrder,
} from '@/lib/auth/overseer-display-order';
import {
  isOverseerType1,
  normalizeRole,
  positionDisplayLabel,
} from '@/lib/types';
import type { OverseerRosterItem } from '@/components/landing/OverseersRoster';

export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  const [{ role }, acl] = await Promise.all([
    getSessionProfile(),
    readContentAccessMapStored(),
  ]);
  if (!canAccess(normalizeRole(role), 'about', 'view', acl)) {
    redirect('/');
  }

  let schools: Awaited<ReturnType<typeof fetchSchools>> = [];
  let errorMsg: string | null = null;
  try {
    schools = await fetchSchools();
  } catch (e: unknown) {
    errorMsg = formatFetchError(e);
  }

  const generalSchools = schools.length || 143;
  const provinces = new Set(schools.map((s) => s.province).filter(Boolean)).size || 35;
  const vocationalSchools = 10;

  const provinceCounts: Record<string, number> = {};
  for (const s of schools) {
    const p = s.province?.trim();
    if (!p) continue;
    provinceCounts[p] = (provinceCounts[p] ?? 0) + 1;
  }

  const [dbProfiles, orderRaw] = await Promise.all([
    fetchAllUserProfiles().catch(() => []),
    getSiteSetting(OVERSEER_DISPLAY_ORDER_KEY).catch(() => null),
  ]);
  const cookieUsers = dbProfiles.length
    ? []
    : await readStoredUsers().catch(() => []);
  const profiles = dbProfiles.length ? dbProfiles : cookieUsers;
  const directory = toScopeDirectory(profiles);
  const displayOrder = parseOverseerDisplayOrder(orderRaw);

  const overseers: OverseerRosterItem[] = sortByOverseerDisplayOrder(
    profiles
      .filter((u) => {
        if (u.disabled) return false;
        const r = normalizeRole(u.role);
        if (r === 'covert_overseer') return true;
        return isOverseerType1(u.role, u.overseer_tier);
      })
      .map((u) => {
        const provSet = new Set(
          (u.assigned_provinces ?? []).map((p) => p.trim()).filter(Boolean)
        );
        const t2s = type2UnderType1(u, directory);
        let volunteerCenterCount = 0;
        let volunteerBorderCount = 0;
        for (const t2 of t2s) {
          const r = normalizeRole(t2.role);
          if (r === 'volunteer_center') volunteerCenterCount += 1;
          else volunteerBorderCount += 1;
        }

        let schoolCount = 0;
        let studentCount = 0;
        for (const s of schools) {
          const p = s.province?.trim();
          if (!p || !provSet.has(p)) continue;
          schoolCount += 1;
          studentCount += s.studentSummary?.totalStudents ?? 0;
        }

        // Prefer stored position so ประธานองคมนตรี shows as set (not generic role label)
        const rawPosition = (u.position ?? '').trim();
        const position =
          rawPosition ||
          positionDisplayLabel(u.role, u.overseer_tier, u.position) ||
          '';

        return {
          id: u.id,
          name: u.full_name,
          namePrefix: u.name_prefix ?? null,
          position,
          provinces: [...provSet].sort((a, b) => a.localeCompare(b, 'th')),
          avatarUrl: u.avatar_url ?? null,
          volunteerCenterCount,
          volunteerBorderCount,
          schoolCount,
          studentCount,
        };
      }),
    displayOrder
  );

  return (
    <>
      {errorMsg && (
        <div className="page-shell pt-4">
          <div className="ed-card p-3 text-amber-800 bg-amber-50 text-sm">
            ใช้ตัวเลขประมาณการบางส่วน — {errorMsg}
          </div>
        </div>
      )}
      <AboutProjectMockup
        generalSchools={generalSchools}
        vocationalSchools={vocationalSchools}
        provinces={provinces}
        overseers={overseers}
        provinceCounts={provinceCounts}
      />
    </>
  );
}
