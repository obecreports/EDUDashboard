import { getSessionProfile, listMockAccountsForAdmin } from '@/lib/auth/session';
import { OrgMapClient } from '@/components/admin/OrgMapClient';
import { redirect } from 'next/navigation';
import { isAdminRole } from '@/lib/auth/scope';
import { normalizeRole } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminOrgMapPage() {
  const { profile, isAuthenticated } = await getSessionProfile();
  if (!isAuthenticated || !profile || !isAdminRole(normalizeRole(profile.role))) {
    redirect('/login?next=/admin/org-map');
  }

  const accounts = await listMockAccountsForAdmin();
  const fieldAccounts = accounts.filter((a) =>
    ['staff', 'overseer', 'volunteer', 'super_overseer'].includes(a.role)
  );

  return (
    <div className="page-shell py-6">
      <h1 className="ed-section-title mb-2">แผนผังสายบังคับบัญชา</h1>
      <p className="text-slate-600 mb-4 text-sm">
        Staff → Overseer · Type 2 → Type 1 · Type 1 → Super Overseer — มอบหมายจังหวัดที่หน้า
        มอบหมายพื้นที่จัดการ
      </p>
      <OrgMapClient accounts={fieldAccounts} />
    </div>
  );
}
