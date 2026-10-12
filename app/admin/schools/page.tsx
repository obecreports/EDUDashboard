import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/auth/scope';
import { normalizeRole } from '@/lib/types';
import { fetchSchools } from '@/lib/supabase/schools';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { AdminSchoolsListClient } from '@/components/admin/AdminSchoolsListClient';

export const dynamic = 'force-dynamic';

async function Body() {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  const r = normalizeRole(role);
  if (!isAuthenticated || !profile || !isAdminRole(r)) {
    redirect('/login?next=/admin/schools');
  }

  const schools = await fetchSchools().catch(() => []);
  const rows = schools
    .map((s) => ({
      id: String(s.school_id),
      name: s.school_name_th || String(s.school_id),
      province: s.province || '',
      district: s.district || '',
      area_name: s.area_name || s.Gov_Domain?.area_name || '',
      phone: s.phone || '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'th'));

  return (
    <div className="page-shell space-y-4 py-5">
      <div>
        <h1 className="section-heading">แก้ไขข้อมูลโรงเรียน</h1>
        <p className="text-slate-500 mt-[-0.5rem]">
          แก้ไขชื่อ · ผอ. · โทร · ที่อยู่รายคอลัมน์ · พิกัด · เขตพื้นที่ · SWOT
        </p>
      </div>
      <AdminSchoolsListClient schools={rows} />
    </div>
  );
}

export default function AdminSchoolsPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <Body />
    </Suspense>
  );
}
