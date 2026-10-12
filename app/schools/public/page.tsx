import { Suspense } from 'react';
import { fetchSchools } from '@/lib/supabase/schools';
import { ManagedSchoolsClient } from '@/components/schools/ManagedSchoolsClient';
import { ManagedSchoolsSkeleton } from '@/components/ui/PageSkeleton';

export const revalidate = 120;

async function PublicSchoolsBody() {
  const schools = await fetchSchools().catch(() => []);
  return (
    <ManagedSchoolsClient
      schools={schools}
      mode="guest"
      showScores={false}
      staffName={undefined}
    />
  );
}

/** Public catalog of all project schools (no scores) — used by guest nav and Explore */
export default function PublicSchoolsPage() {
  return (
    <Suspense fallback={<ManagedSchoolsSkeleton />}>
      <PublicSchoolsBody />
    </Suspense>
  );
}
