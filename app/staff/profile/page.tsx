import { Suspense } from 'react';
import { getSessionProfile, listMockAccountsForAdmin } from '@/lib/auth/session';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { normalizeRole } from '@/lib/types';
import { ProfileSettingsClient } from '@/components/staff/ProfileSettingsClient';
import { fetchGovDomains } from '@/lib/supabase/schools';

export const dynamic = 'force-dynamic';

async function ProfileBody() {
  const { profile, isAuthenticated } = await getSessionProfile();
  const [accounts, govRows] = await Promise.all([
    isAuthenticated ? listMockAccountsForAdmin() : Promise.resolve([]),
    fetchGovDomains().catch(() => []),
  ]);
  const boss = profile?.reports_to
    ? accounts.find((a) => a.id === profile.reports_to)
    : null;
  const role = normalizeRole(profile?.role);

  const areaNameById = new Map(
    govRows
      .filter((g) => g.area_id != null)
      .map((g) => [String(g.area_id), String(g.area_name || g.area_id)])
  );

  const domainLines: string[] = [];
  if (role === 'overseer' || role === 'volunteer') {
    domainLines.push(`จังหวัด: ${(profile?.assigned_provinces ?? []).join(', ') || '—'}`);
  } else if (role === 'staff') {
    const areas = profile?.assigned_districts ?? [];
    const labels = areas.map((d) => {
      const id = String(d).trim();
      if (!id) return '';
      return areaNameById.get(id) || id.replace('|', ' / ');
    }).filter(Boolean);
    domainLines.push(`เขตพื้นที่การศึกษา: ${labels.join(', ') || '—'}`);
  } else if (role === 'super_overseer' || role === 'admin' || role === 'super_admin') {
    domainLines.push('ขอบเขต: ทั้งหมด / ตามสิทธิ์ระบบ');
  } else {
    domainLines.push('ขอบเขต: —');
  }

  if (!isAuthenticated || !profile) {
    return (
      <div className="page-shell" style={{ maxWidth: 640 }}>
        <h1 className="section-heading">ตั้งค่าโปรไฟล์</h1>
        <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
          กรุณาเข้าสู่ระบบเพื่อดูโปรไฟล์
        </p>
      </div>
    );
  }

  return (
    <div className="page-shell" style={{ maxWidth: 640 }}>
      <h1 className="section-heading">ตั้งค่าโปรไฟล์</h1>
      <ProfileSettingsClient
        fullName={profile.full_name ?? ''}
        namePrefix={profile.name_prefix ?? ''}
        position={profile.position ?? ''}
        email={profile.email ?? ''}
        role={role}
        domainLines={domainLines}
        bossName={boss?.full_name ?? ''}
      />
    </div>
  );
}

export default function StaffProfilePage() {
  return (
    <Suspense fallback={<PageSkeleton rows={5} />}>
      <ProfileBody />
    </Suspense>
  );
}
