import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { fetchSchools } from '@/lib/supabase/schools';
import { ManagedSchoolsClient } from '@/components/schools/ManagedSchoolsClient';
import { ManagedSchoolsSkeleton } from '@/components/ui/PageSkeleton';
import { getSessionProfile } from '@/lib/auth/session';
import {
  calendarPeers,
  isFieldRole,
  schoolsInScope,
  toScopeDirectory,
  type1GeoTeamIds,
} from '@/lib/auth/scope';
import {
  formatPersonLabel,
  isOverseerType1,
  isOverseerType2,
  normalizeRole,
  type UserRole,
} from '@/lib/types';
import { listCalendarEventsForStaffIds } from '@/app/actions/visits';
import { enrichSchoolsWithVisits } from '@/lib/schools/visit-enrich';
import { fetchAllUserProfiles } from '@/lib/supabase/profiles';
import { fetchAllSchoolComments } from '@/lib/supabase/school-swot';
import {
  parseT2ViewType1Cookie,
  T2_VIEW_TYPE1S_COOKIE,
} from '@/lib/auth/province-radar';

export const revalidate = 120;

export type DomainPersonOption = {
  id: string;
  full_name: string;
  name_prefix?: string | null;
  role: UserRole;
  schoolIds: string[];
  reports_to?: string | null;
};

async function SchoolsBody({
  q,
  status,
  person,
  province,
  area,
  visit,
}: {
  q?: string;
  status?: string;
  person?: string;
  province?: string;
  area?: string;
  visit?: string;
}) {
  const [{ role, profile, isAuthenticated }, schoolsRaw] = await Promise.all([
    getSessionProfile(),
    fetchSchools().catch(() => []),
  ]);

  const r = normalizeRole(role);
  const staffMode = isAuthenticated && isFieldRole(r);
  const isT2 = Boolean(profile && isOverseerType2(r, profile.overseer_tier));
  const isT1 = Boolean(profile && isOverseerType1(r, profile.overseer_tier));

  const jar = await cookies();
  const t2ViewSelectedIds = isT2
    ? parseT2ViewType1Cookie(jar.get(T2_VIEW_TYPE1S_COOKIE)?.value)
    : null;
  const readableOpts = isT2 ? { selectedType1Ids: t2ViewSelectedIds } : {};

  const profilesForScope =
    staffMode && profile
      ? await fetchAllUserProfiles().catch(() => [])
      : [];
  const directory = toScopeDirectory(profilesForScope);

  const [calendarEvents, comments] = isAuthenticated && profile
    ? await Promise.all([
        listCalendarEventsForStaffIds(
          calendarPeers(profile, directory, schoolsRaw)
        ).catch(() => []),
        fetchAllSchoolComments().catch(() => []),
      ])
    : [[], []];
  const reportLinks = comments.map((c) => ({
    id: c.id,
    school_id: c.school_id || '',
    staff_id: c.staff_id,
    report_date: c.report_date ?? (c.created_at ? c.created_at.slice(0, 10) : null),
    calendar_event_id: c.calendar_event_id ?? null,
  }));
  const schools = enrichSchoolsWithVisits(schoolsRaw, calendarEvents, reportLinks);

  const scoped = staffMode
    ? schoolsInScope(profile, schools, directory, readableOpts)
    : schools;
  const inScopeIds = staffMode ? scoped.map((s) => String(s.school_id)) : [];

  let domainPeople: DomainPersonOption[] = [];
  let domainPeopleLabel = '';
  if (
    staffMode &&
    profile &&
    (r === 'super_overseer' || r === 'overseer' || r === 'volunteer')
  ) {
    const profiles = profilesForScope;
    if (r === 'super_overseer') {
      domainPeopleLabel = 'ผู้รับผิดชอบพื้นที่ (องคมนตรี · อาสาสมัคร · ศึกษานิเทศก์)';
      domainPeople = profiles
        .filter(
          (u) =>
            (normalizeRole(u.role) === 'overseer' ||
              normalizeRole(u.role) === 'volunteer' ||
              normalizeRole(u.role) === 'staff') &&
            !u.disabled
        )
        .map((u) => ({
          id: u.id,
          full_name: u.full_name,
          name_prefix: u.name_prefix ?? null,
          role: normalizeRole(u.role),
          schoolIds: schoolsInScope(u, schools, directory).map((s) =>
            String(s.school_id)
          ),
          reports_to: u.reports_to ?? null,
        }));
    } else if (isT1) {
      domainPeopleLabel = 'แยกรายบุคคล';
      const teamIds = type1GeoTeamIds(profile, directory, schools);
      teamIds.delete(profile.id);
      domainPeople = profiles
        .filter((u) => !u.disabled && teamIds.has(u.id))
        .map((u) => ({
          id: u.id,
          full_name: u.full_name,
          name_prefix: u.name_prefix ?? null,
          role: normalizeRole(u.role),
          schoolIds: schoolsInScope(u, schools, directory).map((s) =>
            String(s.school_id)
          ),
          reports_to: u.reports_to ?? null,
        }));
    }
  }

  return (
    <ManagedSchoolsClient
      schools={staffMode ? scoped : schools}
      mode={staffMode ? 'staff' : 'guest'}
      showScores={staffMode}
      inScopeIds={inScopeIds}
      staffName={
        profile
          ? formatPersonLabel(r, profile.name_prefix, profile.full_name) || undefined
          : undefined
      }
      initialQuery={q ?? ''}
      initialStatus={status}
      initialPersonIds={person ? [person] : []}
      initialProvince={province ?? ''}
      initialArea={area ?? ''}
      initialVisit={visit}
      scopeOnly={staffMode}
      domainPeople={domainPeople}
      domainPeopleLabel={domainPeopleLabel}
    />
  );
}

export default async function SchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    person?: string;
    province?: string;
    area?: string;
    visit?: string;
  }>;
}) {
  const sp = await searchParams;
  return (
    <Suspense fallback={<ManagedSchoolsSkeleton />}>
      <SchoolsBody
        q={sp.q}
        status={sp.status}
        person={sp.person}
        province={sp.province}
        area={sp.area}
        visit={sp.visit}
      />
    </Suspense>
  );
}
