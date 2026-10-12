import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getSessionProfile } from '@/lib/auth/session';
import { fetchSchools } from '@/lib/supabase/schools';
import { isFieldRole, schoolsInScope } from '@/lib/auth/scope';
import { normalizeRole, ROLE_LABELS } from '@/lib/types';
import { StaffDashboardClient } from '@/components/dashboard/StaffDashboardClient';
import { ManagedSchoolsSkeleton } from '@/components/ui/PageSkeleton';

export const dynamic = 'force-dynamic';

async function DashboardBody() {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  const r = normalizeRole(role);
  if (!isAuthenticated || !profile || !isFieldRole(r)) {
    redirect('/login?next=/dashboard');
  }

  const all = await fetchSchools().catch(() => []);
  const scoped = schoolsInScope(profile, all);

  return (
    <StaffDashboardClient
      schools={scoped}
      nationalSchools={all}
      roleLabel={ROLE_LABELS[r]}
      staffName={profile.full_name ?? undefined}
      birthday={profile.birthday}
      namePrefix={profile.name_prefix}
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
