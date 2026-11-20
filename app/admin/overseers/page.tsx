import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/auth/scope';
import {
  isOverseerType1,
  normalizeRole,
  positionDisplayLabel,
} from '@/lib/types';
import { fetchAllUserProfiles } from '@/lib/supabase/profiles';
import { readStoredUsers } from '@/lib/auth/user-store';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { AdminOverseersListClient } from '@/components/admin/AdminOverseersListClient';

export const dynamic = 'force-dynamic';

async function Body() {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  const r = normalizeRole(role);
  if (!isAuthenticated || !profile || !isAdminRole(r)) {
    redirect('/login?next=/admin/overseers');
  }

  const dbProfiles = await fetchAllUserProfiles().catch(() => []);
  const profiles = dbProfiles.length
    ? dbProfiles
    : await readStoredUsers().catch(() => []);

  const overseers = profiles
    .filter((u) => {
      if (u.disabled) return false;
      const r = normalizeRole(u.role);
      if (r === 'covert_overseer') return true;
      return isOverseerType1(u.role, u.overseer_tier);
    })
    .map((u) => {
      const provinces = (u.assigned_provinces ?? [])
        .map((p) => p.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'th'));
      const rawPosition = (u.position ?? '').trim();
      return {
        id: u.id,
        full_name: u.full_name,
        name_prefix: u.name_prefix ?? null,
        position:
          rawPosition ||
          positionDisplayLabel(u.role, u.overseer_tier, u.position) ||
          '',
        avatar_url: u.avatar_url ?? null,
        provinceCount: provinces.length,
        provinces,
      };
    })
    .sort((a, b) => {
      const aChair = a.position === 'ประธานองคมนตรี' ? 0 : 1;
      const bChair = b.position === 'ประธานองคมนตรี' ? 0 : 1;
      if (aChair !== bChair) return aChair - bChair;
      return a.full_name.localeCompare(b.full_name, 'th');
    });

  return (
    <div className="page-shell space-y-4 py-5" style={{ maxWidth: 880 }}>
      <div>
        <h1 className="section-heading">แก้ไขการแสดงผลองคมนตรี</h1>
        <p className="text-slate-500 mt-[-0.5rem]">
          รวมองคมนตรี Type 1 และองคมนตรี (อิสระ) · ปรับชื่อ ตำแหน่ง และรูปโปรไฟล์ที่แสดงในหน้าเกี่ยวกับโครงการ · จังหวัดจัดการที่มอบหมายพื้นที่
        </p>
      </div>
      <AdminOverseersListClient overseers={overseers} />
    </div>
  );
}

export default function AdminOverseersPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={10} />}>
      <Body />
    </Suspense>
  );
}
