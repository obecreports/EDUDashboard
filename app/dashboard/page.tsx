import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getSessionProfile } from '@/lib/auth/session';
import { fetchCompareScoresByYear, fetchSchools } from '@/lib/supabase/schools';
import { isFieldRole, schoolsInScope } from '@/lib/auth/scope';
import { SCORE_YEAR_CURRENT, SCORE_YEAR_PREVIOUS } from '@/lib/scores/years';
import { normalizeRole, ROLE_LABELS } from '@/lib/types';
import { StaffDashboardClient } from '@/components/dashboard/StaffDashboardClient';
import { ManagedSchoolsSkeleton } from '@/components/ui/PageSkeleton';
import { listAllCookieCalendarEvents } from '@/app/actions/visits';
import { fetchAllUserProfiles } from '@/lib/supabase/profiles';
import { fetchAllSchoolComments } from '@/lib/supabase/school-swot';

export const dynamic = 'force-dynamic';

async function DashboardBody() {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  const r = normalizeRole(role);
  if (!isAuthenticated || !profile || !isFieldRole(r)) {
    redirect('/login?next=/dashboard');
  }

  const isSO = r === 'super_overseer';
  const [all, calendarEvents, profiles, comments, compareScoresByYear] = await Promise.all([
    fetchSchools().catch(() => []),
    listAllCookieCalendarEvents().catch(() => []),
    isSO ? fetchAllUserProfiles().catch(() => []) : Promise.resolve([]),
    isSO ? fetchAllSchoolComments().catch(() => []) : Promise.resolve([]),
    isSO
      ? fetchCompareScoresByYear().catch((err) => {
          console.error('[dashboard] fetchCompareScoresByYear failed', err);
          return {
            [SCORE_YEAR_PREVIOUS]: {},
            [SCORE_YEAR_CURRENT]: {},
          };
        })
      : Promise.resolve({}),
  ]);
  const scoped = schoolsInScope(profile, all);

  const fieldProfiles = profiles.filter(
    (u) => isFieldRole(normalizeRole(u.role)) && !u.disabled
  );

  const activityPeople = isSO
    ? fieldProfiles.map((u) => ({
        id: u.id,
        full_name: u.full_name,
        role: normalizeRole(u.role),
        reports_to: u.reports_to,
        schoolIds: schoolsInScope(u, all).map((s) => String(s.school_id)),
      }))
    : [];

  const activitySchools = isSO
    ? all.map((s) => ({
        id: String(s.school_id),
        name: s.school_name_th,
        province: s.province ?? '',
        district: s.district ?? '',
        area_name: s.area_name || s.Gov_Domain?.area_name || '',
      }))
    : [];

  const activityReports = isSO
    ? comments.map((c) => ({
        id: c.id,
        school_id: c.school_id || '',
        staff_id: c.staff_id,
        report_date: c.report_date ?? (c.created_at ? c.created_at.slice(0, 10) : null),
        calendar_event_id: c.calendar_event_id ?? null,
      }))
    : [];

  return (
    <StaffDashboardClient
      schools={scoped}
      nationalSchools={all}
      roleLabel={ROLE_LABELS[r]}
      role={r}
      staffName={profile.full_name ?? undefined}
      birthday={profile.birthday}
      namePrefix={profile.name_prefix}
      calendarEvents={isSO ? calendarEvents : []}
      activityPeople={activityPeople}
      activitySchools={activitySchools}
      activityReports={activityReports}
      compareScoresByYear={isSO ? compareScoresByYear : undefined}
    />
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<ManagedSchoolsSkeleton />}>
      <DashboardBody />
    </Suspense>
  );
}
