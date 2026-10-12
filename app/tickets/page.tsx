import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { isAdminRole, isFieldRole } from '@/lib/auth/scope';
import { normalizeRole } from '@/lib/types';
import { listTicketsForUser } from '@/lib/auth/ticket-store';
import { TICKET_STATUS_LABEL } from '@/lib/auth/ticket-types';

export const dynamic = 'force-dynamic';

export default async function TicketsPage() {
  const { profile, isAuthenticated } = await getSessionProfile();
  const role = normalizeRole(profile?.role);
  if (!isAuthenticated || !profile) {
    redirect('/login?next=/tickets');
  }
  if (isAdminRole(role)) {
    redirect('/admin/tickets');
  }
  if (!isFieldRole(role)) {
    redirect('/login?next=/tickets');
  }

  const tickets = await listTicketsForUser(profile.id);

  return (
    <div className="page-shell py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="ed-section-title">คำขอแก้ไขข้อมูล</h1>
          <p className="text-sm text-slate-600">ส่งคำขอถึง Admin เพื่อขอแก้ไขข้อมูลโรงเรียน</p>
        </div>
        <Link href="/tickets/new" className="ed-btn ed-btn--primary">
          สร้างคำขอใหม่
        </Link>
      </div>

      <div className="grid gap-3">
        {tickets.length === 0 && (
          <div className="ed-card p-4 text-slate-500">ยังไม่มีคำขอ</div>
        )}
        {tickets.map((t) => (
          <article key={t.id} className="ed-card p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <strong className="text-tm-blue">{t.subject}</strong>
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100">
                {TICKET_STATUS_LABEL[t.status] ?? t.status}
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1">{t.school_name}</p>
            <p className="text-sm mt-2 whitespace-pre-wrap">{t.detail}</p>
            <p className="text-xs text-slate-400 mt-2">
              {t.requester_name} · {new Date(t.created_at).toLocaleString('th-TH')}
            </p>
            {t.status === 'rejected' && t.admin_note && (
              <p className="text-sm mt-2 p-2 rounded bg-rose-50 text-rose-900 border border-rose-100">
                เหตุผลที่ปฏิเสธ: {t.admin_note}
              </p>
            )}
            {t.status !== 'rejected' && t.admin_note && (
              <p className="text-sm mt-2 p-2 rounded bg-amber-50 text-amber-900">
                หมายเหตุ Admin: {t.admin_note}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
