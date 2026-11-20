import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { isFieldRole, isAdminRole } from '@/lib/auth/scope';
import { formatPersonLabel, normalizeRole } from '@/lib/types';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { HomeHubClient } from '@/components/home/HomeHubClient';
import { fetchSchools } from '@/lib/supabase/schools';
import { readStoredUsers } from '@/lib/auth/user-store';
import { listScholarshipStudents } from '@/lib/mock/scholarship-students';
import { getDomainBudgetSummary } from '@/lib/mock/domain-budget';
import {
  buildDomainPanel,
  filterSchoolsInDomain,
  listVolunteersInDomain,
} from '@/lib/volunteers/directory';

export const dynamic = 'force-dynamic';

async function HomeBody() {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  const r = normalizeRole(role);

  if (!isAuthenticated || !profile || profile.id === 'guest') {
    redirect('/login?next=/home');
  }
  if (isAdminRole(r)) {
    redirect('/admin/accounts');
  }
  if (!isFieldRole(r)) {
    redirect('/login?next=/home');
  }

  const [schools, users] = await Promise.all([
    fetchSchools().catch(() => []),
    readStoredUsers().catch(() => []),
  ]);

  const scopedSchools = filterSchoolsInDomain(schools, profile, users);
  const scopedIds = new Set(scopedSchools.map((s) => String(s.school_id)));
  const scholarshipCount = listScholarshipStudents().filter((s) =>
    scopedIds.has(String(s.school_id))
  ).length;

  const showVlCount =
    r === 'super_overseer' || r === 'overseer' || r === 'covert_overseer';
  const volunteers = listVolunteersInDomain(profile, users, scopedSchools);
  const budget = getDomainBudgetSummary(profile.id);
  const domain = buildDomainPanel(profile, scopedSchools);

  const displayName =
    formatPersonLabel(profile.role, profile.name_prefix, profile.full_name) ||
    profile.full_name ||
    profile.email ||
    'ผู้ใช้';

  return (
    <HomeHubClient
      userId={profile.id}
      displayName={displayName}
      role={r}
      overseerTier={profile.overseer_tier ?? null}
      avatarUrl={profile.avatar_url}
      stats={{
        schoolCount: scopedSchools.length,
        scholarshipCount,
        volunteerCount: showVlCount ? volunteers.length : null,
        budgetProjects: budget.projectCount,
        budgetTotal: budget.totalCost,
      }}
      domain={domain}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <HomeBody />
    </Suspense>
  );
}
