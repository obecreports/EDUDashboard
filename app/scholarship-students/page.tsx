import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { isFieldRole, isAdminRole } from '@/lib/auth/scope';
import { normalizeRole, PAGE_BANNERS } from '@/lib/types';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { PageBanner } from '@/components/layout/PageBanner';
import { ScholarshipStudentsClient } from '@/components/scholarship/ScholarshipStudentsClient';
import { readContentAccessMapStored, readStoredUsers } from '@/lib/auth/user-store';
import { canAccess } from '@/lib/auth/content-access';
import { fetchSchools } from '@/lib/supabase/schools';
import { filterSchoolsInDomain } from '@/lib/volunteers/directory';
import { fetchScholarshipStudents } from '@/lib/supabase/scholarship-students';
import { SCHOLARSHIP_OUTSIDE_PROJECT_PROVINCE } from '@/lib/scholarship/labels';

export const dynamic = 'force-dynamic';

async function Body() {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  const r = normalizeRole(role);
  if (!isAuthenticated || !profile || (!isFieldRole(r) && !isAdminRole(r))) {
    redirect('/login?next=/scholarship-students');
  }

  const acl = await readContentAccessMapStored();
  if (!canAccess(r, 'scholarship_students', 'view', acl)) {
    redirect('/home');
  }

  let students = await fetchScholarshipStudents();
  // Outside-project bucket only for full-project controllers + special_volunteer.
  const canSeeOutsideProject =
    isAdminRole(r) || r === 'super_overseer' || r === 'special_volunteer';

  if (isFieldRole(r) && !isAdminRole(r) && r !== 'super_overseer') {
    const [schools, users] = await Promise.all([
      fetchSchools().catch(() => []),
      readStoredUsers().catch(() => []),
    ]);
    const scopedIds = new Set(
      filterSchoolsInDomain(schools, profile, users).map((s) => String(s.school_id))
    );
    students = students.filter((s) => {
      const inDomain =
        Boolean(s.school_id) && scopedIds.has(String(s.school_id));
      if (inDomain) return true;
      if (
        canSeeOutsideProject &&
        s.province === SCHOLARSHIP_OUTSIDE_PROJECT_PROVINCE
      ) {
        return true;
      }
      return false;
    });
  } else if (!canSeeOutsideProject) {
    students = students.filter(
      (s) => s.province !== SCHOLARSHIP_OUTSIDE_PROJECT_PROVINCE
    );
  }
  const canModify = canAccess(r, 'scholarship_students', 'modify', acl);

  return (
    <>
      <PageBanner
        src={PAGE_BANNERS.schools}
        title="นักเรียนทุน"
        subtitle="รายชื่อนักเรียนทุนในโครงการ"
      />
      <div className="page-shell py-6">
        <ScholarshipStudentsClient students={students} canModify={canModify} />
      </div>
    </>
  );
}

export default function ScholarshipStudentsPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <Body />
    </Suspense>
  );
}
