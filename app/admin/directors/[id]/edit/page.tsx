import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionProfile } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/auth/scope';
import { formatDisplayName, normalizeRole } from '@/lib/types';
import { fetchDirectorById } from '@/lib/supabase/directors';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { AdminDirectorFormClient } from '@/components/admin/AdminDirectorFormClient';

export const dynamic = 'force-dynamic';

async function Body({ id }: { id: string }) {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  if (!isAuthenticated || !profile || !isAdminRole(normalizeRole(role))) {
    redirect(`/login?next=/admin/directors/${encodeURIComponent(id)}/edit`);
  }

  const director = await fetchDirectorById(id);
  if (!director) notFound();

  return (
    <div className="page-shell space-y-4 py-5" style={{ maxWidth: 640 }}>
      <div>
        <p className="text-sm m-0 mb-1">
          <Link href="/admin/directors" className="text-tm-blue underline">
            ← แก้ไขข้อมูลผู้อำนวยการ
          </Link>
        </p>
        <h1 className="section-heading">
          แก้ไข · {formatDisplayName(director.name_prefix, director.full_name)}
        </h1>
      </div>
      <AdminDirectorFormClient mode="edit" initial={director} />
    </div>
  );
}

export default async function AdminDirectorEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <Body id={id} />
    </Suspense>
  );
}
