import { Suspense } from 'react';
import { fetchSchools } from '@/lib/supabase/schools';
import { ManagedSchoolsClient } from '@/components/schools/ManagedSchoolsClient';
import { ManagedSchoolsSkeleton } from '@/components/ui/PageSkeleton';
import { getSessionProfile } from '@/lib/auth/session';
import { isFieldRole, schoolsInScope } from '@/lib/auth/scope';
import { normalizeRole, type UserRole } from '@/lib/types';
import { listAllCookieCalendarEvents } from '@/app/actions/visits';
import { enrichSchoolsWithVisits } from '@/lib/schools/visit-enrich';
import { fetchAllUserProfiles } from '@/lib/supabase/profiles';
import { fetchAllSchoolComments } from '@/lib/supabase/school-swot';

export const revalidate = 120;

export type DomainPersonOption = {
  id: string;
  full_name: string;
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

  const [calendarEvents, comments] = isAuthenticated
    ? await Promise.all([
        listAllCookieCalendarEvents().catch(() => []),
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

  const r = normalizeRole(role);
  const staffMode = isAuthenticated && isFieldRole(r);
  const scoped = staffMode ? schoolsInScope(profile, schools) : schools;
  const inScopeIds = staffMode ? scoped.map((s) => String(s.school_id)) : [];

  let domainPeople: DomainPersonOption[] = [];
  let domainPeopleLabel = '';
  if (staffMode && profile && (r === 'super_overseer' || r === 'overseer')) {
    const profiles = await fetchAllUserProfiles().catch(() => []);
    if (r === 'super_overseer') {
      domainPeopleLabel = 'ผู้รับผิดชอบพื้นที่ (Overseer / Staff)';
      domainPeople = profiles
        .filter(
          (u) =>
            (normalizeRole(u.role) === 'overseer' || normalizeRole(u.role) === 'staff') &&
            !u.disabled
        )
        .map((u) => ({
          id: u.id,
          full_name: u.full_name,
          role: normalizeRole(u.role),
          schoolIds: schoolsInScope(u, schools).map((s) => String(s.school_id)),
          reports_to: u.reports_to ?? null,
        }));
    } else {
      domainPeopleLabel = 'เจ้าหน้าที่ในสายบังคับบัญชา';
      domainPeople = profiles
        .filter(
          (u) =>
            normalizeRole(u.role) === 'staff' &&
            u.reports_to === profile.id &&
            !u.disabled
        )
        .map((u) => ({
          id: u.id,
          full_name: u.full_name,
          role: normalizeRole(u.role),
          schoolIds: schoolsInScope(u, schools).map((s) => String(s.school_id)),
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
      staffName={profile?.full_name ?? undefined}
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
