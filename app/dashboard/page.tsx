import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getSessionProfile } from '@/lib/auth/session';
import { fetchCompareScoresByYear, fetchSchools } from '@/lib/supabase/schools';
import {
  calendarPeers,
  isFieldRole,
  schoolsActionable,
  schoolsInScope,
  toScopeDirectory,
  type1GeoTeamIds,
} from '@/lib/auth/scope';
import {
  actionProvinces,
  controlProvinces,
  overlappingType1s,
  parseT2ViewType1Cookie,
  T2_VIEW_TYPE1S_COOKIE,
} from '@/lib/auth/province-radar';
import { SCORE_YEAR_CURRENT, SCORE_YEAR_PREVIOUS } from '@/lib/scores/years';
import {
  effectiveOverseerTier,
  formatPersonLabel,
  isOverseerType1,
  isOverseerType2,
  normalizeRole,
  roleDisplayLabel,
} from '@/lib/types';
import { StaffDashboardClient } from '@/components/dashboard/StaffDashboardClient';
import { ManagedSchoolsSkeleton } from '@/components/ui/PageSkeleton';
import {
  listCalendarEventsForStaffIds,
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
  const isT2 = isOverseerType2(r, profile.overseer_tier);
  /** Type 1 uses SO-style dashboard; Type 2 + staff keep staff dashboard */
  const useSoDashboard = isSO || isT1;
  const isStaff = r === 'staff';

  const jar = await cookies();
  const t2ViewSelectedIds = isT2
    ? parseT2ViewType1Cookie(jar.get(T2_VIEW_TYPE1S_COOKIE)?.value)
    : null;
  const readableOpts = isT2 ? { selectedType1Ids: t2ViewSelectedIds } : {};

  const [
    all,
    myEvents,
    profiles,
    comments,
    staffComments,
    compareScoresByYear,
    directoryUsers,
  ] = await Promise.all([
    fetchSchools().catch(() => []),
    isStaff ? listMyCalendarEvents().catch(() => []) : Promise.resolve([]),
    useSoDashboard || isT2
      ? fetchAllUserProfiles().catch(() => [])
      : Promise.resolve([]),
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
    readStoredUsers().catch(() => []),
  ]);

  const directorySource =
    (useSoDashboard || isT2) && profiles.length ? profiles : directoryUsers;
  const directory = toScopeDirectory(directorySource);
  const scoped = schoolsInScope(profile, all, directory, readableOpts);
  const scopedIdSet = new Set(scoped.map((s) => String(s.school_id)));
  const myProvinces = new Set(
    (profile.assigned_provinces ?? []).map((p) => p.trim()).filter(Boolean)
  );

  const peerIds = [
    ...new Set(calendarPeers(profile, directory, all)),
  ];
  const calendarEvents = useSoDashboard
    ? await listCalendarEventsForStaffIds(peerIds).catch(() => [])
    : [];

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

  /** Type 1: geo-overlap team (Type 2 + Staff), not reports_to */
  const type1TeamIds = (() => {
    if (!isT1) return null as Set<string> | null;
    return type1GeoTeamIds(profile, directory, all);
  })();

  const activityPeople = useSoDashboard
    ? fieldProfiles
        .filter((u) => {
          if (isSO) return true;
          if (u.id === profile.id) return false;
          return type1TeamIds?.has(u.id) ?? false;
        })
        .map((u) => {
          const personSchools = schoolsActionable(u, all)
            .map((s) => String(s.school_id))
            .filter((id) => (isSO ? true : scopedIdSet.has(id)));
          const provinces = controlProvinces(u, all);
          return {
            id: u.id,
            full_name: u.full_name,
            name_prefix: u.name_prefix ?? null,
            role: normalizeRole(u.role),
            overseer_tier: u.overseer_tier ?? null,
            reports_to: u.reports_to,
            schoolIds: personSchools,
            controlProvinces: provinces,
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
          if (sid && scopedIdSet.has(sid)) return true;
          if (!sid && c.staff_id && type1TeamIds?.has(c.staff_id)) return true;
          return false;
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

  const type2ViewOptions = isT2
    ? overlappingType1s(profile, directorySource).map((u) => ({
        id: u.id,
        label:
          formatPersonLabel(
            normalizeRole(u.role),
            u.name_prefix,
            u.full_name
          ) || u.id,
        provinces: actionProvinces(u),
      }))
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
      type2ViewOptions={type2ViewOptions}
      type2ViewSelectedIds={t2ViewSelectedIds}
      activityClipProvinces={isT1 ? actionProvinces(profile) : null}
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
