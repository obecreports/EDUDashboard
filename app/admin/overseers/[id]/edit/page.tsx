import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionProfile } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/auth/scope';
import {
  formatDisplayName,
  isOverseerType1,
  normalizeRole,
  positionDisplayLabel,
} from '@/lib/types';
import { fetchUserProfileById } from '@/lib/supabase/profiles';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { AdminOverseerFormClient } from '@/components/admin/AdminOverseerFormClient';

export const dynamic = 'force-dynamic';

async function Body({ id }: { id: string }) {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  if (!isAuthenticated || !profile || !isAdminRole(normalizeRole(role))) {
    redirect(`/login?next=/admin/overseers/${encodeURIComponent(id)}/edit`);
  }

  const user = await fetchUserProfileById(id);
  const roleOk =
    user &&
    (normalizeRole(user.role) === 'covert_overseer' ||
      isOverseerType1(user.role, user.overseer_tier));
  if (!user || !roleOk) notFound();

  const provinces = (user.assigned_provinces ?? [])
    .map((p) => p.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'th'));

  const rawPosition = (user.position ?? '').trim();

  return (
    <div className="page-shell space-y-4 py-5" style={{ maxWidth: 640 }}>
      <div>
        <p className="text-sm m-0 mb-1">
          <Link href="/admin/overseers" className="text-tm-blue underline">
            ← แก้ไขการแสดงผลองคมนตรี
          </Link>
        </p>
        <h1 className="section-heading">
          แก้ไข · {formatDisplayName(user.name_prefix, user.full_name)}
        </h1>
      </div>
      <AdminOverseerFormClient
        initial={{
          id: user.id,
          name_prefix: user.name_prefix ?? null,
          full_name: user.full_name,
          position:
            rawPosition ||
            positionDisplayLabel(user.role, user.overseer_tier, user.position) ||
            '',
          avatar_url: user.avatar_url ?? null,
          provinces,
        }}
      />
    </div>
  );
}

export default async function AdminOverseerEditPage({
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
