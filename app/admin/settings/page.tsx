import { Suspense } from 'react';
import { SiteSettingsForm } from '@/components/admin/SiteSettingsForm';
import { readHeroSettings } from '@/lib/auth/user-store';
import { createClient } from '@/lib/supabase/server';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

export const dynamic = 'force-dynamic';

function unwrap(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.replace(/^"|"$/g, '');
  return String(value);
}

async function SettingsBody() {
  const cookieSettings = await readHeroSettings();
  let map: Record<string, unknown> = {};
  try {
    const supabase = await createClient();
    const { data: settings } = await supabase.from('site_settings').select('*');
    (settings ?? []).forEach((s) => {
      map[s.key] = s.value;
    });
  } catch {
    map = {};
  }

  const initial = {
    site_title: unwrap(map.site_title) || cookieSettings.site_title,
    hero_title: unwrap(map.hero_title) || cookieSettings.hero_title,
    hero_subtitle:
      unwrap(map.hero_subtitle) || unwrap(map.hero_text) || cookieSettings.hero_subtitle,
    hero_bg_url: unwrap(map.hero_bg_url) || cookieSettings.hero_bg_url,
  };

  return (
    <div className="page-shell space-y-8">
      <div>
        <h1 className="section-heading">ตั้งค่าเว็บไซต์</h1>
        <p className="text-slate-500 mt-[-0.5rem]">
          แก้ไขข้อความและภาพพื้นหลัง Hero แบบไดนามิก (site_settings)
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
