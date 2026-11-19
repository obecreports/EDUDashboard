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
import { isDbOnlyMode } from '@/lib/auth/db-mode';
import {
  EMPTY_ACHIEVEMENTS,
  fetchSchoolAchievements,
  fetchSchoolComments,
  fetchSchoolSwot,
  swotHasContent,
} from '@/lib/supabase/school-swot';
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
import { scholarshipStudentsBySchool } from '@/lib/mock/scholarship-students';
import { contractTeachersBySchool } from '@/lib/mock/contract-teachers';
import { MOCK_USER_SEEDS } from '@/lib/auth/mock-users';
import {
  canAccess,
  canAccessSection,
  mergeContentAccess,
} from '@/lib/auth/content-access';
import { readContentAccessMapStored } from '@/lib/auth/user-store';

export const revalidate = 60;

async function SchoolDetailBody({ id }: { id: string }) {
  const [school, { profile, isAuthenticated }, contentAccessRaw] =
    await Promise.all([
      fetchSchoolById(id),
      getSessionProfile(),
      readContentAccessMapStored().catch(() => null),
    ]);

  if (!school) notFound();

  const contentAccess = mergeContentAccess(contentAccessRaw);
  const viewerRole = normalizeRole(profile?.role);
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
  const scopeAccess = canAccessSchoolDetail(
    profile,
    school,
    isAuthenticated,
    directory,
    readableOpts
  );
  const aclPageOk = canAccess(
    viewerRole,
    'school_detail',
    'view',
    contentAccess
  );
  const fullAccess = scopeAccess && aclPageOk;
  const allowScholarshipTab = canAccessSection(
    viewerRole,
    'school_detail',
    'school_tab_scholarship',
    'view',
    contentAccess
  );
  const allowContractTab = canAccessSection(
    viewerRole,
    'school_detail',
    'school_tab_contract_teachers',
    'view',
    contentAccess
  );
  const allowCalendarTab =
    canAccessSection(
      viewerRole,
      'school_detail',
      'school_tab_calendar',
      'view',
      contentAccess
    ) ||
    canAccessSection(
      viewerRole,
      'school_detail',
      'school_tab_visits',
      'view',
      contentAccess
    );
  const allowScoresTab =
    canAccessSection(
      viewerRole,
      'school_detail',
      'school_tab_scores',
      'view',
      contentAccess
    ) ||
    canAccessSection(
      viewerRole,
      'school_detail',
      'school_tab_pillars',
      'view',
      contentAccess
    );
  const commentsAllowed = canComment(
    profile,
    school,
    isAuthenticated,
    directory,
    readableOpts
  );
  const canEdit = false;

  const dbOnly = isDbOnlyMode();
  const cookieExtras = dbOnly
    ? null
    : await readSchoolExtras(school.school_id);

  const loadScores = fullAccess && allowScoresTab;
  const loadVisits = fullAccess && allowCalendarTab;
  const [dbSwot, dbComments, dbAchievements, pillarRow, dbVisits, cookieVisits, users] =
    await Promise.all([
      fetchSchoolSwot(school.school_id),
      commentsAllowed ? fetchSchoolComments(school.school_id) : Promise.resolve([]),
      fetchSchoolAchievements(school.school_id),
      loadScores ? fetchPillarScoreBySchoolId(school.school_id) : Promise.resolve(null),
      loadVisits ? fetchSiteVisitsForSchool(school.school_id) : Promise.resolve([]),
      loadVisits && !dbOnly ? readCalendarEvents() : Promise.resolve([]),
      loadVisits ? Promise.resolve(usersForScope) : Promise.resolve([]),
    ]);

  const initialSwot =
    dbOnly || swotHasContent(dbSwot)
      ? dbSwot
      : normalizeSchoolSwot(cookieExtras?.swot);

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
  for (const v of [...(dbOnly ? [] : cookieForSchool), ...dbVisitMapped]) {
    visitById.set(v.id, v);
  }
  const visitHistory = [...visitById.values()].sort((a, b) => b.date.localeCompare(a.date));

  const pillarIndicators = loadScores
    ? indicatorScoresFromRow(pillarRow, school.labelLookup)
    : undefined;

  const scholarshipRows = allowScholarshipTab
    ? scholarshipStudentsBySchool(school.school_id).map((s) => ({
        id: s.id,
        name: [s.name_prefix, s.full_name].filter(Boolean).join(' '),
        grade_level: s.grade_level,
        scholarship_type: s.scholarship_type,
        status: s.status,
        average_gpa: s.average_gpa ?? s.gpa ?? null,
        educational_risk: s.educational_risk ?? null,
        behavioral_risk: s.behavioral_risk ?? null,
      }))
    : [];
  const contractTeacherRows = allowContractTab
    ? contractTeachersBySchool(school.school_id).map((t) => ({
        id: t.id,
        name: [t.name_prefix, t.full_name].filter(Boolean).join(' '),
        subject: t.subject,
        contract_type: t.contract_type,
        status: t.status,
      }))
    : [];

  const province = school.province?.trim() ?? '';
  const overseerNames = MOCK_USER_SEEDS.filter(
    (u) =>
      u.role === 'overseer' &&
      province.length > 0 &&
      u.assigned_provinces.some((p) => p.trim() === province)
  ).map((u) => [u.name_prefix, u.full_name].filter(Boolean).join(' '));

  return (
    <div className="page-shell school-detail-shell">
      <SchoolDetailClient
        school={school}
        canEdit={canEdit}
        canViewComments={commentsAllowed}
        canComment={commentsAllowed}
        showScores={loadScores}
        guestView={!scopeAccess}
        viewerRole={viewerRole}
        contentAccess={contentAccess}
        overseerNames={overseerNames}
        initialComments={
          commentsAllowed
            ? dbOnly || dbComments.length
              ? dbComments
              : cookieExtras?.comments ?? []
            : []
        }
        initialSwot={initialSwot}
        initialAchievements={
          dbOnly
            ? dbAchievements
            : dbAchievements.school || dbAchievements.student
              ? dbAchievements
              : cookieExtras?.achievements ?? EMPTY_ACHIEVEMENTS
        }
        visitHistory={visitHistory}
        pillarIndicators={pillarIndicators}
        scholarshipStudents={scholarshipRows}
        contractTeachers={contractTeacherRows}
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
