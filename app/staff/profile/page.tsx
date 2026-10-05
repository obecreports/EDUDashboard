import { Suspense } from 'react';
import { getSessionProfile } from '@/lib/auth/session';
import { fetchGovDomains } from '@/lib/supabase/schools';
import { ZoneBasket } from '@/components/profile/ZoneBasket';
import { parseAreaIds } from '@/lib/auth/mock-users';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

export const dynamic = 'force-dynamic';

async function ProfileBody() {
  const { profile, isAuthenticated } = await getSessionProfile();

  let areaOptions: { area_id: string; area_name: string }[] = [];
  try {
    const areas = await fetchGovDomains();
    areaOptions = (areas ?? []).map((a: { area_id: string; area_name: string }) => ({
      area_id: String(a.area_id),
      area_name: a.area_name || String(a.area_id),
    }));
  } catch {
    areaOptions = [];
  }

  // Keep any already-assigned area_ids even if missing from Gov_Domain
  const assigned = parseAreaIds(profile?.assigned_zone);
  const known = new Set(areaOptions.map((a) => a.area_id));
  assigned.forEach((id) => {
    if (!known.has(id)) areaOptions.push({ area_id: id, area_name: id });
  });
  areaOptions.sort((a, b) => a.area_name.localeCompare(b.area_name, 'th'));

  return (
    <div className="page-shell" style={{ maxWidth: 640 }}>
      <h1 className="section-heading">ตั้งค่าโปรไฟล์</h1>
      <div className="panel-card space-y-4">
        <label className="block text-sm">
          ชื่อ–นามสกุล
          <input className="form-input" defaultValue={profile?.full_name ?? ''} readOnly />
        </label>
        <label className="block text-sm">
          ตำแหน่ง
          <input className="form-input" defaultValue={profile?.position ?? ''} readOnly />
        </label>
        <label className="block text-sm">
          อีเมล
          <input className="form-input" defaultValue={profile?.email ?? ''} readOnly />
        </label>

        {isAuthenticated ? (
          <ZoneBasket initialZones={profile?.assigned_zone ?? null} options={areaOptions} />
        ) : (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
            กรุณาเข้าสู่ระบบเพื่อดูโปรไฟล์
          </p>
        )}
      </div>
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
