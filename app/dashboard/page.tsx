import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getSessionProfile } from '@/lib/auth/session';
import { fetchCompareScoresByYear, fetchSchools } from '@/lib/supabase/schools';
import { isFieldRole, schoolsInScope, toScopeDirectory } from '@/lib/auth/scope';
import { SCORE_YEAR_CURRENT, SCORE_YEAR_PREVIOUS } from '@/lib/scores/years';
import { normalizeRole, ROLE_LABELS } from '@/lib/types';
import { StaffDashboardClient } from '@/components/dashboard/StaffDashboardClient';
import { ManagedSchoolsSkeleton } from '@/components/ui/PageSkeleton';
import {
  listAllCookieCalendarEvents,
  listMyCalendarEvents,
} from '@/app/actions/visits';
import { fetchAllUserProfiles } from '@/lib/supabase/profiles';
import { readStoredUsers } from '@/lib/auth/user-store';
import { fetchAllSchoolComments } from '@/lib/supabase/school-swot';
import { eventHasMappedReport, type ReportActivityLink } from '@/lib/activity/complete';
import { normalizeStatus } from '@/lib/visits/labels';

export const dynamic = 'force-dynamic';

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function DashboardBody() {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  const r = normalizeRole(role);
  if (!isAuthenticated || !profile || !isFieldRole(r)) {
    redirect('/login?next=/dashboard');
  }

  const isSO = r === 'super_overseer';
  const isStaff = r === 'staff';
  const [
    all,
    calendarEvents,
    myEvents,
    profiles,
    comments,
    staffComments,
    compareScoresByYear,
    directoryUsers,
  ] = await Promise.all([
    fetchSchools().catch(() => []),
    listAllCookieCalendarEvents().catch(() => []),
    isStaff ? listMyCalendarEvents().catch(() => []) : Promise.resolve([]),
    isSO ? fetchAllUserProfiles().catch(() => []) : Promise.resolve([]),
    isSO ? fetchAllSchoolComments().catch(() => []) : Promise.resolve([]),
    isStaff ? fetchAllSchoolComments().catch(() => []) : Promise.resolve([]),
    isSO
      ? fetchCompareScoresByYear().catch((err) => {
          console.error('[dashboard] fetchCompareScoresByYear failed', err);
          return {
            [SCORE_YEAR_PREVIOUS]: {},
            [SCORE_YEAR_CURRENT]: {},
          };
        })
      : Promise.resolve({}),
    // Type 2 readable scope needs parent Type 1 provinces
    !isSO ? readStoredUsers().catch(() => []) : Promise.resolve([]),
  ]);
  const directory = toScopeDirectory(isSO ? profiles : directoryUsers);
  const scoped = schoolsInScope(profile, all, directory);

  const today = todayYmd();
  const staffReportLinks: ReportActivityLink[] = staffComments.map((c) => ({
    id: c.id,
    school_id: c.school_id || '',
    staff_id: c.staff_id,
    report_date: c.report_date ?? (c.created_at ? c.created_at.slice(0, 10) : null),
    calendar_event_id: c.calendar_event_id ?? null,
  }));

  const pendingReportVisits = isStaff
    ? myEvents
        .filter((e) => {
          if (normalizeStatus(e.status_th ?? e.status) === 'ยกเลิก') return false;
          if (e.date >= today) return false;
          return !eventHasMappedReport(e, staffReportLinks);
        })
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 8)
        .map((e) => ({
          id: e.id,
          school_id: e.school_id,
          school_name: e.school_name || e.school_id || 'โรงเรียน',
          date: e.date,
        }))
    : [];

  const fieldProfiles = profiles.filter(
    (u) => isFieldRole(normalizeRole(u.role)) && !u.disabled
  );

  const activityPeople = isSO
    ? fieldProfiles.map((u) => ({
        id: u.id,
        full_name: u.full_name,
        name_prefix: u.name_prefix ?? null,
        role: normalizeRole(u.role),
        overseer_tier: u.overseer_tier ?? null,
        reports_to: u.reports_to,
        schoolIds: schoolsInScope(u, all, directory).map((s) => String(s.school_id)),
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
      pendingReportVisits={pendingReportVisits}
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
