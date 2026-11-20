import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { isFieldRole, isAdminRole } from '@/lib/auth/scope';
import { normalizeRole, PAGE_BANNERS } from '@/lib/types';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { PageBanner } from '@/components/layout/PageBanner';
import { ScholarshipStudentDetailClient } from '@/components/scholarship/ScholarshipStudentDetailClient';
import { readContentAccessMapStored } from '@/lib/auth/user-store';
import { canAccess } from '@/lib/auth/content-access';
import {
  anyScholarshipFieldModifiable,
  editableFieldKeys,
  redactScholarshipStudent,
  visibleFieldKeys,
} from '@/lib/scholarship/access';
import { fetchScholarshipStudentById } from '@/lib/supabase/scholarship-students';

export const dynamic = 'force-dynamic';

async function Body({ id }: { id: string }) {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  const r = normalizeRole(role);
  if (!isAuthenticated || !profile || (!isFieldRole(r) && !isAdminRole(r))) {
    redirect(`/login?next=/scholarship-students/${id}`);
  }

  const acl = await readContentAccessMapStored();
  if (!canAccess(r, 'scholarship_students', 'view', acl)) {
    redirect('/dashboard');
  }

  const raw = await fetchScholarshipStudentById(id);
  if (!raw) notFound();

  const student = redactScholarshipStudent(raw, r, acl);
  const visibleKeys = visibleFieldKeys(r, acl);
  const editableKeys = editableFieldKeys(r, acl);
  const canEdit = anyScholarshipFieldModifiable(r, acl);
  const name = [student.name_prefix, student.full_name].filter(Boolean).join(' ');

  return (
    <>
      <PageBanner
        src={PAGE_BANNERS.schools}
        title={name}
        subtitle="โปรไฟล์นักเรียนทุนรายบุคคล"
      />
      <div className="page-shell py-6" style={{ maxWidth: 1100 }}>
        <ScholarshipStudentDetailClient
          student={student}
          visibleKeys={visibleKeys}
          editableKeys={editableKeys}
          canEdit={canEdit}
        />
      </div>
    </>
  );
}

export default async function ScholarshipStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <Body id={id} />
    </Suspense>
  );
}
