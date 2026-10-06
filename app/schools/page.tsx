import { Suspense } from 'react';
import { fetchSchools } from '@/lib/supabase/schools';
import { ManagedSchoolsClient } from '@/components/schools/ManagedSchoolsClient';
import { ManagedSchoolsSkeleton } from '@/components/ui/PageSkeleton';
import { getSessionProfile } from '@/lib/auth/session';

export const revalidate = 120;

async function SchoolsBody({ q }: { q?: string }) {
  const [{ role, profile }, schools] = await Promise.all([
    getSessionProfile(),
    fetchSchools().catch(() => []),
  ]);
  const mode = role === 'staff' ? 'staff' : 'guest';

  return (
    <ManagedSchoolsClient
      schools={schools}
      mode={mode}
      staffName={profile?.full_name ?? undefined}
      initialQuery={q ?? ''}
    />
  );
}

export default async function SchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  return (
    <Suspense fallback={<ManagedSchoolsSkeleton />}>
      <SchoolsBody q={sp.q} />
    </Suspense>
  );
}
