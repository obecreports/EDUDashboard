import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { isFieldRole, isAdminRole } from '@/lib/auth/scope';
import { normalizeRole, PAGE_BANNERS } from '@/lib/types';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { PageBanner } from '@/components/layout/PageBanner';
import { ContractTeacherDetailClient } from '@/components/contract-teachers/ContractTeacherDetailClient';
import { getContractTeacher } from '@/lib/mock/contract-teachers';
import { readContentAccessMapStored } from '@/lib/auth/user-store';
import { canAccess } from '@/lib/auth/content-access';

export const dynamic = 'force-dynamic';

async function Body({ id }: { id: string }) {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  const r = normalizeRole(role);
  if (!isAuthenticated || !profile || (!isFieldRole(r) && !isAdminRole(r))) {
    redirect(`/login?next=/contract-teachers/${id}`);
  }

  const acl = await readContentAccessMapStored();
  if (!canAccess(r, 'contract_teachers', 'view', acl)) {
    redirect('/dashboard');
  }

  const teacher = getContractTeacher(id);
  if (!teacher) notFound();

  const canModify = canAccess(r, 'contract_teachers', 'modify', acl);
  const name = [teacher.name_prefix, teacher.full_name].filter(Boolean).join(' ');

  return (
    <>
      <PageBanner
        src={PAGE_BANNERS.schools}
        title={name}
        subtitle="รายละเอียดครูอัตรจ้าง"
      />
      <div className="page-shell py-6" style={{ maxWidth: 880 }}>
        <ContractTeacherDetailClient teacher={teacher} canModify={canModify} />
      </div>
    </>
  );
}

export default async function ContractTeacherDetailPage({
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
