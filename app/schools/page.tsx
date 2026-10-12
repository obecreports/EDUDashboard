import { Suspense } from 'react';
import { fetchSchools } from '@/lib/supabase/schools';
import { ManagedSchoolsClient } from '@/components/schools/ManagedSchoolsClient';
import { ManagedSchoolsSkeleton } from '@/components/ui/PageSkeleton';
import { getSessionProfile } from '@/lib/auth/session';
import { isFieldRole, schoolsInScope } from '@/lib/auth/scope';
import { normalizeRole } from '@/lib/types';
import { listAllCookieCalendarEvents } from '@/app/actions/visits';
import { enrichSchoolsWithVisits } from '@/lib/schools/visit-enrich';

export const revalidate = 120;

async function SchoolsBody({ q }: { q?: string }) {
  const [{ role, profile, isAuthenticated }, schoolsRaw] = await Promise.all([
    getSessionProfile(),
    fetchSchools().catch(() => []),
  ]);

  const calendarEvents = isAuthenticated
    ? await listAllCookieCalendarEvents().catch(() => [])
    : [];
  const schools = enrichSchoolsWithVisits(schoolsRaw, calendarEvents);

  const r = normalizeRole(role);
  const staffMode = isAuthenticated && isFieldRole(r);
  const scoped = staffMode ? schoolsInScope(profile, schools) : schools;
  const inScopeIds = staffMode ? scoped.map((s) => String(s.school_id)) : [];

  return (
    <ManagedSchoolsClient
      schools={staffMode ? scoped : schools}
      mode={staffMode ? 'staff' : 'guest'}
      showScores={staffMode}
      inScopeIds={inScopeIds}
      staffName={profile?.full_name ?? undefined}
      initialQuery={q ?? ''}
      scopeOnly={staffMode}
    />
  );
}

export default async function SchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  return (
    <Suspense fallback={<ManagedSchoolsSkeleton />}>
      <SchoolsBody q={sp.q} />
    </Suspense>
  );
}
