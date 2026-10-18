import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getSessionProfile } from '@/lib/auth/session';
import { fetchCompareScoresByYear, fetchSchools } from '@/lib/supabase/schools';
import { isFieldRole, schoolsInScope, toScopeDirectory } from '@/lib/auth/scope';
import { SCORE_YEAR_CURRENT, SCORE_YEAR_PREVIOUS } from '@/lib/scores/years';
import {
  effectiveOverseerTier,
  isOverseerType1,
  normalizeRole,
  roleDisplayLabel,
} from '@/lib/types';
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
  const isT1 = isOverseerType1(r, profile.overseer_tier);
  /** Type 1 uses SO-style dashboard; Type 2 + staff keep staff dashboard */
  const useSoDashboard = isSO || isT1;
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
    useSoDashboard ? fetchAllUserProfiles().catch(() => []) : Promise.resolve([]),
    useSoDashboard ? fetchAllSchoolComments().catch(() => []) : Promise.resolve([]),
    isStaff ? fetchAllSchoolComments().catch(() => []) : Promise.resolve([]),
    useSoDashboard
      ? fetchCompareScoresByYear().catch((err) => {
          console.error('[dashboard] fetchCompareScoresByYear failed', err);
          return {
            [SCORE_YEAR_PREVIOUS]: {},
            [SCORE_YEAR_CURRENT]: {},
          };
        })
      : Promise.resolve({}),
    // Type 2 readable scope needs parent Type 1 provinces
    !useSoDashboard ? readStoredUsers().catch(() => []) : Promise.resolve([]),
  ]);

  const directory = toScopeDirectory(useSoDashboard ? profiles : directoryUsers);
  const scoped = schoolsInScope(profile, all, directory);
  const scopedIdSet = new Set(scoped.map((s) => String(s.school_id)));
  const myProvinces = new Set(
    (profile.assigned_provinces ?? []).map((p) => p.trim()).filter(Boolean)
  );

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

  /** Type 1: self + Type 2 / staff / volunteers in their command chain */
  const type1TeamIds = (() => {
    if (!isT1) return null as Set<string> | null;
    const ids = new Set<string>([profile.id]);
    const direct = fieldProfiles.filter((u) => u.reports_to === profile.id);
    for (const u of direct) ids.add(u.id);
    const type2Ids = new Set(
      direct
        .filter((u) => normalizeRole(u.role) === 'overseer')
        .map((u) => u.id)
    );
    for (const u of fieldProfiles) {
      if (u.reports_to && type2Ids.has(u.reports_to)) ids.add(u.id);
    }
    return ids;
  })();

  const activityPeople = useSoDashboard
    ? fieldProfiles
        .filter((u) => {
          if (isSO) return true;
          // Type 1: team only — do not list themselves
          if (u.id === profile.id) return false;
          return type1TeamIds?.has(u.id) ?? false;
        })
        .map((u) => {
          const personSchools = schoolsInScope(u, all, directory)
            .map((s) => String(s.school_id))
            .filter((id) => (isSO ? true : scopedIdSet.has(id)));
          return {
            id: u.id,
            full_name: u.full_name,
            name_prefix: u.name_prefix ?? null,
            role: normalizeRole(u.role),
            overseer_tier: u.overseer_tier ?? null,
            reports_to: u.reports_to,
            schoolIds: personSchools,
          };
        })
    : [];

  const activitySchools = useSoDashboard
    ? (isSO ? all : scoped).map((s) => ({
        id: String(s.school_id),
        name: s.school_name_th,
        province: s.province ?? '',
        district: s.district ?? '',
        area_name: s.area_name || s.Gov_Domain?.area_name || '',
      }))
    : [];

  const activityReports = useSoDashboard
    ? comments
        .filter((c) => {
          if (isSO) return true;
          const sid = c.school_id ? String(c.school_id) : '';
          return sid ? scopedIdSet.has(sid) : false;
        })
        .map((c) => ({
          id: c.id,
          school_id: c.school_id || '',
          staff_id: c.staff_id,
          report_date: c.report_date ?? (c.created_at ? c.created_at.slice(0, 10) : null),
          calendar_event_id: c.calendar_event_id ?? null,
        }))
    : [];

  const soCalendarEvents = useSoDashboard
    ? isSO
      ? calendarEvents
      : calendarEvents.filter((e) => {
          const ids = [
            e.school_id,
            ...(e.school_ids ?? []),
          ]
            .filter(Boolean)
            .map((id) => String(id));
          if (ids.some((id) => scopedIdSet.has(id))) return true;
          const prov = (e.province ?? '').trim();
          return Boolean(prov) && myProvinces.has(prov);
        })
    : [];

  return (
    <StaffDashboardClient
      schools={scoped}
      nationalSchools={isSO ? all : scoped}
      roleLabel={roleDisplayLabel(r, profile.overseer_tier)}
      role={r}
      overseerTier={effectiveOverseerTier(r, profile.overseer_tier)}
      staffName={profile.full_name ?? undefined}
      birthday={profile.birthday}
      namePrefix={profile.name_prefix}
      calendarEvents={soCalendarEvents}
      activityPeople={activityPeople}
      activitySchools={activitySchools}
      activityReports={activityReports}
      compareScoresByYear={useSoDashboard ? compareScoresByYear : undefined}
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
