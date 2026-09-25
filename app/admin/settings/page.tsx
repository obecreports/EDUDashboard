import { createClient } from '@/lib/supabase/server';
import { SiteSettingsForm } from '@/components/admin/SiteSettingsForm';
import { AccountsTable } from '@/components/admin/AccountsTable';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const supabase = await createClient();

  const [{ data: settings }, { data: accounts }] = await Promise.all([
    supabase.from('site_settings').select('*'),
    supabase.from('user_profiles').select('id, email, full_name, position, role, assigned_zone'),
  ]);

  const map: Record<string, unknown> = {};
  (settings ?? []).forEach((s) => {
    map[s.key] = s.value;
  });

  return (
    <div className="page-shell space-y-8">
      <div>
        <h1 className="section-heading">ตั้งค่าเว็บไซต์ & บัญชี</h1>
        <p className="text-slate-500 mt-[-0.5rem]">
          site_settings + user_profiles (Admin)
        </p>
      </div>

      <section>
        <h2 className="section-heading text-base">Website Settings</h2>
        <SiteSettingsForm
          initial={{
            site_title: String(map.site_title ?? 'ConED'),
            hero_text: String(map.hero_text ?? ''),
          }}
        />
      </section>

      <section>
        <h2 className="section-heading text-base">Manage Accounts</h2>
        <AccountsTable rows={accounts ?? []} />
      </section>
    </div>
  );
}
