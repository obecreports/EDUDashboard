import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { isFieldRole, isAdminRole } from '@/lib/auth/scope';
import { normalizeRole, PAGE_BANNERS } from '@/lib/types';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { PageBanner } from '@/components/layout/PageBanner';
import { ScholarshipStudentsClient } from '@/components/scholarship/ScholarshipStudentsClient';
import { listScholarshipStudents } from '@/lib/mock/scholarship-students';
import { readContentAccessMapStored } from '@/lib/auth/user-store';
import { canAccess } from '@/lib/auth/content-access';

export const dynamic = 'force-dynamic';

async function Body() {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  const r = normalizeRole(role);
  if (!isAuthenticated || !profile || (!isFieldRole(r) && !isAdminRole(r))) {
    redirect('/login?next=/scholarship-students');
  }

  const acl = await readContentAccessMapStored();
  if (!canAccess(r, 'scholarship_students', 'view', acl)) {
    redirect('/dashboard');
  }

  const students = listScholarshipStudents();
  const canModify = canAccess(r, 'scholarship_students', 'modify', acl);

  return (
    <>
      <PageBanner
        src={PAGE_BANNERS.schools}
        title="นักเรียนทุน"
        subtitle="รายชื่อนักเรียนทุนในโครงการ (ข้อมูลจำลอง)"
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
