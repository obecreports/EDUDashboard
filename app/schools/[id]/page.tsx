import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { fetchSchoolById } from '@/lib/supabase/schools';
import { getSessionProfile } from '@/lib/auth/session';
import { parseAreaIds } from '@/lib/auth/mock-users';
import { readSchoolExtras } from '@/lib/auth/user-store';
import { fetchSchoolComments, fetchSchoolSwot, swotHasContent } from '@/lib/supabase/school-swot';
import { normalizeSchoolSwot } from '@/lib/swot/schema';
import { SchoolDetailClient } from '@/components/schools/SchoolDetailClient';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

export const dynamic = 'force-dynamic';

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
  const dbSwot = await fetchSchoolSwot(school.school_id);
  const dbComments = canViewComments
    ? await fetchSchoolComments(school.school_id)
    : [];

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
    <Suspense fallback={<PageSkeleton rows={10} />}>
      <SchoolDetailBody id={params.id} />
    </Suspense>
  );
}
