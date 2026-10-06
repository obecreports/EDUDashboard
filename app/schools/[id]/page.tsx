import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { fetchSchoolById } from '@/lib/supabase/schools';
import { getSessionProfile } from '@/lib/auth/session';
import { parseAreaIds } from '@/lib/auth/mock-users';
import { readSchoolExtras } from '@/lib/auth/user-store';
import { fetchSchoolComments, fetchSchoolSwot, swotHasContent } from '@/lib/supabase/school-swot';
import { normalizeSchoolSwot } from '@/lib/swot/schema';
import { SchoolDetailClient } from '@/components/schools/SchoolDetailClient';
import { SchoolDetailSkeleton } from '@/components/ui/PageSkeleton';

export const revalidate = 60;

async function SchoolDetailBody({ id }: { id: string }) {
  const [school, { profile, role, isAuthenticated }] = await Promise.all([
    fetchSchoolById(id),
    getSessionProfile(),
  ]);

  if (!school) notFound();

  const assigned = new Set(parseAreaIds(profile?.assigned_zone));
  const canEdit =
    isAuthenticated &&
    role === 'staff' &&
    assigned.size > 0 &&
    assigned.has(String(school.area_id || ''));

  const canViewComments =
    isAuthenticated && (role === 'staff' || role === 'overseer');
  const canComment = canViewComments;

  const cookieExtras = readSchoolExtras(school.school_id);

  // Parallelize secondary reads (was sequential → extra 1–2s)
  const [dbSwot, dbComments] = await Promise.all([
    fetchSchoolSwot(school.school_id),
    canViewComments ? fetchSchoolComments(school.school_id) : Promise.resolve([]),
  ]);

  const initialSwot = swotHasContent(dbSwot)
    ? dbSwot
    : normalizeSchoolSwot(cookieExtras.swot);

  return (
    <div className="page-shell" style={{ maxWidth: 1100 }}>
      <SchoolDetailClient
        school={school}
        canEdit={canEdit}
        canViewComments={canViewComments}
        canComment={canComment}
        initialComments={
          canViewComments
            ? dbComments.length
              ? dbComments
              : cookieExtras.comments
            : []
        }
        initialSwot={initialSwot}
        initialAchievements={cookieExtras.achievements}
      />
    </div>
  );
}

export default function SchoolDetailPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<SchoolDetailSkeleton />}>
      <SchoolDetailBody id={params.id} />
    </Suspense>
  );
}
