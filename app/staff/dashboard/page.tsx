import { Suspense } from 'react';
import { fetchSchools } from '@/lib/supabase/schools';
import { getSessionProfile } from '@/lib/auth/session';
import { parseAreaIds } from '@/lib/auth/mock-users';
import { ManagedSchoolsClient } from '@/components/schools/ManagedSchoolsClient';
import { ManagedSchoolsSkeleton } from '@/components/ui/PageSkeleton';

export const dynamic = 'force-dynamic';

async function Body() {
  const [{ profile }, schools] = await Promise.all([
    getSessionProfile(),
    fetchSchools().catch(() => []),
  ]);
  const assigned = new Set(parseAreaIds(profile?.assigned_zone));
  const scoped =
    assigned.size > 0
      ? schools.filter((s) => assigned.has(String(s.area_id || '')))
      : schools;

  return (
    <ManagedSchoolsClient
      schools={scoped}
      mode="staff"
      staffName={profile?.full_name || 'อาสาสมัคร'}
    />
  );
}

export default function StaffDashboardPage() {
  return (
    <Suspense fallback={<ManagedSchoolsSkeleton />}>
      <Body />
    </Suspense>
  );
}
