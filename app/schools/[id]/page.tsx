import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { fetchSchoolById } from '@/lib/supabase/schools';
import { getSessionProfile } from '@/lib/auth/session';
import {
  readCalendarEvents,
  readSchoolExtras,
  readStoredUsers,
} from '@/lib/auth/user-store';
import { fetchSchoolComments, fetchSchoolSwot, swotHasContent } from '@/lib/supabase/school-swot';
import { normalizeSchoolSwot } from '@/lib/swot/schema';
import { SchoolDetailClient } from '@/components/schools/SchoolDetailClient';
import { SchoolDetailSkeleton } from '@/components/ui/PageSkeleton';
import { canAccessSchoolDetail, canComment } from '@/lib/auth/scope';
import {
  parseT2ViewType1Cookie,
  T2_VIEW_TYPE1S_COOKIE,
} from '@/lib/auth/province-radar';
import {
  fetchPillarScoreBySchoolId,
  indicatorScoresFromRow,
} from '@/lib/supabase/school-pillars';
import { fetchSiteVisitsForSchool } from '@/lib/supabase/site-visits';
import {
  formatPersonLabel,
  isOverseerType2,
  normalizeRole,
} from '@/lib/types';

export const revalidate = 60;

async function SchoolDetailBody({ id }: { id: string }) {
  const [school, { profile, isAuthenticated }] = await Promise.all([
    fetchSchoolById(id),
    getSessionProfile(),
  ]);

  if (!school) notFound();

  const usersForScope = await readStoredUsers().catch(() => []);
  const directory = usersForScope.map((u) => ({
    id: u.id,
    role: u.role,
    overseer_tier: u.overseer_tier ?? null,
    assigned_provinces: u.assigned_provinces,
    assigned_districts: u.assigned_districts,
    reports_to: u.reports_to,
  }));
  const jar = await cookies();
  const isT2 =
    Boolean(profile) &&
    isOverseerType2(normalizeRole(profile!.role), profile!.overseer_tier);
  const readableOpts = isT2
    ? {
        selectedType1Ids: parseT2ViewType1Cookie(
          jar.get(T2_VIEW_TYPE1S_COOKIE)?.value
        ),
      }
    : {};
  const fullAccess = canAccessSchoolDetail(
    profile,
    school,
    isAuthenticated,
    directory,
    readableOpts
  );
  const commentsAllowed = canComment(
    profile,
    school,
    isAuthenticated,
    directory,
    readableOpts
  );
  const canEdit = false;

  const cookieExtras = await readSchoolExtras(school.school_id);

  const [dbSwot, dbComments, pillarRow, dbVisits, cookieVisits, users] = await Promise.all([
    fetchSchoolSwot(school.school_id),
    commentsAllowed ? fetchSchoolComments(school.school_id) : Promise.resolve([]),
    fullAccess ? fetchPillarScoreBySchoolId(school.school_id) : Promise.resolve(null),
    fullAccess ? fetchSiteVisitsForSchool(school.school_id) : Promise.resolve([]),
    fullAccess ? readCalendarEvents() : Promise.resolve([]),
    fullAccess ? Promise.resolve(usersForScope) : Promise.resolve([]),
  ]);

  const initialSwot = swotHasContent(dbSwot)
    ? dbSwot
    : normalizeSchoolSwot(cookieExtras.swot);

  const userName = new Map(
    users.map((u) => [
      u.id,
      formatPersonLabel(u.role, u.name_prefix, u.full_name) ||
        u.full_name ||
        u.email ||
        u.id,
    ])
  );

  const cookieForSchool = cookieVisits
    .filter((e) => String(e.school_id) === String(school.school_id))
    .map((e) => ({
      id: e.id,
      date: e.date,
      activity: String(e.activity),
      status_th: e.status_th ?? null,
      notes: e.notes ?? '',
      staff_name: userName.get(e.staff_id) ?? null,
    }));

  const dbVisitMapped = dbVisits.map((e) => ({
    id: e.id,
    date: e.date,
    activity: String(e.activity),
    status_th: e.status_th ?? null,
    notes: e.notes ?? '',
    staff_name: e.staff_id ? userName.get(e.staff_id) ?? null : null,
  }));

  const visitById = new Map<string, (typeof dbVisitMapped)[number]>();
  for (const v of [...cookieForSchool, ...dbVisitMapped]) {
    visitById.set(v.id, v);
  }
  const visitHistory = [...visitById.values()].sort((a, b) => b.date.localeCompare(a.date));

  const pillarIndicators = fullAccess
    ? indicatorScoresFromRow(pillarRow, school.labelLookup)
    : undefined;

  return (
    <div className="page-shell school-detail-shell">
      <SchoolDetailClient
        school={school}
        canEdit={canEdit}
        canViewComments={commentsAllowed}
        canComment={commentsAllowed}
        showScores={fullAccess}
        guestView={!fullAccess}
        initialComments={
          commentsAllowed
            ? dbComments.length
              ? dbComments
              : cookieExtras.comments
            : []
        }
        initialSwot={initialSwot}
        initialAchievements={cookieExtras.achievements}
        visitHistory={visitHistory}
        pillarIndicators={pillarIndicators}
      />
    </div>
  );
}

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<SchoolDetailSkeleton />}>
      <SchoolDetailBody id={id} />
    </Suspense>
  );
}
