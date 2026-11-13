import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { isFieldRole, isAdminRole } from '@/lib/auth/scope';
import { normalizeRole, PAGE_BANNERS } from '@/lib/types';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { PageBanner } from '@/components/layout/PageBanner';
import { ContractTeachersClient } from '@/components/contract-teachers/ContractTeachersClient';
import { listContractTeachers } from '@/lib/mock/contract-teachers';
import { readContentAccessMapStored } from '@/lib/auth/user-store';
import { canAccess } from '@/lib/auth/content-access';

export const dynamic = 'force-dynamic';

async function Body() {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  const r = normalizeRole(role);
  if (!isAuthenticated || !profile || (!isFieldRole(r) && !isAdminRole(r))) {
    redirect('/login?next=/contract-teachers');
  }

  const acl = await readContentAccessMapStored();
  if (!canAccess(r, 'contract_teachers', 'view', acl)) {
    redirect('/dashboard');
  }

  const teachers = listContractTeachers();
  const canModify = canAccess(r, 'contract_teachers', 'modify', acl);

  return (
    <>
      <PageBanner
        src={PAGE_BANNERS.schools}
        title="ครูอัตรจ้าง"
        subtitle="รายชื่อครูอัตรจ้างในโครงการ (ข้อมูลจำลอง)"
      />
      <div className="page-shell py-6">
        <ContractTeachersClient teachers={teachers} canModify={canModify} />
      </div>
    </>
  );
}

export default function ContractTeachersPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <Body />
    </Suspense>
  );
}
