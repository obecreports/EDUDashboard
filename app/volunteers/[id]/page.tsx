import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { isFieldRole } from '@/lib/auth/scope';
import { formatPersonLabel, normalizeRole } from '@/lib/types';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { VolunteerDetailClient } from '@/components/volunteers/VolunteerDetailClient';
import { fetchSchools } from '@/lib/supabase/schools';
import { findUserById, readStoredUsers, readContentAccessMapStored } from '@/lib/auth/user-store';
import { canAccess } from '@/lib/auth/content-access';
import {
  filterSchoolsInDomain,
  formatEducationLines,
  formatLastPosition,
  isDirectoryVlRole,
  listVolunteersInDomain,
  resolveOverseerLabel,
  vlTypeLabel,
} from '@/lib/volunteers/directory';
import { fetchVolunteerProfileByUserId } from '@/lib/supabase/volunteer-profiles';
import { formatThaiBirthDateLong } from '@/lib/format/date';

export const dynamic = 'force-dynamic';

async function Body({ id }: { id: string }) {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  const r = normalizeRole(role);
  if (!isAuthenticated || !profile || !isFieldRole(r)) {
    redirect(`/login?next=/volunteers/${id}`);
  }

  const acl = await readContentAccessMapStored();
  const isOwner = profile.id === id;
  if (!isOwner && !canAccess(r, 'volunteers', 'view', acl)) {
    redirect('/home');
  }

  const target = await findUserById(id);
  if (!target || !isDirectoryVlRole(target.role)) notFound();

  if (!isOwner) {
    const [schools, users] = await Promise.all([
      fetchSchools().catch(() => []),
      readStoredUsers().catch(() => []),
    ]);
    const scoped = filterSchoolsInDomain(schools, profile, users);
    const allowed = listVolunteersInDomain(profile, users, scoped);
    if (!allowed.some((u) => u.id === id)) {
      redirect('/volunteers');
    }
  }

  const [users, vl] = await Promise.all([
    readStoredUsers().catch(() => []),
    fetchVolunteerProfileByUserId(id),
  ]);
  const name =
    formatPersonLabel(target.role, target.name_prefix, target.full_name) ||
    target.full_name ||
    target.email;

  return (
    <VolunteerDetailClient
      view={{
        id: target.id,
        name,
        typeLabel: vlTypeLabel(target.role),
        overseerLabel: resolveOverseerLabel(target, users),
        duty: vl?.duty ?? '',
        lastPosition: formatLastPosition(vl ?? {}),
        address: vl?.contact_address ?? '',
        tel: vl?.contact_tel ?? '',
        email: vl?.contact_email ?? target.email ?? '',
        education: formatEducationLines(vl ?? {}),
        birthDate: vl?.birth_date
          ? formatThaiBirthDateLong(vl.birth_date)
          : '—',
        avatarUrl: target.avatar_url ?? null,
        provinces: (target.assigned_provinces ?? []).join(', '),
        isOwner,
      }}
    />
  );
}

export default async function VolunteerDetailPage({
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
