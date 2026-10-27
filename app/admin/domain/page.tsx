import { getSessionProfile, listMockAccountsForAdmin } from '@/lib/auth/session';
import { fetchGovDomains, fetchSchools } from '@/lib/supabase/schools';
import { DomainControlClient } from '@/components/admin/DomainControlClient';
import { redirect } from 'next/navigation';
import { isAdminRole } from '@/lib/auth/scope';
import { normalizeRole } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminDomainPage() {
  const { profile, isAuthenticated } = await getSessionProfile();
  if (!isAuthenticated || !profile || !isAdminRole(normalizeRole(profile.role))) {
    redirect('/login?next=/admin/domain');
  }

  const [accounts, schools, govRows] = await Promise.all([
    listMockAccountsForAdmin(),
    fetchSchools().catch(() => []),
    fetchGovDomains().catch(() => []),
  ]);

  const provinces = [
    ...new Set(schools.map((s) => s.province?.trim()).filter(Boolean) as string[]),
  ].sort((a, b) => a.localeCompare(b, 'th'));

  const areas = govRows
    .filter((g) => g.area_id != null)
    .map((g) => ({
      id: String(g.area_id),
      name: String(g.area_name || g.area_id),
      province: String(
        (g as { province_name?: string | null }).province_name || ''
      ).trim(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'th'));

  const fieldAccounts = accounts.filter((a) =>
    ['staff', 'overseer', 'volunteer', 'super_overseer'].includes(a.role)
  );

  return (
    <div className="page-shell py-6">
      <h1 className="ed-section-title mb-2">มอบหมายพื้นที่จัดการ</h1>
      <p className="text-slate-600 mb-4 text-sm">
        มอบหมายจังหวัดให้องคมนตรี / อาสาสมัคร (อาสาสมัครเลือกจังหวัดได้อิสระ
        — แดชบอร์ดองคมนตรีแสดงเฉพาะจังหวัดที่ซ้อนทับ) หรือเขตพื้นที่การศึกษา
        (Gov_Domain) ให้ศึกษานิเทศก์ — สายบังคับบัญชาละเอียดที่{' '}
        <a href="/admin/org-map" className="text-tm-blue underline">
          แผนผังสายบังคับบัญชา
        </a>
      </p>
      <DomainControlClient
        accounts={fieldAccounts}
        provinces={provinces}
        areas={areas}
      />
    </div>
  );
}
