import { Suspense } from 'react';
import { listMockAccountsForAdmin } from '@/lib/auth/session';
import { AdminAccountsManager } from '@/components/admin/AdminAccountsManager';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

export const dynamic = 'force-dynamic';

async function AccountsBody() {
  const accounts = listMockAccountsForAdmin();

  return (
    <div className="page-shell space-y-4">
      <div>
        <h1 className="section-heading">จัดการบัญชี</h1>
        <p className="text-slate-500 mt-[-0.5rem]">
          สร้างผู้ใช้ · เปิด/ปิดบัญชี · ออก OTP ชั่วคราว · แก้ไขบทบาท
        </p>
      </div>
      <AdminAccountsManager accounts={accounts} />
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
