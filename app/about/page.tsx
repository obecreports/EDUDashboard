import { redirect } from 'next/navigation';
import { fetchSchools, formatFetchError } from '@/lib/supabase/schools';
import { AboutProjectMockup } from '@/components/landing/AboutProjectMockup';
import { getSessionProfile } from '@/lib/auth/session';
import { readContentAccessMapStored } from '@/lib/auth/user-store';
import { canAccess } from '@/lib/auth/content-access';
import { MOCK_USER_SEEDS } from '@/lib/auth/mock-users';
import { normalizeRole } from '@/lib/types';

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

  const overseers = MOCK_USER_SEEDS.filter((u) => u.role === 'overseer').map((u) => ({
    id: u.id,
    name: u.full_name,
    namePrefix: u.name_prefix ?? null,
    position: u.position,
    provinces: u.assigned_provinces ?? [],
  }));

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
