import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionProfile } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/auth/scope';
import { normalizeRole } from '@/lib/types';
import { fetchSchools } from '@/lib/supabase/schools';
import { listDirectors } from '@/lib/supabase/directors';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { AdminDirectorsListClient } from '@/components/admin/AdminDirectorsListClient';

export const dynamic = 'force-dynamic';

async function Body() {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  const r = normalizeRole(role);
  if (!isAuthenticated || !profile || !isAdminRole(r)) {
    redirect('/login?next=/admin/directors');
  }

  const [directors, schools] = await Promise.all([
    listDirectors().catch(() => []),
    fetchSchools().catch(() => []),
  ]);

  const countByDirector = new Map<string, number>();
  for (const s of schools) {
    const did = s.director_id?.trim();
    if (!did) continue;
    countByDirector.set(did, (countByDirector.get(did) ?? 0) + 1);
  }

  const rows = directors.map((d) => ({
    ...d,
    activeSchoolCount: countByDirector.get(d.director_id) ?? 0,
  }));

  return (
    <div className="page-shell space-y-4 py-5" style={{ maxWidth: 880 }}>
      <div>
        <h1 className="section-heading">แก้ไขข้อมูลผู้อำนวยการ</h1>
        <p className="text-slate-500 mt-[-0.5rem]">
          สร้าง / แก้ไขโปรไฟล์ผู้อำนวยการ · มอบหมายโรงเรียนที่หน้าแยก{' '}
          <Link href="/admin/directors/assign" className="text-tm-blue underline">
            มอบหมายโรงเรียน
          </Link>
        </p>
      </div>
      <AdminDirectorsListClient directors={rows} />
    </div>
  );
}

export default function AdminDirectorsPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={10} />}>
      <Body />
    </Suspense>
  );
}
