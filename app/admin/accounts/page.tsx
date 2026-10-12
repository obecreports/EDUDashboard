import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSessionProfile, listMockAccountsForAdmin } from '@/lib/auth/session';
import { AdminAccountsManager } from '@/components/admin/AdminAccountsManager';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { isAdminRole } from '@/lib/auth/scope';
import { normalizeRole } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function AccountsBody() {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  const r = normalizeRole(role);
  if (!isAuthenticated || !profile || !isAdminRole(r)) {
    redirect('/login?next=/admin/accounts');
  }

  const accounts = await listMockAccountsForAdmin();

  return (
    <div className="page-shell space-y-4">
      <div>
        <h1 className="section-heading">จัดการบัญชี</h1>
        <p className="text-slate-500 mt-[-0.5rem]">
          กรองค้นหา · กดแก้ไขก่อนจัดการ · บันทึกข้อมูล / ปิดใช้งาน / สร้าง OTP
        </p>
      </div>
      <AdminAccountsManager
        accounts={accounts.map((a) => ({
          ...a,
          name_prefix: a.name_prefix ?? null,
        }))}
        actorRole={r}
        actorId={profile.id}
      />
    </div>
  );
}

export default function AdminAccountsPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <AccountsBody />
    </Suspense>
  );
}
