import Link from 'next/link';
import { getSessionProfile, listMockAccountsForAdmin } from '@/lib/auth/session';
import { OrgMapClient } from '@/components/admin/OrgMapClient';
import { redirect } from 'next/navigation';
import { isAdminRole } from '@/lib/auth/scope';
import { normalizeRole } from '@/lib/types';
import { fetchSchools } from '@/lib/supabase/schools';

export const dynamic = 'force-dynamic';

export default async function AdminOrgMapPage() {
  const { profile, isAuthenticated } = await getSessionProfile();
  if (!isAuthenticated || !profile || !isAdminRole(normalizeRole(profile.role))) {
    redirect('/login?next=/admin/org-map');
  }

  const [accounts, schools] = await Promise.all([
    listMockAccountsForAdmin(),
    fetchSchools().catch(() => []),
  ]);
  const fieldAccounts = accounts.filter((a) =>
    ['staff', 'overseer', 'volunteer', 'super_overseer'].includes(a.role)
  );

  return (
    <div className="page-shell py-6">
      <div className="mb-4">
        <Link href="/admin/domain" className="text-sm text-tm-blue underline">
          ← กลับไปมอบหมายพื้นที่จัดการ
        </Link>
      </div>
      <h1 className="ed-section-title mb-2">แผนผังสายบังคับบัญชา</h1>
      <p className="text-slate-600 mb-4 text-sm">
        ภาพรวมสายงาน (ดูอย่างเดียว) — ท่านประธาน → องคมนตรี → สาขาอาสาสมัคร /
        ศึกษานิเทศก์ ตามจังหวัดที่ซ้อนทับ · มอบหมายพื้นที่ที่หน้ามอบหมายพื้นที่จัดการ
      </p>
      <OrgMapClient accounts={fieldAccounts} schools={schools} />
    </div>
  );
}
