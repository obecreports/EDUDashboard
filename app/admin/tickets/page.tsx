import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/auth/scope';
import { normalizeRole } from '@/lib/types';
import { listAllTickets } from '@/lib/auth/ticket-store';
import { AdminTicketsClient } from '@/components/admin/AdminTicketsClient';

export const dynamic = 'force-dynamic';

export default async function AdminTicketsPage() {
  const { profile, isAuthenticated } = await getSessionProfile();
  if (!isAuthenticated || !profile || !isAdminRole(normalizeRole(profile.role))) {
    redirect('/login?next=/admin/tickets');
  }

  const tickets = await listAllTickets();

  return (
    <div className="page-shell py-6">
      <h1 className="ed-section-title mb-2">จัดการคำขอแก้ไขข้อมูล</h1>
      <p className="text-sm text-slate-600 mb-4">
        ดูคำขอรอดำเนินการและคำขอที่เสร็จสิ้น / ถูกปฏิเสธ ในหน้าเดียว
      </p>
      <AdminTicketsClient tickets={tickets} />
    </div>
  );
}
