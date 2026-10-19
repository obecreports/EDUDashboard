import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionProfile } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/auth/scope';
import {
  DIRECTOR_TBA_LABEL,
  directorDisplayLabel,
  normalizeRole,
} from '@/lib/types';
import { fetchSchools } from '@/lib/supabase/schools';
import { listDirectors } from '@/lib/supabase/directors';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { AdminDirectorAssignClient } from '@/components/admin/AdminDirectorAssignClient';

export const dynamic = 'force-dynamic';

async function Body({
  schoolParam,
  directorParam,
}: {
  schoolParam: string;
  directorParam: string;
}) {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  if (!isAuthenticated || !profile || !isAdminRole(normalizeRole(role))) {
    redirect('/login?next=/admin/directors/assign');
  }

  const [schools, directors] = await Promise.all([
    fetchSchools().catch(() => []),
    listDirectors().catch(() => []),
  ]);

  const rows = schools
    .map((s) => ({
      id: String(s.school_id),
      name: s.school_name_th || String(s.school_id),
      province: s.province || '',
      district: s.district || '',
      director_id: s.director_id ?? null,
      director_label: directorDisplayLabel(s),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'th'));

  return (
    <div className="page-shell space-y-4 py-5" style={{ maxWidth: 880 }}>
      <div>
        <p className="text-sm m-0 mb-1">
          <Link href="/admin/directors" className="text-tm-blue underline">
            ← แก้ไขข้อมูลผู้อำนวยการ
          </Link>
        </p>
        <h1 className="section-heading">มอบหมายผู้อำนวยการให้โรงเรียน</h1>
        <p className="text-slate-500 mt-[-0.5rem]">
          โรงเรียนหนึ่งมีผู้อำนวยการได้ครั้งละ 1 คน · ยังไม่ระบุ = {DIRECTOR_TBA_LABEL}
        </p>
      </div>
      <AdminDirectorAssignClient
        schools={rows}
        directors={directors}
        initialSchoolId={schoolParam}
        initialDirectorId={directorParam}
      />
    </div>
  );
}

export default async function AdminDirectorAssignPage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string; director?: string }>;
}) {
  const sp = await searchParams;
  return (
    <Suspense fallback={<PageSkeleton rows={10} />}>
      <Body
        schoolParam={String(sp.school || '').trim()}
        directorParam={String(sp.director || '').trim()}
      />
    </Suspense>
  );
}
