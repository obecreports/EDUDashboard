import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { ContentAccessClient } from '@/components/admin/ContentAccessClient';
import { getSessionProfile } from '@/lib/auth/session';
import { readContentAccessMapStored } from '@/lib/auth/user-store';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { isAdminRole } from '@/lib/auth/scope';
import { normalizeRole } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function Body() {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  if (!isAuthenticated || !profile || !isAdminRole(normalizeRole(role))) {
    redirect('/login');
  }

  const map = await readContentAccessMapStored();
  const actorRole = normalizeRole(role);

  return (
    <div className="page-shell space-y-6">
      <div>
        <h1 className="section-heading">สิทธิ์เข้าถึงเนื้อหา</h1>
        <p className="text-slate-500 mt-[-0.5rem]">
          จับคู่บทบาทกับระดับการเข้าถึงหน้า / รายละเอียด / การแก้ไข
        </p>
      </div>
      <ContentAccessClient initial={map} actorRole={actorRole} />
    </div>
  );
}

export default function AdminContentAccessPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <Body />
    </Suspense>
  );
}
