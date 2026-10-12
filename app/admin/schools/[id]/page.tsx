import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/auth/scope';
import { normalizeRole } from '@/lib/types';
import { fetchGovDomains, fetchSchoolById } from '@/lib/supabase/schools';
import { fetchSchoolSwot } from '@/lib/supabase/school-swot';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { AdminSchoolEditClient } from '@/components/admin/AdminSchoolEditClient';

export const dynamic = 'force-dynamic';

async function Body({ id }: { id: string }) {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  const r = normalizeRole(role);
  if (!isAuthenticated || !profile || !isAdminRole(r)) {
    redirect(`/login?next=/admin/schools/${encodeURIComponent(id)}`);
  }

  const [school, swot, govRows] = await Promise.all([
    fetchSchoolById(id),
    fetchSchoolSwot(id),
    fetchGovDomains().catch(() => []),
  ]);

  if (!school) notFound();

  const areas = govRows
    .filter((g) => g.area_id != null)
    .map((g) => ({
      id: String(g.area_id),
      name: String(g.area_name || g.area_id),
    }));

  const coord = (v: unknown) =>
    v == null || v === '' ? '' : String(v);

  return (
    <div className="page-shell py-5" style={{ maxWidth: 880 }}>
      <AdminSchoolEditClient
        areas={areas}
        initial={{
          school_id: String(school.school_id),
          school_name: school.school_name_th || '',
          director_name: school.director_name || '',
          phone_number: school.phone || '',
          moo: school.moo != null ? String(school.moo) : '',
          village_name: school.village_name || '',
          subdistrict_name: school.subdistrict || '',
          district_name: school.district || '',
          province_name: school.province || '',
          zip_code: school.zipcode != null ? String(school.zipcode) : '',
          lat: coord(school.latitude),
          long: coord(school.longitude),
          area_id: school.area_id != null ? String(school.area_id) : '',
          cover_image_url: school.coverImageUrl?.trim() || '',
          swot,
        }}
      />
    </div>
  );
}

export default async function AdminSchoolEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageSkeleton rows={10} />}>
      <Body id={id} />
    </Suspense>
  );
}
