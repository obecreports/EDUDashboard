import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionProfile } from '@/lib/auth/session';
import { isFieldRole } from '@/lib/auth/scope';
import { formatPersonLabel, normalizeRole, PAGE_BANNERS } from '@/lib/types';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { PageBanner } from '@/components/layout/PageBanner';
import { VolunteersListClient } from '@/components/volunteers/VolunteersListClient';
import { fetchSchools } from '@/lib/supabase/schools';
import { readStoredUsers, readContentAccessMapStored } from '@/lib/auth/user-store';
import { canAccess } from '@/lib/auth/content-access';
import {
  filterSchoolsInDomain,
  listVolunteersInDomain,
  resolveOverseerLabel,
  vlTypeLabel,
} from '@/lib/volunteers/directory';

export const dynamic = 'force-dynamic';

async function Body() {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  const r = normalizeRole(role);
  if (!isAuthenticated || !profile || !isFieldRole(r)) {
    redirect('/login?next=/volunteers');
  }

  const acl = await readContentAccessMapStored();
  if (!canAccess(r, 'volunteers', 'view', acl)) {
    redirect('/home');
  }

  const [schools, users] = await Promise.all([
    fetchSchools().catch(() => []),
    readStoredUsers().catch(() => []),
  ]);
  const scoped = filterSchoolsInDomain(schools, profile, users);
  const list = listVolunteersInDomain(profile, users, scoped);

  const rows = list.map((u) => ({
    id: u.id,
    name:
      formatPersonLabel(u.role, u.name_prefix, u.full_name) ||
      u.full_name ||
      u.email,
    typeLabel: vlTypeLabel(u.role),
    overseerLabel: resolveOverseerLabel(u, users),
    provinces: (u.assigned_provinces ?? []).join(', '),
    avatarUrl: u.avatar_url ?? null,
  }));

  return (
    <>
      <PageBanner
        src={PAGE_BANNERS.schools}
        title="อาสาสมัคร"
        subtitle="อาสาสมัครส่วนกลางและประจำพื้นที่ในขอบเขตของคุณ"
      />
      <div className="page-shell py-6 space-y-4">
        <div className="flex justify-end">
          <Link href="/home" className="text-sm font-semibold text-tm-blue">
            ← กลับหน้าของฉัน
          </Link>
        </div>
        <VolunteersListClient rows={rows} />
      </div>
    </>
  );
}

export default function VolunteersPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <Body />
    </Suspense>
  );
}
