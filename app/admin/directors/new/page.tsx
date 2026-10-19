import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionProfile } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/auth/scope';
import { normalizeRole } from '@/lib/types';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { AdminDirectorFormClient } from '@/components/admin/AdminDirectorFormClient';

export const dynamic = 'force-dynamic';

async function Body() {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  if (!isAuthenticated || !profile || !isAdminRole(normalizeRole(role))) {
    redirect('/login?next=/admin/directors/new');
  }

  return (
    <div className="page-shell space-y-4 py-5" style={{ maxWidth: 640 }}>
      <div>
        <p className="text-sm m-0 mb-1">
          <Link href="/admin/directors" className="text-tm-blue underline">
            ← แก้ไขข้อมูลผู้อำนวยการ
          </Link>
        </p>
        <h1 className="section-heading">สร้างผู้อำนวยการใหม่</h1>
      </div>
      <AdminDirectorFormClient mode="create" />
    </div>
  );
}

export default function AdminDirectorNewPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <Body />
    </Suspense>
  );
}
