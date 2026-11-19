import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { SiteSettingsForm } from '@/components/admin/SiteSettingsForm';
import { getSessionProfile } from '@/lib/auth/session';
import { readHeroSettings } from '@/lib/auth/user-store';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { normalizeRole } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function SettingsBody() {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  if (!isAuthenticated || !profile || normalizeRole(role) !== 'super_admin') {
    redirect('/admin/accounts');
  }

  const initial = await readHeroSettings();

  return (
    <div className="page-shell space-y-8">
      <div>
        <h1 className="section-heading">ตั้งค่าเว็บไซต์</h1>
        <p className="text-slate-500 mt-[-0.5rem]">
          เฉพาะ Super Admin · แก้ไขข้อความและภาพพื้นหลัง Hero
        </p>
      </div>
      <section>
        <h2 className="section-heading text-base">Hero & Site Properties</h2>
        <SiteSettingsForm initial={initial} />
      </section>
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={5} />}>
      <SettingsBody />
    </Suspense>
  );
}
