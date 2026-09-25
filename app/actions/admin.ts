'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth/session';

export async function saveSiteSettings(formData: FormData) {
  const { profile, isDemo } = await getSessionProfile();
  if (isDemo || profile?.role !== 'admin') {
    return { ok: false, error: 'ต้องเป็น Admin ที่ล็อกอินแล้ว' };
  }
  const supabase = await createClient();
  const rows = [
    { key: 'site_title', value: String(formData.get('site_title') || ''), updated_by: profile.id },
    { key: 'hero_text', value: String(formData.get('hero_text') || ''), updated_by: profile.id },
  ];
  for (const row of rows) {
    const { error } = await supabase.from('site_settings').upsert({
      key: row.key,
      value: row.value,
      updated_by: row.updated_by,
      updated_at: new Date().toISOString(),
    });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath('/admin/settings');
  return { ok: true };
}

export async function updateAccountRole(formData: FormData) {
  const { profile, isDemo } = await getSessionProfile();
  if (isDemo || profile?.role !== 'admin') {
    return { ok: false, error: 'ต้องเป็น Admin ที่ล็อกอินแล้ว' };
  }
  const id = String(formData.get('id'));
  const role = String(formData.get('role'));
  const supabase = await createClient();
  const { error } = await supabase.from('user_profiles').update({ role }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/settings');
  return { ok: true };
}
